import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { config } from "dotenv";
import { app } from "../index.js";
import { getGraphRepository } from "../lib/graph-repository.js";
import { getNeo4jDriver } from "../lib/neo4j-client.js";

config({ path: "../../.env" });

describe("Workspace mutation routes", () => {
  let workspaceId: string;
  let nodeId: string;

  beforeAll(async () => {
    const repo = getGraphRepository();
    const workspace = await repo.createWorkspace({
      name: "Workspace Mutation Test",
      description: "validates node/edge mutations",
      mode: "Researcher",
      indiaLens: false,
    });
    workspaceId = workspace.id;

    // Add a test node to delete
    const nodes = await repo.addNodesToWorkspace(workspaceId, [
      {
        label: "Test Compound",
        type: "compound",
        source: "Open Targets",
        metadata: { id: "test-compound-1", name: "Aspirin" },
        evidenceScore: 0.8,
        indiaRelevant: false,
      },
    ]);
    nodeId = nodes[0].id;
  });

  afterAll(async () => {
    const driver = getNeo4jDriver();
    const session = driver.session();
    try {
      await session.run(
        "MATCH (w:Workspace {id: $workspaceId}) DETACH DELETE w",
        {
          workspaceId,
        },
      );
    } finally {
      await session.close();
    }
  });

  describe("DELETE /api/workspace/:id/nodes/:nodeId", () => {
    it("removes node from workspace graph", async () => {
      // Verify node exists first
      const graphBefore = await getGraphRepository().getWorkspaceGraph(
        workspaceId,
      );
      expect(graphBefore.nodes.some((n) => n.id === nodeId)).toBe(true);

      const response = await app.request(
        `http://localhost/api/workspace/${workspaceId}/nodes/${nodeId}`,
        {
          method: "DELETE",
        },
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);

      // Verify node removed
      const graphAfter = await getGraphRepository().getWorkspaceGraph(
        workspaceId,
      );
      expect(graphAfter.nodes.some((n) => n.id === nodeId)).toBe(false);
    });

    it("returns 404 for non-existent node", async () => {
      const response = await app.request(
        `http://localhost/api/workspace/${workspaceId}/nodes/non-existent-id`,
        {
          method: "DELETE",
        },
      );

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error.code).toBe("NOT_FOUND");
    });

    it("returns 404 for non-existent workspace", async () => {
      const response = await app.request(
        `http://localhost/api/workspace/non-existent-workspace/nodes/${nodeId}`,
        {
          method: "DELETE",
        },
      );

      expect(response.status).toBe(404);
    });

    it("removes edges connected to deleted node", async () => {
      // Create two nodes with edge
      const repo = getGraphRepository();
      const [source, target] = await repo.addNodesToWorkspace(workspaceId, [
        {
          label: "Source Node",
          type: "compound",
          source: "PubMed",
          metadata: { id: "source-1" },
          evidenceScore: 0.7,
          indiaRelevant: false,
        },
        {
          label: "Target Node",
          type: "protein",
          source: "STRING",
          metadata: { id: "target-1" },
          evidenceScore: 0.9,
          indiaRelevant: false,
        },
      ]);

      await repo.addEdges(workspaceId, [
        {
          source: source.id,
          target: target.id,
          type: "binding",
          confidence: 0.85,
          metadata: {},
          inferredBy: "LLM",
          reasoning: "test edge",
        },
      ]);

      // Verify edge exists
      const graphBefore = await repo.getWorkspaceGraph(workspaceId);
      expect(
        graphBefore.edges.some(
          (e) => e.source === source.id && e.target === target.id,
        ),
      ).toBe(true);

      // Delete source node
      const response = await app.request(
        `http://localhost/api/workspace/${workspaceId}/nodes/${source.id}`,
        {
          method: "DELETE",
        },
      );

      expect(response.status).toBe(200);

      // Verify edge also removed
      const graphAfter = await repo.getWorkspaceGraph(workspaceId);
      expect(
        graphAfter.edges.some(
          (e) => e.source === source.id && e.target === target.id,
        ),
      ).toBe(false);
      expect(graphAfter.nodes.some((n) => n.id === target.id)).toBe(true); // target should still exist
    });
  });
});
