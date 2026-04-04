import { describe, expect, it, vi } from "vitest";
import { generateSynthesis } from "./synthesis";

describe("generateSynthesis", () => {
  it("returns section list when API succeeds", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({
        sections: [
          {
            title: "Overview",
            content: "Summary",
            citations: [],
          },
        ],
      }),
    } as Response);

    const result = await generateSynthesis({
      graphSnapshot: {
        nodes: [],
        edges: [],
      },
      personaMode: "Researcher",
      reportSections: ["Overview"],
    });

    expect(result.sections).toHaveLength(1);
    expect(result.sections[0].title).toBe("Overview");
    fetchMock.mockRestore();
  });

  it("throws API message when synthesise request fails", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ error: { message: "upstream failed" } }),
    } as Response);

    await expect(
      generateSynthesis({
        graphSnapshot: {
          nodes: [],
          edges: [],
        },
        personaMode: "Strategist",
        reportSections: ["Overview"],
      }),
    ).rejects.toThrow("upstream failed");

    fetchMock.mockRestore();
  });

  it("returns empty sections for malformed successful payload", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({ sections: "bad-shape" }),
    } as Response);

    const result = await generateSynthesis({
      graphSnapshot: {
        nodes: [],
        edges: [],
      },
      personaMode: "Researcher",
      reportSections: ["Overview", "Signals"],
    });

    expect(result.sections).toEqual([]);
    fetchMock.mockRestore();
  });
});
