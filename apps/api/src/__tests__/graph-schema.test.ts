import { describe, it, expect } from "vitest";
import {
  NodeTypeSchema,
  DataSourceSchema,
  EdgeTypeSchema,
  GraphNodeSchema,
  GraphEdgeSchema,
  WorkspaceSchema,
  QuerySchema,
} from "../schemas/graph-schema";

describe("Graph Schema Validation", () => {
  describe("NodeTypeSchema", () => {
    it("should accept valid node types", () => {
      expect(() => NodeTypeSchema.parse("disease")).not.toThrow();
      expect(() => NodeTypeSchema.parse("gene")).not.toThrow();
      expect(() => NodeTypeSchema.parse("drug")).not.toThrow();
    });

    it("should reject invalid node types", () => {
      expect(() => NodeTypeSchema.parse("invalid")).toThrow();
    });
  });

  describe("GraphNodeSchema", () => {
    it("should accept valid graph node", () => {
      const validNode = {
        id: "node-123",
        label: "Test Disease",
        type: "disease",
        source: "Open Targets",
        metadata: { severity: "high" },
      };

      const result = GraphNodeSchema.parse(validNode);
      expect(result.id).toBe("node-123");
      expect(result.type).toBe("disease");
    });

    it("should accept optional fields", () => {
      const nodeWithOptionals = {
        id: "node-456",
        label: "Test Gene",
        type: "gene",
        source: "STRING",
        metadata: {},
        evidenceScore: 0.95,
        addedByQuery: "query-123",
        indiaRelevant: true,
      };

      expect(() => GraphNodeSchema.parse(nodeWithOptionals)).not.toThrow();
    });

    it("should reject missing required fields", () => {
      const invalidNode = {
        id: "node-789",
        // missing label
        type: "protein",
      };

      expect(() => GraphNodeSchema.parse(invalidNode)).toThrow();
    });
  });

  describe("GraphEdgeSchema", () => {
    it("should accept valid graph edge", () => {
      const validEdge = {
        id: "edge-123",
        source: "node-1",
        target: "node-2",
        type: "association",
        metadata: {},
      };

      const result = GraphEdgeSchema.parse(validEdge);
      expect(result.source).toBe("node-1");
      expect(result.target).toBe("node-2");
    });

    it("should accept LLM-inferred edge with reasoning", () => {
      const llmEdge = {
        id: "edge-456",
        source: "node-3",
        target: "node-4",
        type: "inferred_relationship",
        confidence: 0.85,
        metadata: {},
        inferredBy: "LLM",
        reasoning: "Both share common pathway mechanisms",
      };

      expect(() => GraphEdgeSchema.parse(llmEdge)).not.toThrow();
    });
  });

  describe("WorkspaceSchema", () => {
    it("should accept valid workspace", () => {
      const validWorkspace = {
        id: "workspace-123",
        name: "Drug Repurposing Project",
        description: "Testing workspace",
        mode: "Researcher",
        indiaLens: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(() => WorkspaceSchema.parse(validWorkspace)).not.toThrow();
    });
  });

  describe("QuerySchema", () => {
    it("should accept valid query", () => {
      const validQuery = {
        id: "query-123",
        workspaceId: "workspace-123",
        text: "Find drugs for treating diabetes",
        mode: "Researcher",
        indiaLens: true,
        submittedAt: new Date(),
        status: "complete",
        completenessScore: 0.78,
        iterations: 3,
      };

      expect(() => QuerySchema.parse(validQuery)).not.toThrow();
    });
  });
});
