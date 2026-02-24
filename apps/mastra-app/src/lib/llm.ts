import type { LanguageModelV3 } from "@ai-sdk/provider";
import { google } from "@ai-sdk/google";
import { openai } from "@ai-sdk/openai";
import { anthropic } from "@ai-sdk/anthropic";

export function getModel(modelId?: string): LanguageModelV3 {
  const id = modelId ?? process.env.LLM_MODEL ?? "google:gemini-2.5-flash";
  const [provider, ...rest] = id.split(":");
  const model = rest.join(":");

  switch (provider) {
    case "google":
      return google(model);
    case "openai":
      return openai(model);
    case "anthropic":
      return anthropic(model);
    default:
      throw new Error(
        `Unknown LLM provider: ${provider}. Use google:, openai:, or anthropic:`,
      );
  }
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
