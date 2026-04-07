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

  it("normalizes entropy search response shape for notebook consumers", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({
        query: "metformin",
        total_results: 1,
        results: [
          {
            id: "NCT00000009",
            type: "trials",
            title: "Metformin trial",
            description: "Clinical evidence from trial enrollment",
            source: "ClinicalTrials.gov",
            metadata: { nct_id: "NCT00000009" },
          },
        ],
        errors: {
          patents: "Tool unavailable",
        },
      }),
    } as Response);

    const result = await searchWorkspace({
      query: "metformin",
      graphSnapshot: { nodeIds: [], edgeSummary: [] },
      personaMode: "Researcher",
      indiaLens: false,
      workspaceId: "test-workspace",
    });

    expect(result.searchedSources).toEqual(["ClinicalTrials.gov"]);
    expect(result.sourceDiagnostics).toEqual({ patents: "Tool unavailable" });
    expect(result.results).toHaveLength(1);
    expect(result.results[0]).toMatchObject({
      id: "NCT00000009",
      entityId: "NCT00000009",
      entityType: "trial",
      label: "Metformin trial",
      source: "ClinicalTrials.gov",
    });
    expect(result.results[0].helpfulness.score).toBe(50);
  });

  it("normalizes target entity type to backend-compatible gene", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({
        query: "metformin",
        total_results: 1,
        results: [
          {
            id: "ENSG000001",
            type: "targets",
            title: "PRKAA1",
            source: "Open Targets",
            metadata: {},
            description: "AMPK alpha subunit",
          },
        ],
      }),
    } as Response);

    const result = await searchWorkspace({
      query: "metformin",
      graphSnapshot: { nodeIds: [], edgeSummary: [] },
      personaMode: "Researcher",
      indiaLens: false,
      workspaceId: "test-workspace",
    });

    expect(result.results).toHaveLength(1);
    expect(result.results[0].entityType).toBe("gene");
  });
});
