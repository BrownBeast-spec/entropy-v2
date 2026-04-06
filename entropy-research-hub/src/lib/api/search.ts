import { buildApiUrl } from "./baseUrl";

export interface SearchRequest {
  query: string;
  queryId?: string;
  graphSnapshot: {
    nodeIds: string[];
    nodeTypes?: Record<string, string>;
    existingConcepts?: string[];
    edgeSummary: Array<{
      source: string;
      target: string;
      type: string;
    }>;
  };
  personaMode: "Researcher" | "Strategist";
  indiaLens: boolean;
  workspaceId: string;
  timelineStart?: string;
  timelineEnd?: string;
  maxResults?: number;
}

export interface SearchResult {
  id: string;
  entityId: string;
  entityType: string;
  label: string;
  source: string;
  metadata: Record<string, unknown>;
  helpfulness: {
    score: number;
    explanation: string;
    gapsFilled: string[];
  };
  evidenceScore?: number;
  indiaRelevant?: boolean;
}

export interface SearchResponse {
  results: SearchResult[];
  executionTime: number;
  searchedSources: string[];
  sourceDiagnostics?: Record<string, string>;
}

export async function searchWorkspace(
  request: SearchRequest,
): Promise<SearchResponse> {
  const response = await fetch(buildApiUrl("/api/entropy/search"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Search failed");
  }

  return response.json();
}
