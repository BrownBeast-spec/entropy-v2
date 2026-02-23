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
