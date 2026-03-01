import type { LanguageModelV3, LanguageModelV3StreamPart } from "@ai-sdk/provider";
import { google } from "@ai-sdk/google";
import { createOpenAI, openai } from "@ai-sdk/openai";
import { anthropic } from "@ai-sdk/anthropic";
import { createHuggingFace } from "@ai-sdk/huggingface";
import { sessionContext } from "./session-context.js";

const RATE_LIMIT_PATTERNS = [
  /429/,
  /rate.limit/i,
  /resource.exhausted/i,
  /quota/i,
  /too many requests/i,
];

const DEFAULT_MAX_RETRIES = 6;
const DEFAULT_BASE_DELAY_MS = 15_000; // 15s — Gemini free-tier resets per minute

function isRateLimitError(err: unknown): boolean {
  const msg =
    err instanceof Error
      ? `${err.message} ${(err as { cause?: unknown }).cause ?? ""}`
      : String(err);
  return RATE_LIMIT_PATTERNS.some((p) => p.test(msg));
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Wraps a LanguageModelV3 with retry-on-rate-limit logic.
 * On 429 / quota errors, waits with exponential backoff and retries.
 */
function withRateLimitRetry(
  model: LanguageModelV3,
  opts?: { maxRetries?: number; baseDelayMs?: number },
): LanguageModelV3 {
  const maxRetries = opts?.maxRetries ?? DEFAULT_MAX_RETRIES;
  const baseDelay = opts?.baseDelayMs ?? DEFAULT_BASE_DELAY_MS;

  async function retryable<T>(fn: () => PromiseLike<T>): Promise<T> {
    let lastError: unknown;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (err) {
        lastError = err;
        if (!isRateLimitError(err) || attempt === maxRetries) {
          throw err;
        }
        // Exponential backoff: 15s, 30s, 60s, 120s, ...
        const delay = baseDelay * Math.pow(2, attempt);
        const jitter = Math.random() * 2000;
        console.warn(
          `[llm] Rate limit hit (attempt ${attempt + 1}/${maxRetries}), retrying in ${Math.round((delay + jitter) / 1000)}s...`,
        );
        await sleep(delay + jitter);
      }
    }
    throw lastError;
  }

  return {
    specificationVersion: model.specificationVersion,
    provider: model.provider,
    modelId: model.modelId,
    supportedUrls: model.supportedUrls,
    doGenerate(options) {
      return retryable(() => model.doGenerate(options));
    },
    doStream(options) {
      return retryable(() => model.doStream(options));
    },
  };
}

/**
 * Wraps a LanguageModelV3 to intercept AI SDK stream chunks and fire
 * onToolCall / onToolResult hooks from the current sessionContext.
 * This is how we surface tool calls that happen INSIDE agent LLM execution
 * (invisible to workflow-level run.watch() events).
 *
 * Uses a duck-typed runtime cast so it works regardless of which AI SDK
 * version is installed (type names changed between v3/v4).
 */
/**
 * Wraps a LanguageModelV3 to intercept AI SDK stream chunks and fire
 * onToolCall / onToolResult hooks from the current sessionContext.
 *
 * agentId is captured as a closure — each agent's model wrapper knows its
 * own identity at construction time, so parallel agents never clobber each
 * other's label (no shared mutable currentAgentId on the store needed).
 */
function withToolInterception(
  model: LanguageModelV3,
  agentId: string,
): LanguageModelV3 {
  return {
    ...model,
    async doStream(options) {
      const result = await model.doStream(options);
      const ctx = sessionContext.getStore();
      if (!ctx?.onToolCall && !ctx?.onToolResult) {
        return result; // no hooks — return unchanged
      }

      // toolCallId → toolName (for matching results back to calls)
      const toolNames = new Map<string, string>();

      const originalStream = result.stream;
      const intercepted = new ReadableStream<LanguageModelV3StreamPart>({
        async start(controller) {
          const reader = originalStream.getReader();
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              // Always forward the chunk unchanged — never block the real stream
              controller.enqueue(value);

              try {
                // Runtime duck-type: read chunk type robustly across SDK versions
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const c = value as any;
                const type: string = c?.type ?? "";

                // "tool-input-start" / "tool-call-start" — record the name
                // (the full call arrives later as "tool-call")
                if (type === "tool-input-start" || type === "tool-call-start") {
                  const id: string = c.toolCallId ?? c.id ?? "";
                  const name: string = c.toolName ?? c.name ?? "unknown";
                  if (id) toolNames.set(id, name);
                }

                // "tool-input-end" — streaming of args finished, but the
                // complete args aren't guaranteed here. Skip; wait for "tool-call".
                // (No action needed — name already stored above.)

                // "tool-call" — emitted by both old and new SDK with the full,
                // accumulated args. This is the single reliable trigger point.
                if (type === "tool-call") {
                  const id: string = c.toolCallId ?? c.id ?? "";
                  const name: string =
                    toolNames.get(id) ?? c.toolName ?? c.name ?? "unknown";
                  const args: unknown = c.args ?? c.input ?? undefined;
                  ctx.onToolCall?.(agentId, name, args);
                  if (id) toolNames.set(id, name);
                }

                // Tool result — SDK-stable type name
                if (type === "tool-result") {
                  const id: string = c.toolCallId ?? c.id ?? "";
                  const name: string = toolNames.get(id) ?? "unknown";
                  ctx.onToolResult?.(agentId, name, c.result);
                }
              } catch {
                // never let peek errors interrupt the real data stream
              }
            }
          } finally {
            controller.close();
            reader.releaseLock();
          }
        },
      });

      return { ...result, stream: intercepted };
    },
  };
}

