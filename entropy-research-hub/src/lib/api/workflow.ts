import { buildApiUrl } from "./baseUrl";

export interface SynthesizeWorkflowRequest {
  workspaceId: string;
  queryText: string;
  mode: "Researcher" | "Strategist";
  indiaLens: boolean;
  searchTypes: string[];
  reportSections: string[];
  searchResults: unknown[];
  queryId?: string;
}

export interface CitationData {
  source: string;
  label: string;
  nodeId: string;
}

export interface SynthesisSection {
  title: string;
  content: string;
  citations: CitationData[];
}

export interface SynthesisResult {
  queryId: string;
  addedNodesCount: number;
  addedEdgesCount: number;
  synthesis: {
    sections: SynthesisSection[];
  };
}

export async function executeWorkflow(
  request: SynthesizeWorkflowRequest,
): Promise<SynthesisResult> {
  const response = await fetch(buildApiUrl("/api/workflow/synthesize"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      ...request,
      performSearch: false,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(
      `Workflow execution failed: ${errorData.error?.message || "Unknown error"}`,
    );
  }

  return response.json();
}

export interface StrategistGatherRequest {
  workspaceId: string;
  queryText: string;
  context?: Record<string, any>;
}

export interface StrategistGatherResponse {
  workspaceId: string;
  queryText: string;
  resources: unknown[];
  searchedSources: string[];
  executionTime: number;
  sourceDiagnostics?: Record<string, string>;
}

export interface TrustedWebFinding {
  title: string;
  url: string;
  source: string;
  summary: string;
}

export async function gatherStrategistResources(
  request: StrategistGatherRequest,
): Promise<StrategistGatherResponse> {
  const response = await fetch(buildApiUrl("/api/strategist/gather"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(
      errorData.error?.message || "Failed to gather strategist resources",
    );
  }

  return response.json();
}

export interface StrategistStrategyRequest {
  workspaceId: string;
  queryText: string;
  gatheredResources: unknown[];
}

export interface StrategistStrategyResponse {
  workspaceId: string;
  queryText: string;
  markdown: string;
  sections: SynthesisSection[];
  trustedWebFindings?: TrustedWebFinding[];
}

export async function runStrategistStrategy(
  request: StrategistStrategyRequest,
): Promise<StrategistStrategyResponse> {
  const response = await fetch(buildApiUrl("/api/strategist/strategy"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(
      errorData.error?.message || "Failed to run strategist strategy",
    );
  }

  return response.json();
}

export interface StrategistChatRequest {
  workspaceId: string;
  userQuestion: string;
  gatheredResources: unknown[];
  strategyMarkdown?: string;
  trustedWebFindings?: TrustedWebFinding[];
}

export interface StrategistChatResponse {
  answer: string;
  newResources?: any[];
}

export async function chatWithStrategistContext(
  request: StrategistChatRequest,
): Promise<StrategistChatResponse> {
  const response = await fetch(buildApiUrl("/api/strategist/chat"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(
      errorData.error?.message || "Failed to chat with strategist context",
    );
  }

  return response.json();
}
