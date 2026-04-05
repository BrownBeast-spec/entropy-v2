import { describe, it, expect } from "vitest";
import { scoreHelpfulness } from "../agents/helpfulness-agent.js";

describe("helpfulness-agent", () => {
  describe("duplicate detection", () => {
    it("should return score 0 for entity already in graph", async () => {
      const result = {
        entityId: "ENSG00000123456",
        entityType: "protein",
        label: "AMPK alpha-1",
        source: "STRING",
        metadata: { pathway: "AMPK signaling" },
      };

      const graphSnapshot = {
        nodeIds: ["ENSG00000123456", "ENSG00000789012"],
        nodeTypes: { ENSG00000123456: "protein", ENSG00000789012: "protein" },
        edgeSummary: [],
      };

      const response = await scoreHelpfulness({
        result,
        graphSnapshot,
        queryContext: "metformin targets in NASH",
      });

      expect(response.score).toBe(0);
      expect(response.explanation).toContain("already in graph");
      expect(response.gapsFilled).toEqual([]);
    });
  });

  describe("novelty scoring", () => {
    it("should give bonus points for underrepresented entity type", async () => {
      const result = {
        entityId: "CHEMBL123",
        entityType: "drug",
        label: "Metformin",
        source: "Open Targets",
        metadata: {},
      };

      const graphSnapshot = {
        nodeIds: ["ENSG00001", "ENSG00002", "ENSG00003"],
        nodeTypes: {
          ENSG00001: "protein",
          ENSG00002: "protein",
          ENSG00003: "protein",
        },
        edgeSummary: [],
      };

      const response = await scoreHelpfulness({
        result,
        graphSnapshot,
        queryContext: "metformin targets",
      });

      expect(response.score).toBeGreaterThanOrEqual(20);
      expect(response.explanation).toContain("underrepresented");
    });
  });

  describe("gap analysis", () => {
    it("should score higher for results introducing new concepts", async () => {
      const result = {
        entityId: "ENSG00005",
        entityType: "protein",
        label: "Glucose transporter",
        source: "STRING",
        metadata: {
          pathways: ["glucose uptake", "insulin signaling"],
          mechanisms: ["glucose transport"],
        },
      };

      const graphSnapshot = {
        nodeIds: ["ENSG00001"],
        nodeTypes: { ENSG00001: "protein" },
        edgeSummary: [],
      };

      const response = await scoreHelpfulness({
        result,
        graphSnapshot,
        queryContext: "glucose metabolism",
      });

      expect(response.score).toBeGreaterThanOrEqual(30);
      expect(response.gapsFilled.length).toBeGreaterThan(0);
      expect(response.gapsFilled).toContain("pathway:glucose uptake");
    });
  });

  describe("bootstrap mode", () => {
    it("should score based on query relevance when graph is empty", async () => {
      const result = {
        entityId: "ENSG00005",
        entityType: "protein",
        label: "AMPK",
        source: "STRING",
        metadata: { description: "AMP-activated protein kinase" },
      };

      const graphSnapshot = {
        nodeIds: [],
        nodeTypes: {},
        edgeSummary: [],
      };

      const response = await scoreHelpfulness({
        result,
        graphSnapshot,
        queryContext: "AMPK targets in diabetes",
      });

      expect(response.score).toBeGreaterThan(50);
      expect(response.explanation).toContain("bootstrap");
    });
  });

  describe("error handling", () => {
    it("should handle missing metadata gracefully", async () => {
      const result = {
        entityId: "ENSG00005",
        entityType: "protein",
        label: "Unknown protein",
        source: "STRING",
        metadata: {},
      };

      const graphSnapshot = {
        nodeIds: ["ENSG00001"],
        nodeTypes: { ENSG00001: "protein" },
        edgeSummary: [],
      };

      const response = await scoreHelpfulness({
        result,
        graphSnapshot,
        queryContext: "protein function",
      });

      expect(response.score).toBeGreaterThanOrEqual(0);
      expect(response.explanation).toBeTruthy();
      expect(response.gapsFilled).toEqual([]);
    });

    it("should handle malformed metadata", async () => {
      const result = {
        entityId: "ENSG00005",
        entityType: "protein",
        label: "Test",
        source: "STRING",
        metadata: { pathways: "not-an-array" },
      };

      const graphSnapshot = {
        nodeIds: [],
        nodeTypes: {},
        edgeSummary: [],
      };

      const response = await scoreHelpfulness({
        result,
        graphSnapshot,
        queryContext: "test query",
      });

      expect(response.score).toBeGreaterThanOrEqual(0);
      expect(response.gapsFilled).toEqual([]);
    });
  });
});
