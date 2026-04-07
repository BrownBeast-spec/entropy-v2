import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  loadNADACPricing,
  loadPartDSpending,
  getDrugPricingNADAC,
  getMedicareSpending,
} from "../utils/commercial-loader.js";
import { DataCacheManager } from "@entropy/mcp-shared";

// Mock data fixtures
const mockNadacRecord = {
  ndc: "12345-6789-01",
  ndcDescription: "METFORMIN HYDROCHLORIDE 500 MG TABLET",
  priceLine: "1",
  nadacPerUnit: 0.05,
  pricingUnit: "EA",
  priceStartDate: "2023-01-01",
  currentFlag: "Y",
  firstQuarterYearMcaidRate: "Y",
  classificationForRateSetting: "G",
  correspondingGenericDrugNdc: "12345-6789-01",
  correspondingGenericDrugEffectiveDate: "2023-01-01",
  asOfDate: "2023-12-31",
  pharmacyTypeIndicator: "C",
  otc: "N",
  explanationCode: "1",
  effectiveDate: "2023-01-01",
};

const mockPartDRecord = {
  year: 2022,
  brandName: "Metformin Hcl",
  genericName: "Metformin Hydrochloride",
  totalSpending: 1000000.5,
  totalClaims: 50000,
  totalBeneficiaries: 10000,
  totalUnits: 1500000,
  averageSpendingPerClaim: 20.0,
  averageSpendingPerUnit: 0.66,
};

describe("Commercial Intel Loader", () => {
  let fetchOrCacheSpy: any;

  beforeEach(() => {
    vi.clearAllMocks();
    fetchOrCacheSpy = vi.spyOn(DataCacheManager.prototype, "fetchOrCache");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("loadNADACPricing", () => {
    it("should load pricing data via cache manager", async () => {
      fetchOrCacheSpy.mockResolvedValueOnce({
        data: [mockNadacRecord],
        source: "fetch",
      });

      const result = await loadNADACPricing();
      expect(result).toHaveLength(1);
      expect(result[0].ndcDescription).toContain("METFORMIN");
      expect(fetchOrCacheSpy).toHaveBeenCalledWith(
        expect.stringContaining("nadac-national-average-drug-acquisition-cost"),
        "nadac-pricing.csv",
        expect.any(Function),
      );
    });

    it("should return empty array on failure", async () => {
      fetchOrCacheSpy.mockRejectedValueOnce(new Error("Network error"));

      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
      const result = await loadNADACPricing();

      expect(result).toEqual([]);
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe("getDrugPricingNADAC", () => {
    it("should filter pricing records by drug name", async () => {
      fetchOrCacheSpy.mockResolvedValueOnce({
        data: [
          mockNadacRecord,
          { ...mockNadacRecord, ndcDescription: "HUMIRA PEN 40 MG/0.8 ML" },
        ],
        source: "cache",
      });

      const result = await getDrugPricingNADAC("metformin");
      expect(result).toHaveLength(1);
      expect(result[0].ndcDescription).toBe(
        "METFORMIN HYDROCHLORIDE 500 MG TABLET",
      );
    });

    it("should be case-insensitive in search", async () => {
      fetchOrCacheSpy.mockResolvedValueOnce({
        data: [mockNadacRecord],
        source: "cache",
      });

      const result = await getDrugPricingNADAC("METFORMIN");
      expect(result).toHaveLength(1);
    });
  });

  describe("loadPartDSpending", () => {
    it("should load spending data via cache manager", async () => {
      fetchOrCacheSpy.mockResolvedValueOnce({
        data: [mockPartDRecord],
        source: "fetch",
      });

      const result = await loadPartDSpending();
      expect(result).toHaveLength(1);
      expect(result[0].brandName).toBe("Metformin Hcl");
      expect(fetchOrCacheSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          "data-api/v1/dataset/7e0b4365-fd63-4a29-8f5e-e0ac9f66a81b/data",
        ),
        "part-d-spending.json",
        expect.any(Function),
      );
    });
  });

  describe("getMedicareSpending", () => {
    it("should filter spending records by brand or generic name", async () => {
      fetchOrCacheSpy.mockResolvedValue({
        data: [
          mockPartDRecord,
          {
            ...mockPartDRecord,
            brandName: "Humira",
            genericName: "Adalimumab",
          },
        ],
        source: "cache",
      });

      const result1 = await getMedicareSpending("Metformin");
      expect(result1).toHaveLength(1);
      expect(result1[0].brandName).toBe("Metformin Hcl");

      const result2 = await getMedicareSpending("adalimumab");
      expect(result2).toHaveLength(1);
      expect(result2[0].brandName).toBe("Humira");
    });
  });
});
