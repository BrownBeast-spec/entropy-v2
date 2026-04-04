import { describe, expect, it } from "vitest";
import { getPersonaWeighting } from "./KnowledgeGraphPanel";

describe("KnowledgeGraphPanel persona weighting", () => {
  it("de-emphasizes patent nodes in Researcher mode", () => {
    const weighting = getPersonaWeighting("patent", "Researcher", 50);
    expect(weighting.opacity).toBeLessThan(1);
    expect(weighting.size).toBeLessThan(30);
  });

  it("emphasizes patent nodes in Strategist mode", () => {
    const weighting = getPersonaWeighting("patent", "Strategist", 50);
    expect(weighting.opacity).toBe(1);
    expect(weighting.size).toBe(30);
  });

  it("keeps biological nodes visually weighted in Researcher mode", () => {
    const weighting = getPersonaWeighting("protein", "Researcher", 50);
    expect(weighting.opacity).toBe(1);
    expect(weighting.size).toBe(30);
  });

  it("de-emphasizes biological nodes in Strategist mode", () => {
    const weighting = getPersonaWeighting("protein", "Strategist", 50);
    expect(weighting.opacity).toBeLessThan(1);
    expect(weighting.size).toBeLessThan(30);
  });
});
