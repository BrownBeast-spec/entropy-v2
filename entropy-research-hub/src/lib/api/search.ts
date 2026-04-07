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

type EntropyApiResult = {
  id?: string;
  type?: string;
  title?: string;
  source?: string;
  metadata?: Record<string, unknown>;
  description?: string;
};

type EntropyApiResponse = {
  results?: EntropyApiResult[];
  errors?: Record<string, string>;
  searchedSources?: string[];
  executionTime?: number;
  sourceDiagnostics?: Record<string, string>;
};

function isFrontendSearchResult(value: unknown): value is SearchResult {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<SearchResult>;
  return (
    typeof candidate.id === "string" &&
    typeof candidate.entityId === "string" &&
    typeof candidate.entityType === "string" &&
    typeof candidate.label === "string" &&
    typeof candidate.source === "string" &&
    candidate.helpfulness !== undefined
  );
}

function normalizeEntityType(type: string | undefined): string {
  switch (type) {
    case "targets":
      return "gene";
    case "trials":
      return "trial";
    case "proteins":
      return "protein";
    case "compounds":
      return "compound";
    case "patents":
      return "patent";
    case "literature":
    case "preprints":
      return "paper";
    default:
      return type ?? "paper";
  }
}

function normalizeSearchResponse(raw: unknown): SearchResponse {
  const payload = (raw ?? {}) as EntropyApiResponse;
  const results = Array.isArray(payload.results)
    ? payload.results.every(isFrontendSearchResult)
      ? (payload.results as SearchResult[])
      : payload.results.map((result, idx): SearchResult => {
          const id = result.id ?? `result_${idx}`;
          const type = normalizeEntityType(result.type);
          const metadata = result.metadata ?? {};

          return {
            id,
            entityId: id,
            entityType: type,
            label: result.title ?? id,
            source: result.source ?? "Unknown",
            metadata,
            helpfulness: {
              score: 50,
              explanation: result.description ?? "Relevant evidence",
              gapsFilled: [],
            },
          };
        })
    : [];

  const searchedSources = Array.from(
    new Set(
      (Array.isArray(payload.searchedSources)
        ? payload.searchedSources
        : results.map((result) => result.source)
      ).filter(Boolean),
    ),
  );

  return {
    results,
    executionTime:
      typeof payload.executionTime === "number" ? payload.executionTime : 0,
    searchedSources,
    sourceDiagnostics: payload.sourceDiagnostics ?? payload.errors,
  };
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

  const payload = await response.json();
  return normalizeSearchResponse(payload);
}
