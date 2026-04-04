import { GraphEdge, GraphNode, WorkspaceMode } from "@/types/workspace";
import { buildApiUrl } from "./baseUrl";

export type SynthesisSection = {
  title: string;
  content: string;
  citations: Array<{
    id: string;
    nodeId: string;
    source: string;
    label: string;
  }>;
};

export type SynthesisRequest = {
  graphSnapshot: {
    nodes: GraphNode[];
    edges: GraphEdge[];
  };
  personaMode: WorkspaceMode;
  reportSections: string[];
};

export async function generateSynthesis(
  payload: SynthesisRequest,
): Promise<{ sections: SynthesisSection[] }> {
  const res = await fetch(buildApiUrl("/api/causaly/synthesise"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const body = await res
      .json()
      .catch(() => ({ error: { message: "Unknown API error" } }));
    const message =
      body?.error?.message ?? `Failed to generate synthesis: HTTP ${res.status}`;
    throw new Error(message);
  }

  const data = await res.json();
  return {
    sections: Array.isArray(data?.sections) ? data.sections : [],
  };
}
