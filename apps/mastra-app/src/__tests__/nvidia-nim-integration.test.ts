import { describe, it, expect } from "vitest";
import { config } from "dotenv";
import {
  getNvidiaNimProvider,
  nvidiaNimModel,
} from "../lib/nvidia-nim-provider";

// Load .env file
config({ path: "../../.env" });

describe("NVIDIA NIM Provider Integration", () => {
  it("should successfully create a provider with API key from .env", () => {
    // This will throw if NVIDIA_NIM_API_KEY is not set
    expect(() => getNvidiaNimProvider()).not.toThrow();

    const provider = getNvidiaNimProvider();
    expect(provider).toBeDefined();
    expect(provider.chat).toBeDefined();
  });

  it("should successfully create a model instance", () => {
    const model = nvidiaNimModel();

    expect(model).toBeDefined();
    expect(model.specificationVersion).toBe("v3");
    expect(model.provider).toBe("nvidia-nim.chat");
    expect(model.modelId).toBe("openai/gpt-oss-120b");
  });

  it("should use correct default model from env", () => {
    const model = nvidiaNimModel();

    // Default model should be openai/gpt-oss-120b or from NVIDIA_NIM_MODEL env var
    const expectedModel = process.env.NVIDIA_NIM_MODEL || "openai/gpt-oss-120b";
    expect(model.modelId).toBe(expectedModel);
  });

  it("should allow custom model configuration", () => {
    const customModel = nvidiaNimModel({ model: "custom-model-name" });

    expect(customModel.modelId).toBe("custom-model-name");
  });
});
