export interface HelpfulnessInput {
  result: {
    entityId: string;
    entityType: string;
    label: string;
    source: string;
    metadata: Record<string, unknown>;
  };
  graphSnapshot: {
    nodeIds: string[];
    nodeTypes: Record<string, string>;
    edgeSummary: Array<{
      source: string;
      target: string;
      type: string;
    }>;
  };
  queryContext: string;
}

export interface HelpfulnessOutput {
  score: number;
  explanation: string;
  gapsFilled: string[];
}

export async function scoreHelpfulness(
  input: HelpfulnessInput,
): Promise<HelpfulnessOutput> {
  const { result, graphSnapshot, queryContext } = input;

  if (graphSnapshot.nodeIds.includes(result.entityId)) {
    return {
      score: 0,
      explanation: `Entity ${result.label} already in graph`,
      gapsFilled: [],
    };
  }

  if (graphSnapshot.nodeIds.length === 0) {
    const relevanceScore = calculateQueryRelevance(result, queryContext);
    return {
      score: relevanceScore,
      explanation: `bootstrap mode: ${relevanceScore > 70 ? "highly" : "moderately"} relevant to query`,
      gapsFilled: [],
    };
  }

  let score = 0;
  const explanations: string[] = [];
  const gapsFilled: string[] = [];

  const typeDistribution = Object.values(graphSnapshot.nodeTypes).reduce(
    (acc, type) => {
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  const resultTypeCount = typeDistribution[result.entityType] || 0;
  const totalNodes = graphSnapshot.nodeIds.length;

  if (totalNodes > 0) {
    const typePercentage = resultTypeCount / totalNodes;
    if (typePercentage < 0.1) {
      score += 20;
      explanations.push(`Adds underrepresented type: ${result.entityType}`);
    }
  }

  const concepts = extractConcepts(result.metadata);
  const existingConcepts = new Set<string>();

  let gapPoints = 0;
  concepts.forEach((concept) => {
    if (!existingConcepts.has(concept)) {
      gapsFilled.push(concept);
      gapPoints += 10;
    }
  });

  score += Math.min(gapPoints, 40);
  if (gapsFilled.length > 0) {
    explanations.push(`Fills gaps: ${gapsFilled.slice(0, 2).join(", ")}`);
  }

  const relevancePoints = Math.floor(
    calculateQueryRelevance(result, queryContext) * 0.2,
  );
  score += relevancePoints;

  return {
    score,
    explanation: explanations.join("; ") || "Novel entity",
    gapsFilled,
  };
}

function calculateQueryRelevance(
  result: HelpfulnessInput["result"],
  query: string,
): number {
  const queryLower = query.toLowerCase();
  const labelLower = result.label.toLowerCase();
  const metadataString = JSON.stringify(result.metadata).toLowerCase();

  let relevance = 0;

  if (labelLower.includes(queryLower) || queryLower.includes(labelLower)) {
    relevance += 60;
  }

  const queryTokens = queryLower.split(/\s+/).filter((token) => token.length > 0);
  const matchCount = queryTokens.filter(
    (token) => labelLower.includes(token) || metadataString.includes(token),
  ).length;
  relevance += Math.min(matchCount * 10, 40);

  return Math.min(relevance, 100);
}

function extractConcepts(metadata: Record<string, unknown>): string[] {
  const concepts: string[] = [];

  if (Array.isArray(metadata.pathways)) {
    metadata.pathways.forEach((pathway) => {
      if (typeof pathway === "string") {
        concepts.push(`pathway:${pathway}`);
      }
    });
  }

  if (Array.isArray(metadata.mechanisms)) {
    metadata.mechanisms.forEach((mechanism) => {
      if (typeof mechanism === "string") {
        concepts.push(`mechanism:${mechanism}`);
      }
    });
  }

  if (Array.isArray(metadata.indications)) {
    metadata.indications.forEach((indication) => {
      if (typeof indication === "string") {
        concepts.push(`indication:${indication}`);
      }
    });
  }

  return concepts;
}
