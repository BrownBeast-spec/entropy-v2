import { GraphNode, GraphEdge, WorkspaceMode } from "@/types/workspace";
import { buildApiUrl } from "./baseUrl";

/**
 * Workspace API Client
 * Provides type-safe access to backend Neo4j workspace operations
 */

export interface CreateWorkspaceRequest {
  name: string;
  description?: string;
  mode?: WorkspaceMode;
  indiaLens?: boolean;
}

export interface CreateWorkspaceResponse {
  success: boolean;
  data: {
    id: string;
    name: string;
    description?: string;
    mode: WorkspaceMode;
    indiaLens: boolean;
    createdAt: string;
    updatedAt?: string;
  };
}

export interface GetWorkspaceResponse {
  success: boolean;
  data: {
    id: string;
    name: string;
    description?: string;
    mode: WorkspaceMode;
    indiaLens: boolean;
    createdAt: string;
    updatedAt?: string;
  };
}

export interface GetWorkspaceGraphResponse {
  success: boolean;
  data: {
    nodes: GraphNode[];
    edges: GraphEdge[];
  };
}

export interface AddNodesRequest {
  nodes: Array<{
    label: string;
    type: string;
    source: string;
    metadata: Record<string, unknown>;
    evidenceScore?: number;
    indiaRelevant?: boolean;
  }>;
  queryId?: string;
  inferEdges?: boolean;
}

export interface AddNodesResponse {
  success: boolean;
  data: {
    addedNodes: GraphNode[];
    inferredEdges: GraphEdge[];
  };
}

function normalizeWrappedResponse<T>(payload: unknown): {
  success: boolean;
  data: T;
} {
  if (
    payload &&
    typeof payload === "object" &&
    "data" in payload &&
    (payload as { data: unknown }).data !== undefined
  ) {
    const wrapped = payload as { success?: boolean; data: T };
    return {
      success: wrapped.success ?? true,
      data: wrapped.data,
    };
  }

  return {
    success: true,
    data: payload as T,
  };
}

/**
 * Creates a new workspace in Neo4j backend
 */
export async function createWorkspace(
  data: CreateWorkspaceRequest
): Promise<CreateWorkspaceResponse> {
  const response = await fetch(buildApiUrl("/api/workspace/create"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorBody = await response
      .json()
      .catch(() => ({ error: { message: "Unknown error" } }));
    const message =
      errorBody?.error?.message ??
      `Failed to create workspace: HTTP ${response.status}`;
    throw new Error(message);
  }

  const payload = await response.json();
  return normalizeWrappedResponse<CreateWorkspaceResponse["data"]>(payload);
}

/**
 * Fetches workspace metadata from Neo4j backend
 */
export async function getWorkspace(
  workspaceId: string
): Promise<GetWorkspaceResponse> {
  const response = await fetch(buildApiUrl(`/api/workspace/${workspaceId}`));

  if (!response.ok) {
    const errorBody = await response
      .json()
      .catch(() => ({ error: { message: "Unknown error" } }));
    const message =
      errorBody?.error?.message ??
      `Failed to fetch workspace: HTTP ${response.status}`;
    throw new Error(message);
  }

  const payload = await response.json();
  return normalizeWrappedResponse<GetWorkspaceResponse["data"]>(payload);
}

/**
 * Fetches complete workspace graph (nodes + edges) from Neo4j backend
 */
export async function getWorkspaceGraph(
  workspaceId: string
): Promise<GetWorkspaceGraphResponse> {
  const response = await fetch(
    buildApiUrl(`/api/workspace/${workspaceId}/graph`)
  );

  if (!response.ok) {
    const errorBody = await response
      .json()
      .catch(() => ({ error: { message: "Unknown error" } }));
    const message =
      errorBody?.error?.message ??
      `Failed to fetch workspace graph: HTTP ${response.status}`;
    throw new Error(message);
  }

  const payload = await response.json();
  return normalizeWrappedResponse<GetWorkspaceGraphResponse["data"]>(payload);
}

/**
 * Adds nodes to workspace with optional edge inference
 * @param workspaceId - Target workspace ID
 * @param data - Nodes to add and edge inference options
 * @returns Added nodes and any inferred edges
 */
export async function addNodesToWorkspace(
  workspaceId: string,
  data: AddNodesRequest
): Promise<AddNodesResponse> {
  const response = await fetch(
    buildApiUrl(`/api/workspace/${workspaceId}/nodes`),
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }
  );

  if (!response.ok) {
    const errorBody = await response
      .json()
      .catch(() => ({ error: { message: "Unknown error" } }));
    const message =
      errorBody?.error?.message ??
      `Failed to add nodes to workspace: HTTP ${response.status}`;
    throw new Error(message);
  }

  const payload = await response.json();
  const wrapped = normalizeWrappedResponse<Record<string, unknown>>(payload);
  const rawData = wrapped.data || {};

  const addedNodes = Array.isArray(rawData.addedNodes)
    ? (rawData.addedNodes as GraphNode[])
    : [];
  const inferredEdges = Array.isArray(rawData.inferredEdges)
    ? (rawData.inferredEdges as GraphEdge[])
    : Array.isArray(rawData.addedEdges)
      ? (rawData.addedEdges as GraphEdge[])
      : [];

  return {
    success: wrapped.success,
    data: {
      addedNodes,
      inferredEdges,
    },
  };
}
