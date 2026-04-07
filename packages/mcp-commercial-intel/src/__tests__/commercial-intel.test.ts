import { describe, it, expect, vi, beforeEach } from "vitest";
import { registerCommercialIntelTools } from "../tools/commercial-intel.js";
import * as loader from "../utils/commercial-loader.js";

vi.mock("../utils/commercial-loader.js", () => ({
  getDrugPricingNADAC: vi.fn(),
  getMedicareSpending: vi.fn(),
}));

describe("Commercial Intel Tools", () => {
  let mockServer: any;
  let toolCallbacks: Record<string, Function>;

  beforeEach(() => {
    vi.clearAllMocks();
    toolCallbacks = {};
    mockServer = {
      tool: vi.fn().mockImplementation((name, desc, schema, callback) => {
        toolCallbacks[name] = callback;
      }),
    };
  });

  describe("registerCommercialIntelTools", () => {
    it("should register all three tools", () => {
      registerCommercialIntelTools(mockServer);

      expect(mockServer.tool).toHaveBeenCalledTimes(3);
      expect(toolCallbacks["get_drug_pricing_nadac"]).toBeDefined();
      expect(toolCallbacks["get_medicare_spending"]).toBeDefined();
      expect(toolCallbacks["analyze_market_position"]).toBeDefined();
    });
  });

  describe("get_drug_pricing_nadac tool", () => {
    it("should return formatted NADAC pricing", async () => {
      registerCommercialIntelTools(mockServer);
      const callback = toolCallbacks["get_drug_pricing_nadac"];

      vi.mocked(loader.getDrugPricingNADAC).mockResolvedValueOnce([
        {
          ndc: "111",
          ndcDescription: "METFORMIN 500",
          pharmacyTypeIndicator: "C",
          pricingUnit: "EA",
          nadacPerUnit: 0.1,
          effectiveDate: "2023-01-01",
        } as any,
      ]);

      const result = await callback({ drugName: "metformin", limit: 10 });
      expect(result.content[0].type).toBe("text");
      
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.total_formulations_found).toBe(1);
      expect(parsed.pricing_data[0].value).toContain("Cost: $0.1000 per unit");
    });

    it("should handle errors", async () => {
      registerCommercialIntelTools(mockServer);
      const callback = toolCallbacks["get_drug_pricing_nadac"];

      vi.mocked(loader.getDrugPricingNADAC).mockRejectedValueOnce(new Error("API Down"));

      const result = await callback({ drugName: "metformin", limit: 10 });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.error).toBe("API Down");
    });
  });

  describe("get_medicare_spending tool", () => {
    it("should return formatted spending data", async () => {
      registerCommercialIntelTools(mockServer);
      const callback = toolCallbacks["get_medicare_spending"];

      vi.mocked(loader.getMedicareSpending).mockResolvedValueOnce([
        {
          year: 2022,
          brandName: "Metformin",
          genericName: "Metformin",
          totalSpending: 1000000,
          totalBeneficiaries: 50000,
          averageSpendingPerClaim: 20,
        } as any,
      ]);

      const result = await callback({ drugName: "metformin", limit: 10 });
      const parsed = JSON.parse(result.content[0].text);
      
      expect(parsed.total_records_found).toBe(1);
      expect(parsed.spending_data[0].value).toContain("Total Medicare Part D Spending: $1,000,000");
    });
  });

  describe("analyze_market_position tool", () => {
    it("should synthesize pricing and spending", async () => {
      registerCommercialIntelTools(mockServer);
      const callback = toolCallbacks["analyze_market_position"];

      vi.mocked(loader.getDrugPricingNADAC).mockResolvedValueOnce([
        { ndcDescription: "DRUG A", nadacPerUnit: 10 } as any,
        { ndcDescription: "DRUG B", nadacPerUnit: 20 } as any,
      ]);

      vi.mocked(loader.getMedicareSpending).mockResolvedValueOnce([
        { totalSpending: 500000, totalBeneficiaries: 1000 } as any,
        { totalSpending: 500000, totalBeneficiaries: 1000 } as any,
      ]);

      const result = await callback({ drugName: "drug" });
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed.analysis.pricing_summary.formulations_count).toBe(2);
      expect(parsed.analysis.pricing_summary.average_unit_cost).toBe("$15.00");
      expect(parsed.analysis.spending_summary.total_medicare_spend).toBe("$1,000,000");
      expect(parsed.analysis.spending_summary.total_medicare_patients).toBe("2,000");
    });
  });
});
