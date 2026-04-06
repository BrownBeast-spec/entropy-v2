import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { GraphRepository } from "../lib/graph-repository";
import { getNeo4jSession, closeNeo4jDriver } from "../lib/neo4j-client";

describe("Graph Repository", () => {
  let repo: GraphRepository;
  let testWorkspaceId: string;

  beforeAll(async () => {
    repo = new GraphRepository();
  });

  afterAll(async () => {
    // Clean up test data
    if (testWorkspaceId) {
      const session = getNeo4jSession();
      await session.run("MATCH (w:Workspace {id: $id}) DETACH DELETE w", {
        id: testWorkspaceId,
      });
      await session.close();
    }
    await closeNeo4jDriver();
  });

  describe("Workspace operations", () => {
    it("should create a workspace", async () => {
      const workspace = await repo.createWorkspace({
        name: "Test Workspace",
        description: "Test description",
        mode: "Researcher",
        indiaLens: false,
      });

      expect(workspace.id).toBeDefined();
      expect(workspace.name).toBe("Test Workspace");
      expect(workspace.mode).toBe("Researcher");
      expect(workspace.createdAt).toBeInstanceOf(Date);
      expect(workspace.updatedAt).toBeInstanceOf(Date);

      testWorkspaceId = workspace.id;
    });

    it("should get workspace by id", async () => {
      const workspace = await repo.getWorkspace(testWorkspaceId);

      expect(workspace).toBeDefined();
      expect(workspace?.id).toBe(testWorkspaceId);
      expect(workspace?.name).toBe("Test Workspace");
    });

    it("should return null for non-existent workspace", async () => {
      const workspace = await repo.getWorkspace("non-existent-id");
      expect(workspace).toBeNull();
    });
  });

  describe("Node operations", () => {
    it("should add nodes to workspace", async () => {
      const nodes = await repo.addNodesToWorkspace(testWorkspaceId, [
        {
          label: "Metformin",
          type: "drug",
          source: "PubMed",
          metadata: { cas: "657-24-9" },
        },
        {
          label: "Diabetes Type 2",
          type: "disease",
          source: "Open Targets",
          metadata: { efo: "EFO_0001360" },
        },
      ]);

      expect(nodes).toHaveLength(2);
      expect(nodes[0].id).toBeDefined();
      expect(nodes[0].label).toBe("Metformin");
      expect(nodes[1].label).toBe("Diabetes Type 2");
    });

    it("should link nodes to query when queryId provided", async () => {
      // This will be tested when Query operations are implemented
      // For now, just verify nodes can be added with queryId
      const nodes = await repo.addNodesToWorkspace(
        testWorkspaceId,
        [
          {
            label: "Test Gene",
            type: "gene",
            source: "STRING",
            metadata: { ensembl: "ENSG00000123456" },
          },
        ],
        "test-query-id",
      );

      expect(nodes).toHaveLength(1);
    });
  });

  describe("Edge operations", () => {
    it("should add edges between nodes", async () => {
      // First add some nodes
      const nodes = await repo.addNodesToWorkspace(testWorkspaceId, [
        {
          label: "Drug A",
          type: "drug",
          source: "PubMed",
          metadata: {},
        },
        {
          label: "Protein B",
          type: "protein",
          source: "STRING",
          metadata: {},
        },
      ]);

      const edges = await repo.addEdges(testWorkspaceId, [
        {
          source: nodes[0].id,
          target: nodes[1].id,
          type: "binding",
          confidence: 0.95,
          metadata: {},
          inferredBy: "LLM",
          reasoning: "Strong binding affinity shown in studies",
        },
      ]);

      expect(edges).toHaveLength(1);
      expect(edges[0].id).toBeDefined();
      expect(edges[0].type).toBe("binding");
      expect(edges[0].confidence).toBe(0.95);
    });
  });

  describe("Get workspace graph", () => {
    it("should retrieve all nodes and edges for workspace", async () => {
      const graph = await repo.getWorkspaceGraph(testWorkspaceId);

      expect(graph.nodes.length).toBeGreaterThan(0);
      expect(graph.edges.length).toBeGreaterThan(0);

      // Verify node structure
      const node = graph.nodes[0];
      expect(node.id).toBeDefined();
      expect(node.label).toBeDefined();
      expect(node.type).toBeDefined();

      // Verify edge structure
      const edge = graph.edges[0];
      expect(edge.id).toBeDefined();
      expect(edge.source).toBeDefined();
      expect(edge.target).toBeDefined();
    });
  });
});