export function getModel(modelId?: string): LanguageModelV3 {
  const id = modelId ?? process.env.LLM_MODEL ?? "google:gemini-2.5-flash";
  const [provider, ...rest] = id.split(":");
  const model = rest.join(":");

  const perplexity = createOpenAI({
    name: "perplexity",
    baseURL: "https://api.perplexity.ai",
    apiKey: process.env.PERPLEXITY_API_KEY,
  });

  const huggingface = createHuggingFace({
    apiKey: process.env.HUGGINGFACE_API_KEY,
  });

  const openrouter = createOpenAI({
    name: "openrouter",
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: process.env.OPENROUTER_API_KEY,
  });

  let base: LanguageModelV3;

  switch (provider) {
    case "google":
      base = google(model);
      break;
    case "openai":
      base = openai(model);
      break;
    case "anthropic":
      base = anthropic(model);
      break;
    case "perplexity":
      base = perplexity.chat(model);
      break;
    case "huggingface":
      base = huggingface(model);
      break;
    case "openrouter":
      base = openrouter.chat(model);
      break;
    default:
      throw new Error(
        `Unknown LLM provider: ${provider}. Use google:, openai:, anthropic:, perplexity:, huggingface:, or openrouter:`,
      );
  }

  return withToolInterception(withRateLimitRetry(base), "unknown");
}

/**
 * Get model for a specific agent. Resolution order:
 * 1. Agent-specific env var: e.g., PLANNER_MODEL, BIOLOGIST_MODEL, GAP_ANALYST_MODEL
 * 2. Global default: LLM_MODEL env var
 * 3. Hardcoded fallback: "openrouter:meta-llama/llama-3.1-8b-instruct"
 *
 * Agent ID conversion: "gap-analyst" → "GAP_ANALYST_MODEL", "hawk-safety" → "HAWK_SAFETY_MODEL"
 */
export function getModelForAgent(agentId: string): LanguageModelV3 {
  const envKey = `${agentId.replace(/-/g, "_").toUpperCase()}_MODEL`;
  const agentModelId = process.env[envKey];
  const [provider, ...rest] = (agentModelId ?? process.env.LLM_MODEL ?? "google:gemini-2.5-flash").split(":");
  const model = rest.join(":");

  const perplexity = createOpenAI({
    name: "perplexity",
    baseURL: "https://api.perplexity.ai",
    apiKey: process.env.PERPLEXITY_API_KEY,
  });

  const huggingface = createHuggingFace({
    apiKey: process.env.HUGGINGFACE_API_KEY,
  });

  const openrouter = createOpenAI({
    name: "openrouter",
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: process.env.OPENROUTER_API_KEY,
  });

  let base: LanguageModelV3;

  switch (provider) {
    case "google":
      base = google(model);
      break;
    case "openai":
      base = openai(model);
      break;
    case "anthropic":
      base = anthropic(model);
      break;
    case "perplexity":
      base = perplexity.chat(model);
      break;
    case "huggingface":
      base = huggingface(model);
      break;
    case "openrouter":
      base = openrouter.chat(model);
      break;
    default:
      throw new Error(
        `Unknown LLM provider: ${provider}. Use google:, openai:, anthropic:, perplexity:, huggingface:, or openrouter:`,
      );
  }

  // agentId is captured in the closure — each parallel agent has its own
  // model wrapper and never shares its identity with other agents.
  return withToolInterception(withRateLimitRetry(base), agentId);
}
