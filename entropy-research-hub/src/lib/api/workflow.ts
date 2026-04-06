export interface SynthesizeWorkflowRequest {
  workspaceId: string;
  queryText: string;
  mode: 'Researcher' | 'Strategist';
  indiaLens: boolean;
  searchTypes: string[];
  reportSections: string[];
  searchResults: unknown[];
  queryId?: string; // Optional: if provided, use existing query
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
  request: SynthesizeWorkflowRequest
): Promise<SynthesisResult> {
  const response = await fetch('/api/workflow/synthesize', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      ...request,
      performSearch: false, // Frontend provides search results
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(
      `Workflow execution failed: ${errorData.error?.message || 'Unknown error'}`
    );
  }

  return response.json();
}
