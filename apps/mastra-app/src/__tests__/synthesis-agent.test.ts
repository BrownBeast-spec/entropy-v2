import { describe, expect, it } from "vitest";
import { summariseFromGraph } from "../agents/synthesis-agent.js";

describe("synthesis-agent", () => {
  it("returns requested section titles with citations", async () => {
    const result = await summariseFromGraph({
      graphSnapshot: {
        nodes: [{ id: "ENSG00000141510", label: "TP53" }],
        edges: [],
      },
      personaMode: "Researcher",
      reportSections: ["Overview", "Key Targets and Evidence"],
    });

    expect(result.sections).toHaveLength(2);
    expect(result.sections[0].title).toBe("Overview");
    expect(result.sections[0].citations[0].nodeId).toBe("ENSG00000141510");
  });

  it("uses strategist default title when reportSections are empty", async () => {
    const result = await summariseFromGraph({
      graphSnapshot: {
        nodes: [{ id: "US1234567", label: "Metformin patent" }],
        edges: [],
      },
      personaMode: "Strategist",
      reportSections: [],
    });

    expect(result.sections).toHaveLength(1);
    expect(result.sections[0].title).toBe("Competitive Landscape Overview");
  });

  it("handles empty graph snapshot with safe fallback citation", async () => {
    const result = await summariseFromGraph({
      graphSnapshot: {
        nodes: [],
        edges: [],
      },
      personaMode: "Researcher",
      reportSections: [],
    });

    expect(result.sections).toHaveLength(1);
    expect(result.sections[0].citations[0].nodeId).toBe("unknown-node");
  });
});
