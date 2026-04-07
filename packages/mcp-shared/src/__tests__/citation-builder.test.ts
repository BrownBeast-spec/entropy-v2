import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  buildCitation,
  buildMultiSourceCitation,
  mergeCitations,
  flagForVerification,
} from "../utils/citation-builder.js";

describe("CitationBuilder", () => {
  describe("buildCitation", () => {
    it("creates a citation with all required fields", () => {
      const citation = buildCitation(
        "Metformin composition patent",
        "US5,719,165",
        "FDA Orange Book",
        "https://www.accessdata.fda.gov/scripts/cder/ob/results_product.cfm?Appl_No=020357",
        "NDA 020357",
      );

      expect(citation.claim).toBe("Metformin composition patent");
      expect(citation.value).toBe("US5,719,165");
      expect(citation.source.name).toBe("FDA Orange Book");
      expect(citation.source.url).toContain("accessdata.fda.gov");
      expect(citation.source.recordId).toBe("NDA 020357");
      expect(citation.confidence).toBe("verified");
      expect(citation.source.accessedAt).toBeInstanceOf(Date);
    });

    it("defaults to verified confidence", () => {
      const citation = buildCitation(
        "Test claim",
        "Test value",
        "Test Source",
        "https://example.com",
      );

      expect(citation.confidence).toBe("verified");
    });

    it("accepts custom confidence level", () => {
      const citation = buildCitation(
        "Test claim",
        "Test value",
        "Test Source",
        "https://example.com",
        undefined,
        "inferred",
      );

      expect(citation.confidence).toBe("inferred");
    });

    it("converts numeric values to strings", () => {
      const citation = buildCitation(
        "NADAC price",
        0.04,
        "CMS NADAC",
        "https://data.medicaid.gov",
      );

      expect(citation.value).toBe("0.04");
      expect(typeof citation.value).toBe("string");
    });
  });

  describe("buildMultiSourceCitation", () => {
    it("creates citations from multiple sources", () => {
      const citations = buildMultiSourceCitation(
        "Patent expiry date",
        "2021-07-30",
        [
          {
            name: "FDA Orange Book",
            url: "https://fda.gov",
            recordId: "NDA 021748",
          },
          {
            name: "USPTO PatentsView",
            url: "https://uspto.gov",
            recordId: "US6,866,866",
          },
        ],
      );

      expect(citations).toHaveLength(2);
      expect(citations[0].source.name).toBe("FDA Orange Book");
      expect(citations[1].source.name).toBe("USPTO PatentsView");
      expect(citations[0].value).toBe(citations[1].value);
    });
  });

  describe("flagForVerification", () => {
    it("flags a citation and adds reason to claim", () => {
      const original = buildCitation(
        "Patent expiry",
        "2021-07-30",
        "FDA Orange Book",
        "https://fda.gov",
      );

      const flagged = flagForVerification(original, "Date conflict with USPTO");

      expect(flagged.confidence).toBe("flagged");
      expect(flagged.claim).toContain("Date conflict with USPTO");
      expect(flagged.value).toBe(original.value);
    });
  });

  describe("mergeCitations", () => {
    it("returns single citation as primary if only one provided", () => {
      const citation = buildCitation(
        "Test",
        "Value",
        "Source",
        "https://example.com",
      );
      const result = mergeCitations([citation]);

      expect(result.primary).toEqual(citation);
      expect(result.conflicts).toBeUndefined();
    });

    it("returns verified primary if all sources agree", () => {
      const citations = [
        buildCitation("Patent expiry", "2021-07-30", "FDA", "https://fda.gov"),
        buildCitation(
          "Patent expiry",
          "2021-07-30",
          "USPTO",
          "https://uspto.gov",
        ),
      ];

      const result = mergeCitations(citations);

      expect(result.primary.confidence).toBe("verified");
      expect(result.primary.value).toBe("2021-07-30");
      expect(result.conflicts).toBeUndefined();
    });

    it("flags conflicts when sources disagree", () => {
      const citations = [
        buildCitation("Patent expiry", "2021-07-30", "FDA", "https://fda.gov"),
        buildCitation(
          "Patent expiry",
          "2021-08-15",
          "USPTO",
          "https://uspto.gov",
        ),
      ];

      const result = mergeCitations(citations);

      expect(result.primary.confidence).toBe("flagged");
      expect(result.primary.claim).toContain(
        "Verify - source inconsistency detected",
      );
      expect(result.conflicts).toHaveLength(1);
      expect(result.conflicts![0].value).toBe("2021-08-15");
    });

    it("throws error for empty citations array", () => {
      expect(() => mergeCitations([])).toThrow(
        "Cannot merge empty citations array",
      );
    });
  });
});
