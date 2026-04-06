import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { config } from "dotenv";
import { app } from "../index.js";
import { getGraphRepository } from "../lib/graph-repository.js";
import { getNeo4jDriver } from "../lib/neo4j-client.js";

config({ path: "../../.env" });

describe("Workspace mutation routes", () => {
  let workspaceId: string;
  let nodeId: string;
  let edgeId: string;

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

    // Add test edge for edge deletion tests
    const [source, target] = await repo.addNodesToWorkspace(workspaceId, [
      {
        label: "Edge Source",
        type: "compound",
        source: "PubMed",
        metadata: { id: "edge-source" },
        evidenceScore: 0.7,
        indiaRelevant: false,
      },
      {
        label: "Edge Target",
        type: "protein",
        source: "STRING",
        metadata: { id: "edge-target" },
        evidenceScore: 0.8,
        indiaRelevant: false,
      },
    ]);

    const edges = await repo.addEdges(workspaceId, [
      {
        source: source.id,
        target: target.id,
        type: "binding",
        confidence: 0.9,
        metadata: {},
        inferredBy: "LLM",
        reasoning: "test edge for deletion",
      },
    ]);
    edgeId = edges[0].id;
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

  describe("PATCH /api/workspace/:id/nodes/:nodeId", () => {
    it("updates node metadata", async () => {
      // Create a test node
      const repo = getGraphRepository();
      const [node] = await repo.addNodesToWorkspace(workspaceId, [
        {
          label: "Original Label",
          type: "compound",
          source: "PubMed",
          metadata: { id: "update-test-1", description: "original" },
          evidenceScore: 0.5,
          indiaRelevant: false,
        },
      ]);

      const response = await app.request(
        `http://localhost/api/workspace/${workspaceId}/nodes/${node.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            label: "Updated Label",
            evidenceScore: 0.9,
            metadata: { id: "update-test-1", description: "updated" },
          }),
        },
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.label).toBe("Updated Label");
      expect(data.evidenceScore).toBe(0.9);
      expect(data.metadata.description).toBe("updated");

      // Verify in database
      const graph = await repo.getWorkspaceGraph(workspaceId);
      const updatedNode = graph.nodes.find((n) => n.id === node.id);
      expect(updatedNode?.label).toBe("Updated Label");
      expect(updatedNode?.evidenceScore).toBe(0.9);
    });

    it("returns 404 for non-existent node", async () => {
      const response = await app.request(
        `http://localhost/api/workspace/${workspaceId}/nodes/non-existent`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ label: "New Label" }),
        },
      );

      expect(response.status).toBe(404);
    });

    it("validates partial updates", async () => {
      const repo = getGraphRepository();
      const [node] = await repo.addNodesToWorkspace(workspaceId, [
        {
          label: "Partial Update Test",
          type: "gene",
          source: "Open Targets",
          metadata: { id: "partial-1" },
          evidenceScore: 0.6,
          indiaRelevant: false,
        },
      ]);

      // Only update label
      const response = await app.request(
        `http://localhost/api/workspace/${workspaceId}/nodes/${node.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            label: "Only Label Changed",
          }),
        },
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.label).toBe("Only Label Changed");
      expect(data.type).toBe("gene"); // unchanged
      expect(data.evidenceScore).toBe(0.6); // unchanged
    });
  });

  describe("DELETE /api/workspace/:id/edges/:edgeId", () => {
    it("removes edge from workspace graph", async () => {
      // Verify edge exists first
      const graphBefore = await getGraphRepository().getWorkspaceGraph(
        workspaceId,
      );
      expect(graphBefore.edges.some((e) => e.id === edgeId)).toBe(true);

      const response = await app.request(
        `http://localhost/api/workspace/${workspaceId}/edges/${edgeId}`,
        {
          method: "DELETE",
        },
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);

      // Verify edge removed
      const graphAfter = await getGraphRepository().getWorkspaceGraph(
        workspaceId,
      );
      expect(graphAfter.edges.some((e) => e.id === edgeId)).toBe(false);
    });

    it("returns 404 for non-existent edge", async () => {
      const response = await app.request(
        `http://localhost/api/workspace/${workspaceId}/edges/non-existent-edge`,
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
        `http://localhost/api/workspace/non-existent-workspace/edges/${edgeId}`,
        {
          method: "DELETE",
        },
      );

      expect(response.status).toBe(404);
    });

    it("keeps nodes intact when edge is deleted", async () => {
      const repo = getGraphRepository();
      
      // Create new nodes and edge
      const [src, tgt] = await repo.addNodesToWorkspace(workspaceId, [
        {
          label: "Keep Source",
          type: "gene",
          source: "Open Targets",
          metadata: { id: "keep-src" },
          evidenceScore: 0.7,
          indiaRelevant: false,
        },
        {
          label: "Keep Target",
          type: "disease",
          source: "Open Targets",
          metadata: { id: "keep-tgt" },
          evidenceScore: 0.8,
          indiaRelevant: false,
        },
      ]);

      const [edge] = await repo.addEdges(workspaceId, [
        {
          source: src.id,
          target: tgt.id,
          type: "association",
          confidence: 0.75,
          metadata: {},
          inferredBy: "heuristic",
          reasoning: "edge to be removed",
        },
      ]);

      // Delete edge
      const response = await app.request(
        `http://localhost/api/workspace/${workspaceId}/edges/${edge.id}`,
        {
          method: "DELETE",
        },
      );

      expect(response.status).toBe(200);

      // Verify nodes still exist
      const graph = await repo.getWorkspaceGraph(workspaceId);
      expect(graph.nodes.some((n) => n.id === src.id)).toBe(true);
      expect(graph.nodes.some((n) => n.id === tgt.id)).toBe(true);
      expect(graph.edges.some((e) => e.id === edge.id)).toBe(false);
    });
  });
});
