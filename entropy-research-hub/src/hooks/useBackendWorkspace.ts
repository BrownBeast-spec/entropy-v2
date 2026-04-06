import { useState, useEffect, useCallback } from "react";
import {
  createWorkspace as createWorkspaceAPI,
  getWorkspace,
  getWorkspaceGraph,
  addNodesToWorkspace,
  type CreateWorkspaceRequest,
  type AddNodesRequest,
} from "@/lib/api/workspace";
import { GraphNode, GraphEdge, WorkspaceMode } from "@/types/workspace";

/**
 * Backend-integrated workspace state
 * Replaces IndexedDB with Neo4j backend
 */
export interface BackendWorkspace {
  id: string;
  name: string;
  description?: string;
  mode: WorkspaceMode;
  indiaLens: boolean;
  nodes: GraphNode[];
  edges: GraphEdge[];
  loading: boolean;
  error: string | null;
}

/**
 * Custom hook for backend-integrated workspace management
 * Provides CRUD operations against Neo4j backend via REST API
 */
export function useBackendWorkspace(workspaceId: string | null) {
  const [workspace, setWorkspace] = useState<BackendWorkspace | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Load workspace and graph from backend
   */
  const loadWorkspace = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);

    try {
      const [workspaceResponse, graphResponse] = await Promise.all([
        getWorkspace(id),
        getWorkspaceGraph(id),
      ]);

      setWorkspace({
        id: workspaceResponse.data.id,
        name: workspaceResponse.data.name,
        description: workspaceResponse.data.description,
        mode: workspaceResponse.data.mode,
        indiaLens: workspaceResponse.data.indiaLens,
        nodes: graphResponse.data.nodes,
        edges: graphResponse.data.edges,
        loading: false,
        error: null,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to load workspace";
      setError(errorMessage);
      setWorkspace(null);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Create new workspace in backend
   */
  const createWorkspace = useCallback(async (data: CreateWorkspaceRequest) => {
    setLoading(true);
    setError(null);

    try {
      const response = await createWorkspaceAPI(data);
      
      // Load the newly created workspace
      await loadWorkspace(response.data.id);
      
      return response.data.id;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to create workspace";
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [loadWorkspace]);

  /**
   * Add nodes to workspace with optional edge inference
   */
  const addNodes = useCallback(
    async (data: AddNodesRequest) => {
      if (!workspace) {
        throw new Error("No workspace loaded");
      }

      setLoading(true);
      setError(null);

      try {
        const response = await addNodesToWorkspace(workspace.id, data);

        // Update local state with new nodes and edges
        setWorkspace((prev) => {
          if (!prev) return null;

          return {
            ...prev,
            nodes: [...prev.nodes, ...response.data.addedNodes],
            edges: [...prev.edges, ...response.data.inferredEdges],
          };
        });

        return {
          addedNodes: response.data.addedNodes,
          inferredEdges: response.data.inferredEdges,
        };
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to add nodes";
        setError(errorMessage);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [workspace]
  );

  /**
   * Reload workspace graph from backend
   */
  const refresh = useCallback(async () => {
    if (workspace) {
      await loadWorkspace(workspace.id);
    }
  }, [workspace, loadWorkspace]);

  // Auto-load workspace when workspaceId changes
  useEffect(() => {
    if (workspaceId) {
      loadWorkspace(workspaceId);
    } else {
      setWorkspace(null);
    }
  }, [workspaceId, loadWorkspace]);

  return {
    workspace,
    loading,
    error,
    createWorkspace,
    addNodes,
    refresh,
  };
}

/**
 * Feature flag for backend storage
 * Set to true to use Neo4j backend, false for IndexedDB fallback
 */
export const USE_BACKEND_STORAGE = true;
