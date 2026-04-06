import { describe, expect, it } from "vitest";
import {
  getNormalizedResultId,
  getNormalizedResultLabel,
  getNormalizedResultSource,
  getNormalizedResultType,
} from "../lib/search-result-normalizer.js";

describe("search-result-normalizer", () => {
  it("uses entityType and label from entropy search result shape", () => {
    const result = {
      id: "result_1775480965928_10",
      entityId: "NCT01864096",
      entityType: "trial",
      label: "The Metformin Active Surveillance Trial (MAST) Study",
      source: "ClinicalTrials.gov",
      metadata: {
        nct_id: "NCT01864096",
        title: "The Metformin Active Surveillance Trial (MAST) Study",
      },
    } as const;

    expect(getNormalizedResultId(result)).toBe("NCT01864096");
    expect(getNormalizedResultType(result)).toBe("trial");
    expect(getNormalizedResultLabel(result)).toBe(
      "The Metformin Active Surveillance Trial (MAST) Study",
    );
    expect(getNormalizedResultSource(result)).toBe("ClinicalTrials.gov");
  });

  it("maps aliases and avoids unnamed fallback when metadata title exists", () => {
    const result = {
      id: "result_1",
      entityType: "clinical_trial",
      source: "clinical trials",
      metadata: {
        title: "Pre-operative FOLFOX trial",
      },
    } as const;

    expect(getNormalizedResultType(result)).toBe("trial");
    expect(getNormalizedResultSource(result)).toBe("ClinicalTrials.gov");
    expect(getNormalizedResultLabel(result)).toBe("Pre-operative FOLFOX trial");
  });

  it("falls back to paper and PubMed for invalid type/source", () => {
    const result = {
      id: "x1",
      entityId: "x1",
      entityType: "not-a-real-type",
      source: "not-a-real-source",
      metadata: {},
    } as const;

    expect(getNormalizedResultType(result)).toBe("paper");
    expect(getNormalizedResultSource(result)).toBe("PubMed");
    expect(getNormalizedResultLabel(result)).toBe("x1");
  });

  it("returns Unnamed when no display fields are present", () => {
    const result = {
      entityType: "protein",
      source: "UniProt",
      metadata: {},
    } as const;

    expect(getNormalizedResultLabel(result)).toBe("Unnamed");
  });
});
