import { describe, it, expect, beforeAll, afterEach } from "vitest";
import {
  getNvidiaNimProvider,
  nvidiaNimModel,
  getSynthesisModel,
} from "../lib/nvidia-nim-provider";

describe("Nvidia NIM Provider", () => {
  const originalEnv = process.env.NVIDIA_NIM_API_KEY;

  beforeAll(() => {
    // Ensure NVIDIA_NIM_API_KEY is set in test env
    if (!process.env.NVIDIA_NIM_API_KEY) {
      process.env.NVIDIA_NIM_API_KEY = "test-key";
    }
  });

  afterEach(() => {
    // Restore original env
    if (originalEnv) {
      process.env.NVIDIA_NIM_API_KEY = originalEnv;
    }
  });

  it("should create nvidia NIM provider", () => {
    const provider = getNvidiaNimProvider();
    expect(provider).toBeDefined();
  });

  it("should create model with default config", () => {
    const model = nvidiaNimModel();
    expect(model).toBeDefined();
  });

  it("should create synthesis model with env config", () => {
    process.env.SYNTHESIS_AGENT_TEMPERATURE = "0.9";
    process.env.SYNTHESIS_AGENT_MAX_TOKENS = "4000";

    const model = getSynthesisModel();
    expect(model).toBeDefined();
  });

  it("should throw if API key missing", () => {
    delete process.env.NVIDIA_NIM_API_KEY;

    expect(() => getNvidiaNimProvider()).toThrow(
      "NVIDIA_NIM_API_KEY not configured",
    );
  });
});
