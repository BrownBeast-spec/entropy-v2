import { createOpenAI } from "@ai-sdk/openai";
import type { LanguageModelV3 } from "@ai-sdk/provider";

export interface NvidiaNimConfig {
  apiKey: string;
  baseURL?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

/**
 * Create an OpenAI-compatible provider for NVIDIA NIM.
 * Uses environment variables:
 * - NVIDIA_NIM_API_KEY (required)
 * - NVIDIA_NIM_BASE_URL (default: https://integrate.api.nvidia.com/v1)
 */
export function getNvidiaNimProvider() {
  const apiKey = process.env.NVIDIA_NIM_API_KEY;
  const baseURL =
    process.env.NVIDIA_NIM_BASE_URL || "https://integrate.api.nvidia.com/v1";

  if (!apiKey) {
    throw new Error("NVIDIA_NIM_API_KEY not configured in environment");
  }

  return createOpenAI({
    name: "nvidia-nim",
    apiKey,
    baseURL,
  });
}

/**
 * Create an NVIDIA NIM model with optional configuration.
 * Default model: openai/gpt-oss-120b
 */
export function nvidiaNimModel(
  config?: Partial<NvidiaNimConfig>,
): LanguageModelV3 {
  const provider = getNvidiaNimProvider();
  const modelName =
    config?.model || process.env.NVIDIA_NIM_MODEL || "openai/gpt-oss-120b";

  return provider.chat(modelName);
}

/**
 * Get synthesis agent model with environment-configurable parameters.
 * Environment variables:
 * - SYNTHESIS_AGENT_TEMPERATURE (default: 0.8)
 * - SYNTHESIS_AGENT_MAX_TOKENS (default: 3000)
 */
export function getSynthesisModel(): LanguageModelV3 {
  const temperature = parseFloat(
    process.env.SYNTHESIS_AGENT_TEMPERATURE || "0.8",
  );
  const maxTokens = parseInt(process.env.SYNTHESIS_AGENT_MAX_TOKENS || "3000");

  return nvidiaNimModel({
    model: "openai/gpt-oss-120b",
    temperature,
    maxTokens,
  });
}

/**
 * Get edge constructor agent model with environment-configurable parameters.
 * Environment variables:
 * - EDGE_AGENT_TEMPERATURE (default: 0.4)
 * - EDGE_AGENT_MAX_TOKENS (default: 500)
 */
export function getEdgeConstructorModel(): LanguageModelV3 {
  const temperature = parseFloat(process.env.EDGE_AGENT_TEMPERATURE || "0.4");
  const maxTokens = parseInt(process.env.EDGE_AGENT_MAX_TOKENS || "500");

  return nvidiaNimModel({
    model: "openai/gpt-oss-120b",
    temperature,
    maxTokens,
  });
}
