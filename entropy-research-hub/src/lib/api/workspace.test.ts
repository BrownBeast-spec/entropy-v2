import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  createWorkspace,
  getWorkspace,
  getWorkspaceGraph,
  addNodesToWorkspace,
} from "./workspace";

// Mock fetch globally
global.fetch = vi.fn();

describe("Workspace API Client", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createWorkspace", () => {
    it("should create a workspace successfully", async () => {
      const mockResponse = {
        success: true,
        data: {
          id: "ws-123",
          name: "Test Workspace",
          description: "Testing workspace creation",
          mode: "Researcher" as const,
          indiaLens: false,
          createdAt: "2024-01-01T00:00:00Z",
        },
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await createWorkspace({
        name: "Test Workspace",
        description: "Testing workspace creation",
        mode: "Researcher",
        indiaLens: false,
      });

      expect(result).toEqual(mockResponse);
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/workspace/create",
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
        })
      );
    });

    it("should handle API errors with error message", async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({
          error: {
            code: "VALIDATION_ERROR",
            message: "Workspace name is required",
          },
        }),
      });

      await expect(
        createWorkspace({ name: "" })
      ).rejects.toThrow("Workspace name is required");
    });

    it("should handle network errors gracefully", async () => {
      (global.fetch as any).mockRejectedValueOnce(
        new Error("Network error")
      );

      await expect(
        createWorkspace({ name: "Test" })
      ).rejects.toThrow("Network error");
    });

    it("should normalize raw backend create response", async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: "ws-raw-1",
          name: "Raw Workspace",
          mode: "Researcher",
          indiaLens: false,
          createdAt: "2024-01-01T00:00:00Z",
        }),
      });

      const result = await createWorkspace({ name: "Raw Workspace" });

      expect(result.success).toBe(true);
      expect(result.data.id).toBe("ws-raw-1");
    });
  });

  describe("getWorkspace", () => {
    it("should fetch workspace metadata successfully", async () => {
      const mockResponse = {
        success: true,
        data: {
          id: "ws-123",
          name: "Test Workspace",
          mode: "Researcher" as const,
          indiaLens: true,
          createdAt: "2024-01-01T00:00:00Z",
        },
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await getWorkspace("ws-123");

      expect(result).toEqual(mockResponse);
      expect(global.fetch).toHaveBeenCalledWith("/api/workspace/ws-123");
    });

    it("should handle 404 not found errors", async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({
          error: {
            code: "NOT_FOUND",
            message: "Workspace not found",
          },
        }),
      });

      await expect(getWorkspace("ws-nonexistent")).rejects.toThrow(
        "Workspace not found"
      );
    });

    it("should normalize raw backend workspace response", async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: "ws-raw-meta",
          name: "Raw Meta",
          mode: "Researcher",
          indiaLens: true,
          createdAt: "2024-01-01T00:00:00Z",
        }),
      });

      const result = await getWorkspace("ws-raw-meta");

      expect(result.success).toBe(true);
      expect(result.data.id).toBe("ws-raw-meta");
    });
  });

  describe("getWorkspaceGraph", () => {
    it("should fetch complete graph with nodes and edges", async () => {
      const mockResponse = {
        success: true,
        data: {
          nodes: [
            {
              id: "node-1",
              label: "Metformin",
              type: "drug",
              source: "PubMed",
              metadata: {},
            },
            {
              id: "node-2",
              label: "AMPK",
              type: "protein",
              source: "STRING",
              metadata: {},
            },
          ],
          edges: [
            {
              id: "edge-1",
              source: "node-1",
              target: "node-2",
              type: "association",
              confidence: 0.9,
            },
          ],
        },
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await getWorkspaceGraph("ws-123");

      expect(result.data.nodes).toHaveLength(2);
      expect(result.data.edges).toHaveLength(1);
      expect(result.data.nodes[0].label).toBe("Metformin");
      expect(result.data.edges[0].type).toBe("association");
    });

    it("should handle empty graphs gracefully", async () => {
      const mockResponse = {
        success: true,
        data: {
          nodes: [],
          edges: [],
        },
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await getWorkspaceGraph("ws-empty");

      expect(result.data.nodes).toEqual([]);
      expect(result.data.edges).toEqual([]);
    });

    it("should normalize raw backend graph response", async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          nodes: [
            {
              id: "node-raw-1",
              label: "Raw Node",
              type: "drug",
              source: "PubMed",
              metadata: {},
            },
          ],
          edges: [],
        }),
      });

      const result = await getWorkspaceGraph("ws-raw-graph");

      expect(result.success).toBe(true);
      expect(result.data.nodes).toHaveLength(1);
      expect(result.data.nodes[0].id).toBe("node-raw-1");
    });
  });

  describe("addNodesToWorkspace", () => {
    it("should add nodes with edge inference", async () => {
      const mockResponse = {
        success: true,
        data: {
          addedNodes: [
            {
              id: "node-3",
              label: "Diabetes Type 2",
              type: "disease",
              source: "Open Targets",
              metadata: {},
            },
          ],
          inferredEdges: [
            {
              id: "edge-2",
              source: "node-1",
              target: "node-3",
              type: "inferred_relationship",
              confidence: 0.85,
              inferredBy: "LLM",
            },
          ],
        },
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await addNodesToWorkspace("ws-123", {
        nodes: [
          {
            label: "Diabetes Type 2",
            type: "disease",
            source: "Open Targets",
            metadata: {},
          },
        ],
        inferEdges: true,
      });

      expect(result.data.addedNodes).toHaveLength(1);
      expect(result.data.inferredEdges).toHaveLength(1);
      expect(result.data.inferredEdges[0].inferredBy).toBe("LLM");
    });

    it("should add nodes without edge inference", async () => {
      const mockResponse = {
        success: true,
        data: {
          addedNodes: [
            {
              id: "node-4",
              label: "Clinical Trial NCT123",
              type: "trial",
              source: "ClinicalTrials.gov",
              metadata: {},
            },
          ],
          inferredEdges: [],
        },
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await addNodesToWorkspace("ws-123", {
        nodes: [
          {
            label: "Clinical Trial NCT123",
            type: "trial",
            source: "ClinicalTrials.gov",
            metadata: {},
          },
        ],
        inferEdges: false,
      });

      expect(result.data.addedNodes).toHaveLength(1);
      expect(result.data.inferredEdges).toEqual([]);
    });

    it("should handle validation errors for invalid nodes", async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid node type",
          },
        }),
      });

      await expect(
        addNodesToWorkspace("ws-123", {
          nodes: [
            {
              label: "Invalid",
              type: "invalid_type",
              source: "Unknown",
              metadata: {},
            },
          ],
        })
      ).rejects.toThrow("Invalid node type");
    });

    it("should normalize raw backend add-nodes response with addedEdges", async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          addedNodes: [
            {
              id: "node-raw-2",
              label: "Raw Added Node",
              type: "protein",
              source: "STRING",
              metadata: {},
              addedByQuery: "query-raw",
            },
          ],
          addedEdges: [
            {
              id: "edge-raw-1",
              source: "node-raw-1",
              target: "node-raw-2",
              type: "association",
              confidence: 0.8,
              metadata: {},
            },
          ],
        }),
      });

      const result = await addNodesToWorkspace("ws-123", {
        nodes: [
          {
            label: "Raw Added Node",
            type: "protein",
            source: "STRING",
            metadata: {},
          },
        ],
      });

      expect(result.success).toBe(true);
      expect(result.data.addedNodes).toHaveLength(1);
      expect(result.data.inferredEdges).toHaveLength(1);
      expect(result.data.inferredEdges[0].id).toBe("edge-raw-1");
    });
  });
});
