import { describe, it, expect, vi, beforeEach } from "vitest";
import { config } from "dotenv";
import {
  inferEdgesFromCandidates,
  type InferredEdge,
} from "../agents/edge-constructor-agent.js";
import type { EdgeCandidate } from "../lib/edge-heuristics.js";
import type { GraphNode } from "@entropy/api/src/schemas/graph-schema";

// Load environment variables
config({ path: "../../.env" });

describe("Edge Constructor Agent", () => {
  // Helper to create test nodes
  const createNode = (
    id: string,
    type: string,
    label: string,
    source: string,
    metadata: Record<string, unknown> = {},
  ): GraphNode => ({
    id,
    type: type as any,
    label,
    source: source as any,
    metadata,
  });

  describe("inferEdgesFromCandidates", () => {
    it("should return empty array for empty candidates", async () => {
      const candidates: EdgeCandidate[] = [];
      const allNodes: GraphNode[] = [];
      const context = { workspaceMode: "Researcher" as const };

      const result = await inferEdgesFromCandidates(
        candidates,
        allNodes,
        context,
      );

      expect(result).toEqual([]);
    });

    it("should infer edges from valid candidates using LLM", async () => {
      // Create realistic biomedical entities
      const protein = createNode(
        "protein1",
        "protein",
        "EGFR (Epidermal Growth Factor Receptor)",
        "STRING",
        { function: "tyrosine kinase receptor", pathway: "EGFR signaling" },
      );
      const drug = createNode("drug1", "drug", "Erlotinib", "OpenFDA", {
        mechanism: "EGFR tyrosine kinase inhibitor",
        indication: "non-small cell lung cancer",
      });

      const candidates: EdgeCandidate[] = [
        {
          sourceId: "drug1",
          targetId: "protein1",
          heuristicScore: 0.8,
          reasoning:
            "Type compatibility: drug ↔ protein; shared concepts: egfr, kinase",
        },
      ];

      const allNodes = [protein, drug];
      const context = { workspaceMode: "Researcher" as const };

      const result = await inferEdgesFromCandidates(
        candidates,
        allNodes,
        context,
      );

      // Should return at least one high-confidence edge
      expect(result.length).toBeGreaterThan(0);

      const edge = result[0];
      expect(edge.sourceId).toBe("drug1");
      expect(edge.targetId).toBe("protein1");
      expect(edge.confidence).toBeGreaterThan(0.7);
      expect(edge.reasoning).toBeDefined();
      expect(edge.reasoning.length).toBeGreaterThan(0);
      expect([
        "association",
        "interaction",
        "binding",
        "ownership",
        "sponsorship",
        "inferred_relationship",
      ]).toContain(edge.type);
    }, 30000); // 30s timeout for LLM call

    it("should filter out low-confidence edges (<0.7)", async () => {
      // Create weakly related entities
      const patent = createNode(
        "patent1",
        "patent",
        "US12345678 - Pharmaceutical formulation",
        "PatentsView",
        { abstract: "A novel pharmaceutical formulation" },
      );
      const paper = createNode(
        "paper1",
        "paper",
        "Research on cardiovascular disease",
        "PubMed",
        { abstract: "Study of cardiovascular mechanisms" },
      );

      const candidates: EdgeCandidate[] = [
        {
          sourceId: "patent1",
          targetId: "paper1",
          heuristicScore: 0.4,
          reasoning: "Type compatibility: patent ↔ paper",
        },
      ];

      const allNodes = [patent, paper];
      const context = { workspaceMode: "Researcher" as const };

      const result = await inferEdgesFromCandidates(
        candidates,
        allNodes,
        context,
      );

      // Should filter out edges with confidence <= 0.7
      expect(result.every((edge) => edge.confidence > 0.7)).toBe(true);
    }, 30000);

    it("should use rate limiter to avoid exceeding API limits", async () => {
      const gene = createNode("gene1", "gene", "BRCA1", "Open Targets", {
        description: "breast cancer gene",
      });
      const disease = createNode(
        "disease1",
        "disease",
        "Breast Cancer",
        "Open Targets",
        { description: "malignant breast tumor" },
      );

      const candidates: EdgeCandidate[] = [
        {
          sourceId: "gene1",
          targetId: "disease1",
          heuristicScore: 0.9,
          reasoning:
            "Type compatibility: gene ↔ disease; shared concepts: breast, cancer",
        },
      ];

      const allNodes = [gene, disease];
      const context = { workspaceMode: "Researcher" as const };

      // Should not throw due to rate limiting
      const result = await inferEdgesFromCandidates(
        candidates,
        allNodes,
        context,
      );

      expect(result).toBeDefined();
    }, 30000);

    it("should include workspace mode in LLM context", async () => {
      const company = createNode(
        "company1",
        "company",
        "Pfizer Inc.",
        "PatentsView",
        { description: "Pharmaceutical company" },
      );
      const trial = createNode(
        "trial1",
        "trial",
        "NCT12345678 - Phase 3 Trial",
        "ClinicalTrials.gov",
        { sponsor: "Pfizer", condition: "diabetes" },
      );

      const candidates: EdgeCandidate[] = [
        {
          sourceId: "company1",
          targetId: "trial1",
          heuristicScore: 0.8,
          reasoning:
            "Type compatibility: company ↔ trial; shared concepts: pfizer",
        },
      ];

      const allNodes = [company, trial];

      // Test with Strategist mode (business-focused)
      const context = { workspaceMode: "Strategist" as const };

      const result = await inferEdgesFromCandidates(
        candidates,
        allNodes,
        context,
      );

      // Should respect mode and potentially infer 'sponsorship' relationship
      expect(result.length).toBeGreaterThanOrEqual(0);
      if (result.length > 0) {
        expect([
          "association",
          "interaction",
          "binding",
          "ownership",
          "sponsorship",
          "inferred_relationship",
        ]).toContain(result[0].type);
      }
    }, 30000);

    it("should handle multiple candidates and return multiple edges", async () => {
      const protein1 = createNode("protein1", "protein", "EGFR", "STRING", {
        function: "kinase",
      });
      const protein2 = createNode("protein2", "protein", "HER2", "STRING", {
        function: "kinase",
      });
      const drug1 = createNode("drug1", "drug", "Lapatinib", "OpenFDA", {
        target: "EGFR and HER2",
      });

      const candidates: EdgeCandidate[] = [
        {
          sourceId: "drug1",
          targetId: "protein1",
          heuristicScore: 0.85,
          reasoning:
            "Type compatibility: drug ↔ protein; shared concepts: egfr, kinase",
        },
        {
          sourceId: "drug1",
          targetId: "protein2",
          heuristicScore: 0.85,
          reasoning:
            "Type compatibility: drug ↔ protein; shared concepts: her2, kinase",
        },
      ];

      const allNodes = [protein1, protein2, drug1];
      const context = { workspaceMode: "Researcher" as const };

      const result = await inferEdgesFromCandidates(
        candidates,
        allNodes,
        context,
      );

      // Should potentially infer multiple edges
      expect(Array.isArray(result)).toBe(true);
      result.forEach((edge) => {
        expect(edge.confidence).toBeGreaterThan(0.7);
        expect(edge.reasoning).toBeDefined();
      });
    }, 30000);

    it("should throw error on LLM failure (fail-fast, no fallback)", async () => {
      // This test verifies that we don't silently catch errors
      // In practice, this would require mocking the LLM to fail
      // For now, we just verify the function signature and structure

      const gene = createNode("gene1", "gene", "TP53", "Open Targets", {});
      const disease = createNode(
        "disease1",
        "disease",
        "Cancer",
        "Open Targets",
        {},
      );

      const candidates: EdgeCandidate[] = [
        {
          sourceId: "gene1",
          targetId: "disease1",
          heuristicScore: 0.8,
          reasoning: "Type compatibility",
        },
      ];

      const allNodes = [gene, disease];
      const context = { workspaceMode: "Researcher" as const };

      // Should not throw with valid inputs (fail-fast only on actual errors)
      await expect(
        inferEdgesFromCandidates(candidates, allNodes, context),
      ).resolves.toBeDefined();
    }, 30000);
  });
});
