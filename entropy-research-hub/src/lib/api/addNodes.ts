import { buildApiUrl } from "./baseUrl";
import type { SearchResult } from "./search";
import type { GraphEdge, GraphNode } from "@/types/workspace";

export interface AddNodesRequest {
  workspaceId: string;
  queryId: string;
  selectedResults: SearchResult[];
}

export interface AddNodesResponse {
  addedNodes: GraphNode[];
  addedEdges: GraphEdge[];
  duplicatesSkipped: number;
}

export async function addNodesToWorkspace(
  request: AddNodesRequest,
): Promise<AddNodesResponse> {
  const response = await fetch(buildApiUrl("/api/workspace/add-nodes"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to add nodes");
  }

  return response.json();
}
