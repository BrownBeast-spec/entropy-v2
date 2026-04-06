import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useBackendWorkspace } from "./useBackendWorkspace";
import * as workspaceAPI from "@/lib/api/workspace";

// Mock the workspace API
vi.mock("@/lib/api/workspace");

describe("useBackendWorkspace", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should load workspace and graph on mount", async () => {
    const mockWorkspace = {
      success: true,
      data: {
        id: "ws-123",
        name: "Test Workspace",
        mode: "Researcher" as const,
        indiaLens: false,
        createdAt: "2024-01-01T00:00:00Z",
      },
    };

    const mockGraph = {
      success: true,
      data: {
        nodes: [
          {
            id: "node-1",
            label: "Metformin",
            type: "drug" as const,
            source: "PubMed" as const,
            metadata: {},
            addedByQuery: "query-1",
          },
        ],
        edges: [],
      },
    };

    vi.spyOn(workspaceAPI, "getWorkspace").mockResolvedValue(mockWorkspace);
    vi.spyOn(workspaceAPI, "getWorkspaceGraph").mockResolvedValue(mockGraph);

    const { result } = renderHook(() => useBackendWorkspace("ws-123"));

    // Should be loading initially
    expect(result.current.loading).toBe(true);
    expect(result.current.workspace).toBeNull();

    // Wait for load to complete
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.workspace).toEqual({
      id: "ws-123",
      name: "Test Workspace",
      mode: "Researcher",
      indiaLens: false,
      nodes: mockGraph.data.nodes,
      edges: [],
      loading: false,
      error: null,
    });

    expect(workspaceAPI.getWorkspace).toHaveBeenCalledWith("ws-123");
    expect(workspaceAPI.getWorkspaceGraph).toHaveBeenCalledWith("ws-123");
  });

  it("should handle loading errors gracefully", async () => {
    vi.spyOn(workspaceAPI, "getWorkspace").mockRejectedValue(
      new Error("Workspace not found")
    );

    const { result } = renderHook(() => useBackendWorkspace("ws-invalid"));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.workspace).toBeNull();
    expect(result.current.error).toBe("Workspace not found");
  });

  it("should create new workspace and load it", async () => {
    const mockCreateResponse = {
      success: true,
      data: {
        id: "ws-new",
        name: "New Workspace",
        mode: "Strategist" as const,
        indiaLens: true,
        createdAt: "2024-01-01T00:00:00Z",
      },
    };

    const mockGraphResponse = {
      success: true,
      data: {
        nodes: [],
        edges: [],
      },
    };

    vi.spyOn(workspaceAPI, "createWorkspace").mockResolvedValue(mockCreateResponse);
    vi.spyOn(workspaceAPI, "getWorkspace").mockResolvedValue(mockCreateResponse);
    vi.spyOn(workspaceAPI, "getWorkspaceGraph").mockResolvedValue(mockGraphResponse);

    const { result } = renderHook(() => useBackendWorkspace(null));

    // Create workspace
    let workspaceId: string = "";
    await waitFor(async () => {
      workspaceId = await result.current.createWorkspace({
        name: "New Workspace",
        mode: "Strategist",
        indiaLens: true,
      });
    });

    expect(workspaceId).toBe("ws-new");
    expect(workspaceAPI.createWorkspace).toHaveBeenCalled();
    
    // Should have loaded the new workspace
    await waitFor(() => {
      expect(result.current.workspace?.id).toBe("ws-new");
    });
  });

  it("should add nodes with edge inference", async () => {
    const initialWorkspace = {
      success: true,
      data: {
        id: "ws-123",
        name: "Test Workspace",
        mode: "Researcher" as const,
        indiaLens: false,
        createdAt: "2024-01-01T00:00:00Z",
      },
    };

    const initialGraph = {
      success: true,
      data: {
        nodes: [
          {
            id: "node-1",
            label: "Metformin",
            type: "drug" as const,
            source: "PubMed" as const,
            metadata: {},
            addedByQuery: "query-1",
          },
        ],
        edges: [],
      },
    };

    const addNodesResponse = {
      success: true,
      data: {
        addedNodes: [
          {
            id: "node-2",
            label: "AMPK",
            type: "protein" as const,
            source: "STRING" as const,
            metadata: {},
            addedByQuery: "query-2",
          },
        ],
        inferredEdges: [
          {
            id: "edge-1",
            source: "node-1",
            target: "node-2",
            type: "association" as const,
            confidence: 0.9,
            metadata: {},
            inferredBy: "LLM" as const,
          },
        ],
      },
    };

    vi.spyOn(workspaceAPI, "getWorkspace").mockResolvedValue(initialWorkspace);
    vi.spyOn(workspaceAPI, "getWorkspaceGraph").mockResolvedValue(initialGraph);
    vi.spyOn(workspaceAPI, "addNodesToWorkspace").mockResolvedValue(addNodesResponse);

    const { result } = renderHook(() => useBackendWorkspace("ws-123"));

    // Wait for initial load
    await waitFor(() => {
      expect(result.current.workspace).not.toBeNull();
    });

    // Add nodes
    let addResult: any;
    await waitFor(async () => {
      addResult = await result.current.addNodes({
        nodes: [
          {
            label: "AMPK",
            type: "protein",
            source: "STRING",
            metadata: {},
          },
        ],
        inferEdges: true,
      });
    });

    expect(addResult.addedNodes).toHaveLength(1);
    expect(addResult.inferredEdges).toHaveLength(1);

    // Workspace should be updated with new nodes and edges
    expect(result.current.workspace?.nodes).toHaveLength(2);
    expect(result.current.workspace?.edges).toHaveLength(1);
  });

  it("should refresh workspace data from backend", async () => {
    const initialGraph = {
      success: true,
      data: {
        nodes: [],
        edges: [],
      },
    };

    const updatedGraph = {
      success: true,
      data: {
        nodes: [
          {
            id: "node-1",
            label: "New Node",
            type: "drug" as const,
            source: "PubMed" as const,
            metadata: {},
            addedByQuery: "query-1",
          },
        ],
        edges: [],
      },
    };

    const workspaceResponse = {
      success: true,
      data: {
        id: "ws-123",
        name: "Test Workspace",
        mode: "Researcher" as const,
        indiaLens: false,
        createdAt: "2024-01-01T00:00:00Z",
      },
    };

    vi.spyOn(workspaceAPI, "getWorkspace").mockResolvedValue(workspaceResponse);
    vi.spyOn(workspaceAPI, "getWorkspaceGraph")
      .mockResolvedValueOnce(initialGraph)
      .mockResolvedValueOnce(updatedGraph);

    const { result } = renderHook(() => useBackendWorkspace("ws-123"));

    // Wait for initial load
    await waitFor(() => {
      expect(result.current.workspace?.nodes).toHaveLength(0);
    });

    // Refresh
    await waitFor(async () => {
      await result.current.refresh();
    });

    // Should have updated data
    expect(result.current.workspace?.nodes).toHaveLength(1);
    expect(result.current.workspace?.nodes[0].label).toBe("New Node");
  });

  it("should handle null workspaceId", async () => {
    const { result } = renderHook(() => useBackendWorkspace(null));

    expect(result.current.workspace).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });
});
