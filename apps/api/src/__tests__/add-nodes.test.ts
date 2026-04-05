import { beforeEach, describe, expect, it, vi } from "vitest";
import { Hono } from "hono";

const { createWorkspaceRoute } = await import("../routes/entropy.js");

describe("POST /api/workspace/add-nodes", () => {
  let app: Hono;

  beforeEach(() => {
    vi.clearAllMocks();
    app = new Hono();
    app.route("/api/workspace", createWorkspaceRoute());
  });

  it("should convert selected results to GraphNode format", async () => {
    const response = await app.request("/api/workspace/add-nodes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        workspaceId: "test-workspace",
        queryId: "query_123",
        selectedResults: [
          {
            id: "result_1",
            entityId: "ENSG00001",
            entityType: "protein",
            label: "AMPK",
            source: "STRING",
            metadata: { pathway: "AMPK signaling" },
            evidenceScore: 0.95,
            indiaRelevant: false,
          },
        ],
      }),
    });

    expect(response.status).toBe(200);
    const data = await response.json();

    expect(data.addedNodes).toHaveLength(1);
    expect(data.addedNodes[0].id).toBe("ENSG00001");
    expect(data.addedNodes[0].label).toBe("AMPK");
    expect(data.addedNodes[0].type).toBe("protein");
    expect(data.addedNodes[0].addedByQuery).toBe("query_123");
    expect(data.addedEdges).toEqual([]);
    expect(data.duplicatesSkipped).toBe(0);
  });

  it("should deduplicate within selected results batch", async () => {
    const response = await app.request("/api/workspace/add-nodes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        workspaceId: "test-workspace",
        queryId: "query_123",
        selectedResults: [
          {
            id: "result_1",
            entityId: "ENSG00001",
            entityType: "protein",
            label: "AMPK",
            source: "STRING",
            metadata: {},
          },
          {
            id: "result_2",
            entityId: "ENSG00001",
            entityType: "protein",
            label: "AMPK",
            source: "Open Targets",
            metadata: {},
          },
        ],
      }),
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.addedNodes).toHaveLength(1);
    expect(data.duplicatesSkipped).toBe(1);
  });
});
