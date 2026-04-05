import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { addNodesToWorkspace } from "./addNodes";
import type { SearchResult } from "./search";

describe("addNodesToWorkspace", () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should call add-nodes API with selected results", async () => {
    const mockResults: SearchResult[] = [
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
          gapsFilled: [],
        },
      },
    ];

    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({
        addedNodes: [
          {
            id: "ENSG00001",
            label: "AMPK",
            type: "protein",
            source: "STRING",
            metadata: {},
            addedByQuery: "query_123",
          },
        ],
        addedEdges: [],
        duplicatesSkipped: 0,
      }),
    } as Response);

    const result = await addNodesToWorkspace({
      workspaceId: "test-workspace",
      queryId: "query_123",
      selectedResults: mockResults,
    });

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/workspace/add-nodes"),
      expect.objectContaining({
        method: "POST",
      }),
    );

    expect(result.addedNodes).toHaveLength(1);
    expect(result.addedNodes[0].id).toBe("ENSG00001");
  });
});
