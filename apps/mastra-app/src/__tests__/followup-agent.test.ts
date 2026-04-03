import { describe, expect, it } from "vitest";
import { suggestFollowups } from "../agents/followup-agent.js";

describe("followup-agent", () => {
  it("returns exactly 3 suggestions in Researcher mode", async () => {
    const result = await suggestFollowups({
      graphSnapshot: {
        nodeIds: ["ENSG00000141510"],
        edgeSummary: [],
      },
      personaMode: "Researcher",
    });

    expect(result.suggestions).toHaveLength(3);
    expect(result.suggestions[0]).toContain("graph nodes: 1");
  });

  it("returns strategist-oriented wording in Strategist mode", async () => {
    const result = await suggestFollowups({
      graphSnapshot: {
        nodeIds: ["US1234567"],
        edgeSummary: [],
      },
      personaMode: "Strategist",
    });

    expect(result.suggestions).toHaveLength(3);
    expect(result.suggestions[0].toLowerCase()).toContain("patent");
  });

  it("omits node-count suffix for empty graph", async () => {
    const result = await suggestFollowups({
      graphSnapshot: {
        nodeIds: [],
        edgeSummary: [],
      },
      personaMode: "Researcher",
    });

    expect(result.suggestions).toHaveLength(3);
    expect(result.suggestions.every((s) => !s.includes("graph nodes"))).toBe(
      true,
    );
  });
});
