import type { GraphNode } from "@entropy/api/src/schemas/graph-schema";

export interface EdgeCandidate {
  sourceId: string;
  targetId: string;
  heuristicScore: number;
  reasoning: string;
}

// Type compatibility matrix - defines which node types can have relationships
const TYPE_COMPATIBILITY: Record<string, string[]> = {
  protein: ["protein", "gene", "drug", "compound", "disease"],
  gene: ["protein", "disease", "gene"],
  drug: ["protein", "disease", "compound", "trial"],
  compound: ["protein", "drug", "patent"],
  disease: ["gene", "protein", "drug", "trial"],
  trial: ["drug", "compound", "disease", "company"],
  patent: ["compound", "company"],
  company: ["patent", "trial"],
  paper: ["disease", "gene", "protein", "drug", "compound"],
};

/**
 * Find edge candidates between new nodes and existing nodes using heuristics
 * @param newNodes - Nodes being added to the graph
 * @param existingNodes - Nodes already in the graph
 * @param maxCandidates - Maximum number of candidates to return (default 20)
 * @returns Array of edge candidates sorted by heuristic score (descending)
 */
export function findEdgeCandidates(
  newNodes: GraphNode[],
  existingNodes: GraphNode[],
  maxCandidates = 20,
): EdgeCandidate[] {
  const candidates: EdgeCandidate[] = [];
  const allNodes = [...existingNodes, ...newNodes];

  // Check new nodes against all nodes
  for (const newNode of newNodes) {
    for (const otherNode of allNodes) {
      // Skip self-edges
      if (newNode.id === otherNode.id) continue;

      const score = calculateHeuristicScore(newNode, otherNode);

      // Only include candidates above threshold
      if (score > 0.3) {
        candidates.push({
          sourceId: newNode.id,
          targetId: otherNode.id,
          heuristicScore: score,
          reasoning: generateHeuristicReasoning(newNode, otherNode, score),
        });
      }
    }
  }

  // Sort by score (descending) and take top N
  return candidates
    .sort((a, b) => b.heuristicScore - a.heuristicScore)
    .slice(0, maxCandidates);
}

/**
 * Calculate heuristic score for a potential edge between two nodes
 * Score components:
 * - Type compatibility: 0.4 weight
 * - Same source: 0.2 weight
 * - Shared concepts in metadata: up to 0.4 weight (0.1 per shared concept, max 4)
 */
function calculateHeuristicScore(node1: GraphNode, node2: GraphNode): number {
  let score = 0;

  // Type compatibility (0.4 weight)
  const compatible =
    TYPE_COMPATIBILITY[node1.type]?.includes(node2.type) || false;
  if (compatible) score += 0.4;

  // Same source (0.2 weight)
  if (node1.source === node2.source) score += 0.2;

  // Shared concepts in metadata (0.4 weight max)
  const sharedConcepts = findSharedConcepts(node1.metadata, node2.metadata);
  score += Math.min(sharedConcepts * 0.1, 0.4);

  return Math.min(score, 1.0);
}

/**
 * Find number of shared concepts between two metadata objects
 */
function findSharedConcepts(
  meta1: Record<string, unknown>,
  meta2: Record<string, unknown>,
): number {
  const concepts1 = extractConcepts(meta1);
  const concepts2 = extractConcepts(meta2);

  const shared = concepts1.filter((c) => concepts2.includes(c));
  return shared.length;
}

/**
 * Extract meaningful concepts (words/terms) from metadata
 * - String values: split by whitespace, filter words > 3 chars
 * - Array values: convert to strings
 * - Normalize to lowercase, deduplicate
 */
function extractConcepts(metadata: Record<string, unknown>): string[] {
  const concepts: string[] = [];

  for (const value of Object.values(metadata)) {
    if (typeof value === "string") {
      // Split by whitespace and filter meaningful words (>3 chars)
      concepts.push(
        ...value
          .toLowerCase()
          .split(/\s+/)
          .filter((w) => w.length > 3),
      );
    } else if (Array.isArray(value)) {
      // Convert array elements to strings
      concepts.push(...value.map(String).map((s) => s.toLowerCase()));
    }
  }

  // Deduplicate
  return [...new Set(concepts)];
}

/**
 * Generate human-readable reasoning for why two nodes are candidates for an edge
 */
function generateHeuristicReasoning(
  node1: GraphNode,
  node2: GraphNode,
  score: number,
): string {
  const reasons: string[] = [];

  if (TYPE_COMPATIBILITY[node1.type]?.includes(node2.type)) {
    reasons.push(`Type compatibility: ${node1.type} ↔ ${node2.type}`);
  }

  if (node1.source === node2.source) {
    reasons.push(`Same source: ${node1.source}`);
  }

  const sharedConcepts = findSharedConcepts(node1.metadata, node2.metadata);
  if (sharedConcepts > 0) {
    reasons.push(`${sharedConcepts} shared concept(s)`);
  }

  return reasons.join("; ");
}
