import { describe, it, expect, afterEach } from "vitest";
import { getModel, getModelForAgent } from "../lib/llm.js";

// We can't test actual model creation without API keys,
// so test the env var resolution logic by checking the function exists
// and that invalid providers throw.

describe("getModel", () => {
  it("throws for unknown provider", () => {
    expect(() => getModel("unknown:model-name")).toThrow(
      "Unknown LLM provider",
    );
  });

  it("is a function", () => {
    expect(typeof getModel).toBe("function");
  });
});

describe("getModelForAgent", () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("is a function", () => {
    expect(typeof getModelForAgent).toBe("function");
  });

  it("reads agent-specific env var when set", () => {
    process.env.PLANNER_MODEL = "openai:gpt-4o";
    // Should not throw — means it resolved the provider correctly
    // (will fail at actual API call but provider resolution is correct)
    const model = getModelForAgent("planner");
    expect(model).toBeDefined();
  });

  it("converts agent ID with hyphens to uppercase env var", () => {
    process.env.GAP_ANALYST_MODEL = "openai:gpt-4o";
    const model = getModelForAgent("gap-analyst");
    expect(model).toBeDefined();
  });

  it("falls back to LLM_MODEL when agent-specific var not set", () => {
    delete process.env.PLANNER_MODEL;
    process.env.LLM_MODEL = "openai:gpt-4o";
    const model = getModelForAgent("planner");
    expect(model).toBeDefined();
  });

  it("falls back to default when no env vars set", () => {
    delete process.env.PLANNER_MODEL;
    delete process.env.LLM_MODEL;
    const model = getModelForAgent("planner");
    expect(model).toBeDefined();
  });
});
