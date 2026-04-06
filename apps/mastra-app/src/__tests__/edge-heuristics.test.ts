import { describe, it, expect } from "vitest";
import {
  findEdgeCandidates,
  type EdgeCandidate,
} from "../lib/edge-heuristics.js";
import type { GraphNode } from "@entropy/api/src/schemas/graph-schema";

describe("Edge Heuristics", () => {
  // Helper to create test nodes
  const createNode = (
    id: string,
    type: string,
    source: string,
    metadata: Record<string, unknown> = {},
  ): GraphNode => ({
    id,
    type: type as any,
    label: `Test ${type} ${id}`,
    source: source as any,
    metadata,
  });

  describe("findEdgeCandidates", () => {
    it("should find candidates based on type compatibility", () => {
      const newNodes: GraphNode[] = [
        createNode("protein1", "protein", "STRING"),
      ];
      const existingNodes: GraphNode[] = [
        createNode("gene1", "gene", "Open Targets"),
        createNode("company1", "company", "PatentsView"), // Not compatible with protein
      ];

      const candidates = findEdgeCandidates(newNodes, existingNodes);

      // Should find protein-gene pair (compatible) but not protein-company (not compatible)
      expect(candidates.length).toBeGreaterThan(0);
      const proteinGeneCandidate = candidates.find(
        (c) => c.sourceId === "protein1" && c.targetId === "gene1",
      );
      expect(proteinGeneCandidate).toBeDefined();
      expect(proteinGeneCandidate!.heuristicScore).toBeGreaterThanOrEqual(0.4); // Type compatibility score
    });

    it("should boost score for same source", () => {
      const newNodes: GraphNode[] = [
        createNode("protein1", "protein", "STRING"),
      ];
      const existingNodes: GraphNode[] = [
        createNode("protein2", "protein", "STRING"), // Same source
        createNode("protein3", "protein", "Open Targets"), // Different source
      ];

      const candidates = findEdgeCandidates(newNodes, existingNodes);

      const sameSourceCandidate = candidates.find(
        (c) => c.sourceId === "protein1" && c.targetId === "protein2",
      );
      const diffSourceCandidate = candidates.find(
        (c) => c.sourceId === "protein1" && c.targetId === "protein3",
      );

      expect(sameSourceCandidate).toBeDefined();
      expect(diffSourceCandidate).toBeDefined();
      // Same source should have higher score (0.4 type + 0.2 source = 0.6 vs 0.4)
      expect(sameSourceCandidate!.heuristicScore).toBeGreaterThan(
        diffSourceCandidate!.heuristicScore,
      );
    });

    it("should boost score for shared metadata concepts", () => {
      const newNodes: GraphNode[] = [
        createNode("drug1", "drug", "OpenFDA", {
          description: "targets EGFR pathway in cancer cells",
          mechanism: "kinase inhibitor",
        }),
      ];
      const existingNodes: GraphNode[] = [
        createNode("disease1", "disease", "Open Targets", {
          description: "EGFR-driven cancer with pathway mutations",
          category: "oncology",
        }), // Shared concept: "egfr", "pathway", "cancer"
        createNode("disease2", "disease", "Open Targets", {
          description: "cardiovascular disease",
          category: "cardiology",
        }), // No shared concepts
      ];

      const candidates = findEdgeCandidates(newNodes, existingNodes);

      const sharedConceptCandidate = candidates.find(
        (c) => c.sourceId === "drug1" && c.targetId === "disease1",
      );
      const noSharedConceptCandidate = candidates.find(
        (c) => c.sourceId === "drug1" && c.targetId === "disease2",
      );

      expect(sharedConceptCandidate).toBeDefined();
      expect(noSharedConceptCandidate).toBeDefined();
      // Shared concepts should boost score
      expect(sharedConceptCandidate!.heuristicScore).toBeGreaterThan(
        noSharedConceptCandidate!.heuristicScore,
      );
    });

    it("should filter out candidates below threshold (0.3)", () => {
      const newNodes: GraphNode[] = [
        createNode("patent1", "patent", "PatentsView"),
      ];
      const existingNodes: GraphNode[] = [
        createNode("gene1", "gene", "Open Targets"), // Not compatible with patent
      ];

      const candidates = findEdgeCandidates(newNodes, existingNodes);

      // Patent and gene are not type-compatible, score should be 0 or below threshold
      const patentGeneCandidate = candidates.find(
        (c) => c.sourceId === "patent1" && c.targetId === "gene1",
      );
      expect(patentGeneCandidate).toBeUndefined();
    });

    it("should limit candidates to maxCandidates", () => {
      const newNodes: GraphNode[] = [
        createNode("protein1", "protein", "STRING"),
      ];
      // Create 30 compatible existing nodes
      const existingNodes: GraphNode[] = Array.from({ length: 30 }, (_, i) =>
        createNode(`gene${i}`, "gene", "Open Targets"),
      );

      const candidates = findEdgeCandidates(newNodes, existingNodes, 20);

      expect(candidates.length).toBeLessThanOrEqual(20);
    });

    it("should sort candidates by heuristic score (descending)", () => {
      const newNodes: GraphNode[] = [
        createNode("drug1", "drug", "OpenFDA", {
          description: "kinase inhibitor",
        }),
      ];
      const existingNodes: GraphNode[] = [
        createNode("protein1", "protein", "STRING", {
          description: "kinase activity",
        }), // High score: type + shared concept
        createNode("protein2", "protein", "Open Targets"), // Medium score: type only
        createNode("disease1", "disease", "Open Targets"), // Medium score: type only
      ];

      const candidates = findEdgeCandidates(newNodes, existingNodes);

      // Should be sorted by score
      for (let i = 0; i < candidates.length - 1; i++) {
        expect(candidates[i].heuristicScore).toBeGreaterThanOrEqual(
          candidates[i + 1].heuristicScore,
        );
      }
    });

    it("should not create self-edges", () => {
      const newNodes: GraphNode[] = [
        createNode("protein1", "protein", "STRING"),
      ];
      const existingNodes: GraphNode[] = [
        createNode("protein1", "protein", "STRING"), // Same ID as new node
      ];

      const candidates = findEdgeCandidates(newNodes, existingNodes);

      // Should not find any candidates where sourceId === targetId
      const selfEdge = candidates.find((c) => c.sourceId === c.targetId);
      expect(selfEdge).toBeUndefined();
    });

    it("should include reasoning in candidates", () => {
      const newNodes: GraphNode[] = [createNode("drug1", "drug", "OpenFDA")];
      const existingNodes: GraphNode[] = [
        createNode("protein1", "protein", "OpenFDA"), // Same source + type compatible
      ];

      const candidates = findEdgeCandidates(newNodes, existingNodes);

      expect(candidates.length).toBeGreaterThan(0);
      const candidate = candidates[0];
      expect(candidate.reasoning).toBeDefined();
      expect(candidate.reasoning.length).toBeGreaterThan(0);
      // Should mention type compatibility and same source
      expect(candidate.reasoning.toLowerCase()).toContain("type compatibility");
      expect(candidate.reasoning.toLowerCase()).toContain("same source");
    });

    it("should handle empty inputs gracefully", () => {
      const candidates1 = findEdgeCandidates([], []);
      expect(candidates1).toEqual([]);

      const candidates2 = findEdgeCandidates(
        [],
        [createNode("gene1", "gene", "Open Targets")],
      );
      expect(candidates2).toEqual([]);
    });
  });
});
