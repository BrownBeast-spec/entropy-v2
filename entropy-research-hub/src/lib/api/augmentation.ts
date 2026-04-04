import { buildApiUrl } from "./baseUrl";

export type AugmentRequest = {
  query: string;
  graphSnapshot: {
    nodeIds: string[];
    edgeSummary: Array<{ id?: string; source?: string; target?: string; type?: string }>;
  };
  personaMode: "Researcher" | "Strategist";
  indiaLens: boolean;
  workspaceId: string;
};

export type AugmentResponse = {
  newNodes: Array<Record<string, unknown>>;
  newEdges: Array<Record<string, unknown>>;
  completenessScore: number;
  iterationsRun: number;
  failedSources: string[];
};

export async function augmentWorkspace(
  payload: AugmentRequest,
): Promise<AugmentResponse> {
  const res = await fetch(buildApiUrl("/api/causaly/augment"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: { message: "Unknown API error" } }));
    const message =
      body?.error?.message ?? `Failed to augment workspace: HTTP ${res.status}`;
    throw new Error(message);
  }

  return res.json();
}
