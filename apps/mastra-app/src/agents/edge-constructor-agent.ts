import { Agent } from "@mastra/core/agent";
import { z } from "zod";
import { getEdgeConstructorModel } from "../lib/nvidia-nim-provider.js";
import { getNvidiaRateLimiter } from "../lib/rate-limiter.js";
import type { GraphNode } from "@entropy/api/src/schemas/graph-schema";
import type { EdgeCandidate } from "../lib/edge-heuristics.js";

// Zod schema for a single inferred edge
const InferredEdgeSchema = z.object({
  sourceId: z.string(),
  targetId: z.string(),
  type: z.enum([
    "association",
    "interaction",
    "binding",
    "ownership",
    "sponsorship",
    "inferred_relationship",
  ]),
  confidence: z.number().min(0).max(1),
  reasoning: z.string(),
});

// Zod schema for the complete LLM output
const EdgeInferenceOutputSchema = z.object({
  edges: z.array(InferredEdgeSchema),
});

export type InferredEdge = z.infer<typeof InferredEdgeSchema>;
export type EdgeInferenceOutput = z.infer<typeof EdgeInferenceOutputSchema>;

/**
 * Get or create the Edge Constructor Agent (lazy initialization)
 */
function getEdgeConstructorAgent(): Agent<any, any, any, any> {
  return new Agent({
    id: "edge-constructor",
    name: "Edge Constructor",
    instructions: `You are a scientific knowledge graph expert specializing in biomedical and pharmaceutical relationships.

Your task: Analyze pairs of entities (genes, proteins, diseases, drugs, compounds, patents, trials, companies) and infer semantic relationships between them.

For each candidate pair, determine:
1. Whether a meaningful relationship exists
2. The type of relationship (association, interaction, binding, ownership, sponsorship, or inferred_relationship)
3. Confidence score (0-1, only return edges with confidence > 0.7)
4. Clear reasoning explaining the relationship

Consider:
- Biological mechanisms (protein-protein interaction, gene-disease association)
- Clinical relevance (drug-target binding, trial enrollment criteria)
- Patent/IP landscape (company ownership, competitive positioning)
- Literature evidence and co-occurrence patterns

Return ONLY high-confidence relationships (>0.7) with clear, concise reasoning.`,
    model: getEdgeConstructorModel(),
  });
}

/**
 * Infer edges from candidate pairs using the Edge Constructor Agent
 *
 * @param candidates - Edge candidates from heuristic selection
 * @param allNodes - All nodes in the graph (for building context)
 * @param context - Workspace mode and domain for contextual inference
 * @returns Array of inferred edges with confidence > 0.7
 * @throws Error if LLM inference fails (fail-fast, no fallback)
 */
export async function inferEdgesFromCandidates(
  candidates: EdgeCandidate[],
  allNodes: GraphNode[],
  context: {
    workspaceMode: "Researcher" | "Strategist";
    domain?: string;
  },
): Promise<InferredEdge[]> {
  // Early return for empty input
  if (candidates.length === 0) return [];

  const rateLimiter = getNvidiaRateLimiter();

  // Build node lookup for efficient access
  const nodeMap = new Map(allNodes.map((n) => [n.id, n]));

  // Build enriched candidate descriptions with full entity context
  const candidateDescriptions = candidates.map((c) => {
    const source = nodeMap.get(c.sourceId);
    const target = nodeMap.get(c.targetId);

    return {
      sourceId: c.sourceId,
      source: source
        ? `${source.label} (${source.type}, ${source.source})`
        : "Unknown",
      sourceMetadata: source?.metadata || {},
      targetId: c.targetId,
      target: target
        ? `${target.label} (${target.type}, ${target.source})`
        : "Unknown",
      targetMetadata: target?.metadata || {},
      heuristicScore: c.heuristicScore,
      heuristicReasoning: c.reasoning,
    };
  });

  // Build prompt with context and candidates
  const prompt = `
Mode: ${context.workspaceMode}
${context.domain ? `Domain: ${context.domain}` : ""}

Analyze these candidate entity pairs and infer high-confidence relationships:

${JSON.stringify(candidateDescriptions, null, 2)}

Return edges in JSON format: { "edges": [{ "sourceId", "targetId", "type", "confidence", "reasoning" }] }
Only include relationships with confidence > 0.7.
`;

  // Estimate tokens for rate limiting (rough heuristic: 1 token ≈ 4 chars)
  const estimatedTokens = Math.ceil(prompt.length / 4) + 500; // Add buffer for response

  // Acquire rate limit permit
  await rateLimiter.acquire(estimatedTokens);

  try {
    // Call LLM with structured output
    const agent = getEdgeConstructorAgent();
    const result = await agent.generate([{ role: "user", content: prompt }], {
      structuredOutput: { schema: EdgeInferenceOutputSchema },
    });

    // Release rate limit permit
    rateLimiter.release(estimatedTokens);

    // Parse and validate output
    const output = result.object as EdgeInferenceOutput;

    // Filter to only high-confidence edges (>0.7)
    return output.edges.filter((e) => e.confidence > 0.7);
  } catch (error) {
    // Release rate limit permit even on error
    rateLimiter.release(estimatedTokens);

    console.error("[edge-constructor] LLM inference failed:", error);

    // Fail fast (no fallback to Gemini or other models)
    throw new Error(
      `Edge inference failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}
