import { WorkspaceMode } from "@/types/workspace";
import { buildApiUrl } from "./baseUrl";

export type SuggestionsRequest = {
  graphSnapshot: {
    nodeIds: string[];
    edgeSummary: Array<{ id?: string; source?: string; target?: string; type?: string }>;
  };
  personaMode: WorkspaceMode;
};

export async function fetchFollowupSuggestions(
  payload: SuggestionsRequest,
): Promise<string[]> {
  const params = new URLSearchParams({
    graphSnapshot: JSON.stringify(payload.graphSnapshot),
    personaMode: payload.personaMode,
  });

  const res = await fetch(
    `${buildApiUrl("/api/causaly/suggestions")}?${params.toString()}`,
  );
  if (!res.ok) {
    const body = await res
      .json()
      .catch(() => ({ error: { message: "Unknown API error" } }));
    const message =
      body?.error?.message ?? `Failed to fetch suggestions: HTTP ${res.status}`;
    throw new Error(message);
  }

  const data = await res.json();
  return Array.isArray(data?.suggestions)
    ? data.suggestions.filter((s: unknown): s is string => typeof s === "string")
    : [];
}
