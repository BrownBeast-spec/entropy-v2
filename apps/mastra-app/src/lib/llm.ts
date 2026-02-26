import type { LanguageModelV3 } from "@ai-sdk/provider";
import { google } from "@ai-sdk/google";
import { createOpenAI, openai } from "@ai-sdk/openai";
import { anthropic } from "@ai-sdk/anthropic";

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

export function getModel(modelId?: string): LanguageModelV3 {
  const id = modelId ?? process.env.LLM_MODEL ?? "google:gemini-2.5-flash";
  const [provider, ...rest] = id.split(":");
  const model = rest.join(":");

  const perplexity = createOpenAI({
    name: "perplexity",
    baseURL: "https://api.perplexity.ai",
    apiKey: process.env.PERPLEXITY_API_KEY,
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
    default:
      throw new Error(
        `Unknown LLM provider: ${provider}. Use google:, openai:, anthropic:, or perplexity:`,
      );
  }

  return withRateLimitRetry(base);
}

/**
 * Get model for a specific agent. Resolution order:
 * 1. Agent-specific env var: e.g., PLANNER_MODEL, BIOLOGIST_MODEL, GAP_ANALYST_MODEL
 * 2. Global default: LLM_MODEL env var
 * 3. Hardcoded fallback: "google:gemini-2.5-flash"
 *
 * Agent ID conversion: "gap-analyst" → "GAP_ANALYST_MODEL", "hawk-safety" → "HAWK_SAFETY_MODEL"
 */
export function getModelForAgent(agentId: string): LanguageModelV3 {
  const envKey = `${agentId.replace(/-/g, "_").toUpperCase()}_MODEL`;
  const agentModelId = process.env[envKey];
  return getModel(agentModelId);
}
