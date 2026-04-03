import { describe, expect, it } from "vitest";
import { evaluateCompleteness } from "../agents/completeness-agent.js";

describe("CompletenessAgent", () => {
  it("returns score >= 85 for graph with >= 8 high-confidence nodes", async () => {
    const result = await evaluateCompleteness({
      query: "metformin NASH",
      graphSnapshot: {
        nodeIds: [
          "target-1",
          "target-2",
          "target-3",
          "target-4",
          "target-5",
          "target-6",
          "target-7",
          "target-8",
        ],
        edgeSummary: [],
      },
      personaMode: "Researcher",
    });

    expect(result.score).toBeGreaterThanOrEqual(85);
  });

  it("returns score < 40 and non-empty missingNodes for empty graph", async () => {
    const result = await evaluateCompleteness({
      query: "metformin NASH",
      graphSnapshot: {
        nodeIds: [],
        edgeSummary: [],
      },
      personaMode: "Researcher",
    });

    expect(result.score).toBeLessThan(40);
    expect(result.missingNodes.length).toBeGreaterThan(0);
  });

  it("uses fallback deterministic rule when LLM response is malformed", async () => {
    const result = await evaluateCompleteness(
      {
        query: "metformin NASH",
        graphSnapshot: {
          nodeIds: [
            "target-1",
            "target-2",
            "target-3",
            "target-4",
            "target-5",
            "target-6",
            "target-7",
            "target-8",
          ],
          edgeSummary: [],
        },
        personaMode: "Researcher",
      },
      {
        llmResponse: {
          invalid: true,
        },
      },
    );

    expect(result.score).toBe(90);
    expect(result.missingNodes).toEqual([]);
  });

  it("returns strategist-oriented fallback missing nodes for sparse graph", async () => {
    const result = await evaluateCompleteness({
      query: "metformin competitive landscape",
      graphSnapshot: {
        nodeIds: ["node-1", "node-2"],
        edgeSummary: [],
      },
      personaMode: "Strategist",
    });

    expect(result.score).toBeLessThan(85);
    expect(result.missingNodes).toContain("patent");
  });

  it("passes through a valid llmResponse object unchanged", async () => {
    const result = await evaluateCompleteness(
      {
        query: "metformin NASH",
        graphSnapshot: {
          nodeIds: ["node-1"],
          edgeSummary: [],
        },
        personaMode: "Researcher",
      },
      {
        llmResponse: {
          score: 77,
          missingNodes: ["target", "trial"],
          missingEdges: ["evidence-link"],
        },
      },
    );

    expect(result).toEqual({
      score: 77,
      missingNodes: ["target", "trial"],
      missingEdges: ["evidence-link"],
    });
  });
});
