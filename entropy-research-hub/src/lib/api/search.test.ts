import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { searchWorkspace } from "./search";

describe("searchWorkspace", () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should call search API with correct parameters", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({
        results: [
          {
            id: "result_1",
            entityId: "ENSG00001",
            entityType: "protein",
            label: "AMPK",
            source: "STRING",
            metadata: {},
            helpfulness: {
              score: 85,
              explanation: "Fills gap",
              gapsFilled: ["pathway:AMPK"],
            },
          },
        ],
        executionTime: 123,
        searchedSources: ["STRING"],
      }),
    } as Response);

    const result = await searchWorkspace({
      query: "AMPK targets",
      queryId: "q_1",
      graphSnapshot: { nodeIds: [], edgeSummary: [] },
      personaMode: "Researcher",
      indiaLens: false,
      workspaceId: "test-workspace",
      timelineStart: "2024-01-01",
      timelineEnd: "2024-12-31",
    });

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/entropy/search"),
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: expect.stringContaining("AMPK targets"),
      }),
    );

    const body = JSON.parse(
      (vi.mocked(global.fetch).mock.calls[0][1] as RequestInit).body as string,
    );
    expect(body).toMatchObject({
      queryId: "q_1",
      timelineStart: "2024-01-01",
      timelineEnd: "2024-12-31",
    });

    expect(result.results).toHaveLength(1);
    expect(result.results[0].label).toBe("AMPK");
  });

  it("should handle API errors", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: false,
      json: async () => ({ message: "Server error" }),
    } as Response);

    await expect(
      searchWorkspace({
        query: "test",
        queryId: "q_1",
        graphSnapshot: { nodeIds: [], edgeSummary: [] },
        personaMode: "Researcher",
        indiaLens: false,
        workspaceId: "test",
      }),
    ).rejects.toThrow();
  });
});
