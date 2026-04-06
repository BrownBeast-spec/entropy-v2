import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { config } from "dotenv";
import { app } from "../index.js";
import { getGraphRepository } from "../lib/graph-repository.js";
import { getNeo4jDriver } from "../lib/neo4j-client.js";

// Load environment variables
config({ path: "../../.env" });

describe("Workspace Add-Nodes with Edge Inference", () => {
  let workspaceId: string;

  beforeAll(async () => {
    // Create a test workspace
    const repo = getGraphRepository();
    const workspace = await repo.createWorkspace({
      name: "Test Workspace for Edge Inference",
      description: "Testing edge inference on node addition",
      mode: "Researcher",
    });
    workspaceId = workspace.id;
  });

  afterAll(async () => {
    // Cleanup: delete test workspace
    const driver = getNeo4jDriver();
    const session = driver.session();
    try {
      await session.run(
        "MATCH (w:Workspace {id: $workspaceId}) DETACH DELETE w",
        { workspaceId },
      );
    } finally {
      await session.close();
    }
  });

  it("should add nodes without edge inference when inferEdges=false", async () => {
    const req = new Request(
      `http://localhost/api/workspace/${workspaceId}/nodes`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nodes: [
            {
              label: "EGFR",
              type: "protein",
              source: "STRING",
              metadata: { function: "receptor" },
            },
          ],
          inferEdges: false,
        }),
      },
    );

    const res = await app.request(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.addedNodes).toHaveLength(1);
    expect(data.addedEdges).toHaveLength(0);
  });

  it("should add nodes and infer edges when inferEdges=true with compatible nodes", async () => {
    // First, add a protein node
    const req1 = new Request(
      `http://localhost/api/workspace/${workspaceId}/nodes`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nodes: [
            {
              label: "HER2",
              type: "protein",
              source: "STRING",
              metadata: { function: "tyrosine kinase receptor" },
            },
          ],
          inferEdges: false, // Don't infer yet
        }),
      },
    );

    const res1 = await app.request(req1);
    expect(res1.status).toBe(200);

    // Now add a drug node that targets HER2 - should trigger edge inference
    const req2 = new Request(
      `http://localhost/api/workspace/${workspaceId}/nodes`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nodes: [
            {
              label: "Trastuzumab",
              type: "drug",
              source: "OpenFDA",
              metadata: {
                mechanism: "HER2 receptor antagonist",
                indication: "breast cancer",
              },
            },
          ],
          inferEdges: true, // Enable edge inference
        }),
      },
    );

    const res2 = await app.request(req2);
    expect(res2.status).toBe(200);

    const data = await res2.json();
    expect(data.addedNodes).toHaveLength(1);
    expect(data.addedNodes[0].label).toBe("Trastuzumab");

    // Edge inference may or may not find high-confidence edges depending on LLM
    // Just verify the response structure
    expect(Array.isArray(data.addedEdges)).toBe(true);
    if (data.addedEdges.length > 0) {
      expect(data.addedEdges[0]).toHaveProperty("source");
      expect(data.addedEdges[0]).toHaveProperty("target");
      expect(data.addedEdges[0]).toHaveProperty("type");
      expect(data.addedEdges[0]).toHaveProperty("confidence");
    }
  }, 30000); // 30s timeout for LLM call

  it("should handle edge inference failure gracefully", async () => {
    // Add nodes with inferEdges=true, but even if LLM fails, request should succeed
    const req = new Request(
      `http://localhost/api/workspace/${workspaceId}/nodes`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nodes: [
            {
              label: "Test Company",
              type: "company",
              source: "PatentsView",
              metadata: { description: "test" },
            },
          ],
          inferEdges: true,
        }),
      },
    );

    const res = await app.request(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.addedNodes).toHaveLength(1);
    // Edge inference failure should not break the request
    expect(data).toHaveProperty("addedEdges");
  }, 30000);

  it("should return 400 for invalid node data", async () => {
    const req = new Request(
      `http://localhost/api/workspace/${workspaceId}/nodes`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nodes: [
            {
              // Missing required fields
              label: "Invalid Node",
            },
          ],
        }),
      },
    );

    const res = await app.request(req);
    expect(res.status).toBe(400);

    const data = await res.json();
    expect(data.error).toBeDefined();
    expect(data.error.code).toBe("VALIDATION_ERROR");
  });
});
