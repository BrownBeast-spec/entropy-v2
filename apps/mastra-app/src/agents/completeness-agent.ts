export type CompletenessInput = {
  query: string;
  graphSnapshot: {
    nodeIds: string[];
    edgeSummary: Array<Record<string, unknown>>;
  };
  personaMode: "Researcher" | "Strategist";
};

export type CompletenessResult = {
  score: number;
  missingNodes: string[];
  missingEdges: string[];
};

type CompletenessOptions = {
  llmResponse?: unknown;
};

function deterministicFallback(input: CompletenessInput): CompletenessResult {
  if (input.graphSnapshot.nodeIds.length >= 8) {
    return {
      score: 90,
      missingNodes: [],
      missingEdges: [],
    };
  }

  return {
    score: 30,
    missingNodes: [
      input.personaMode === "Strategist" ? "patent" : "target",
      "trial",
    ],
    missingEdges: ["evidence-link"],
  };
}

function isCompletenessResult(value: unknown): value is CompletenessResult {
  if (typeof value !== "object" || value === null) return false;
  const maybe = value as Record<string, unknown>;
  return (
    typeof maybe.score === "number" &&
    Array.isArray(maybe.missingNodes) &&
    Array.isArray(maybe.missingEdges)
  );
}

export async function evaluateCompleteness(
  input: CompletenessInput,
  options?: CompletenessOptions,
): Promise<CompletenessResult> {
  const llmResponse = options?.llmResponse;
  if (llmResponse !== undefined && isCompletenessResult(llmResponse)) {
    return llmResponse;
  }

  return deterministicFallback(input);
}
