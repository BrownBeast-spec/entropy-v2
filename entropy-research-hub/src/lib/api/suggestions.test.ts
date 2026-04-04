import { describe, expect, it, vi } from "vitest";
import { fetchFollowupSuggestions } from "./suggestions";

describe("fetchFollowupSuggestions", () => {
  it("returns string suggestions from API response", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue({
        ok: true,
        json: async () => ({ suggestions: ["A", "B", "C"] }),
      } as Response);

    const result = await fetchFollowupSuggestions({
      graphSnapshot: {
        nodeIds: ["N1"],
        edgeSummary: [],
      },
      personaMode: "Researcher",
    });

    expect(result).toEqual(["A", "B", "C"]);
    fetchMock.mockRestore();
  });

  it("throws API message when suggestions request fails", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({ error: { message: "bad request" } }),
      } as Response);

    await expect(
      fetchFollowupSuggestions({
        graphSnapshot: {
          nodeIds: [],
          edgeSummary: [],
        },
        personaMode: "Strategist",
      }),
    ).rejects.toThrow("bad request");

    fetchMock.mockRestore();
  });

  it("filters non-string suggestions from mixed payload", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue({
        ok: true,
        json: async () => ({ suggestions: ["A", 2, null, "B"] }),
      } as Response);

    const result = await fetchFollowupSuggestions({
      graphSnapshot: {
        nodeIds: ["N1", "N2"],
        edgeSummary: [{ id: "E1", source: "N1", target: "N2", type: "association" }],
      },
      personaMode: "Researcher",
    });

    expect(result).toEqual(["A", "B"]);
    fetchMock.mockRestore();
  });
});
