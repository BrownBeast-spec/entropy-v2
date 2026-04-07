/**
 * Commercial Intel Tools
 *
 * MCP tools for pharmaceutical commercial intelligence:
 * - CMS NADAC (National Average Drug Acquisition Cost) pricing data
 * - Medicare Part D spending data
 *
 * These tools support competitive intelligence and market positioning analysis.
 */

import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { buildCitation, type CitedFact } from "@entropy/mcp-shared";
import {
  getDrugPricingNADAC,
  getMedicareSpending,
} from "../utils/commercial-loader.js";

const NADAC_URL =
  "https://data.medicaid.gov/dataset/4a00010a-132b-4e4d-a611-543c9521280f";
const PART_D_URL =
  "https://data.cms.gov/summary-statistics-on-use-and-payments/medicare-medicaid-spending-by-drug";

export function registerCommercialIntelTools(server: McpServer): void {
  // ─── 1. Get Drug Pricing (NADAC) ──────────────────────────────────
  server.tool(
    "get_drug_pricing_nadac",
    "Get National Average Drug Acquisition Cost (NADAC) pricing for a specific drug. Returns per-unit pricing to estimate competitive price floors.",
    {
      drugName: z
        .string()
        .describe("Drug brand or generic name (e.g., 'metformin', 'humira')"),
      limit: z
        .number()
        .optional()
        .default(20)
        .describe("Max results to return (default: 20)"),
    },
    async ({ drugName, limit }) => {
      try {
        const records = await getDrugPricingNADAC(drugName);

        // Group by description and get the latest pricing
        const uniqueDrugs = new Map<string, any>();

        records.forEach((record) => {
          const existing = uniqueDrugs.get(record.ndcDescription);
          // If we don't have it, or this one is newer (simplified date check), keep it
          if (!existing || record.effectiveDate > existing.effectiveDate) {
            uniqueDrugs.set(record.ndcDescription, record);
          }
        });

        const latestPricing = Array.from(uniqueDrugs.values())
          .slice(0, limit)
          .sort((a, b) => b.nadacPerUnit - a.nadacPerUnit); // Sort by highest price first

        const facts: CitedFact[] = latestPricing.map((record) => {
          const factDescription = `${record.ndcDescription} (${record.pharmacyTypeIndicator}) - Pricing Unit: ${record.pricingUnit}, Cost: $${record.nadacPerUnit.toFixed(4)} per unit (Effective: ${record.effectiveDate})`;

          return buildCitation(
            "CMS NADAC Pricing",
            factDescription,
            "CMS Medicaid Data",
            NADAC_URL,
            record.ndc,
            "verified",
          );
        });

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                drug_name: drugName,
                total_formulations_found: uniqueDrugs.size,
                results_returned: facts.length,
                pricing_data: facts.map((f) => ({
                  claim: f.claim,
                  value: f.value,
                  source: f.source,
                  confidence: f.confidence,
                })),
              }),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                error:
                  error instanceof Error
                    ? error.message
                    : "Failed to get NADAC pricing data",
              }),
            },
          ],
        };
      }
    },
  );

  // ─── 2. Get Medicare Spending (Part D) ──────────────────────────
  server.tool(
    "get_medicare_spending",
    "Get CMS Medicare Part D spending data for a drug. Returns total claims, beneficiaries, and average spending metrics.",
    {
      drugName: z
        .string()
        .describe("Drug brand or generic name (e.g., 'metformin')"),
      limit: z
        .number()
        .optional()
        .default(10)
        .describe("Max results to return (default: 10)"),
    },
    async ({ drugName, limit }) => {
      try {
        const records = await getMedicareSpending(drugName);
        const limitedRecords = records.slice(0, limit);

        const facts: CitedFact[] = limitedRecords.map((record) => {
          // Format large numbers for readability
          const totalSpendFormat = new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "USD",
            maximumFractionDigits: 0,
          }).format(record.totalSpending);
          const beneficiariesFormat = new Intl.NumberFormat("en-US").format(
            record.totalBeneficiaries,
          );
          const perClaimFormat = new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "USD",
          }).format(record.averageSpendingPerClaim);

          const factDescription = `${record.brandName || record.genericName} (${record.year}): Total Medicare Part D Spending: ${totalSpendFormat} across ${beneficiariesFormat} beneficiaries. Avg cost per claim: ${perClaimFormat}.`;

          return buildCitation(
            "Medicare Part D Spending",
            factDescription,
            "CMS Spending By Drug",
            PART_D_URL,
            `${record.brandName}-${record.year}`,
            "verified",
          );
        });

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                drug_name: drugName,
                total_records_found: records.length,
                spending_data: facts.map((f) => ({
                  claim: f.claim,
                  value: f.value,
                  source: f.source,
                  confidence: f.confidence,
                })),
              }),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                error:
                  error instanceof Error
                    ? error.message
                    : "Failed to get Medicare spending data",
              }),
            },
          ],
        };
      }
    },
  );

  // ─── 3. Analyze Market Position ──────────────────────────────────
  server.tool(
    "analyze_market_position",
    "Analyze commercial market position by combining NADAC pricing and Medicare spending metrics.",
    {
      drugName: z
        .string()
        .describe("Drug brand or generic name (e.g., 'metformin')"),
    },
    async ({ drugName }) => {
      try {
        // Fetch data in parallel
        const [pricingRecords, spendingRecords] = await Promise.all([
          getDrugPricingNADAC(drugName),
          getMedicareSpending(drugName),
        ]);

        // Synthesize pricing summary
        const uniqueFormulations = new Set(
          pricingRecords.map((r) => r.ndcDescription),
        ).size;
        const avgPrice =
          pricingRecords.length > 0
            ? pricingRecords.reduce((sum, r) => sum + r.nadacPerUnit, 0) /
              pricingRecords.length
            : 0;

        // Synthesize spending summary
        const totalSpending = spendingRecords.reduce(
          (sum, r) => sum + r.totalSpending,
          0,
        );
        const totalBeneficiaries = spendingRecords.reduce(
          (sum, r) => sum + r.totalBeneficiaries,
          0,
        );

        const marketSynthesis = {
          pricing_summary: {
            formulations_count: uniqueFormulations,
            average_unit_cost: `$${avgPrice.toFixed(2)}`,
            pricing_data_points: pricingRecords.length,
          },
          spending_summary: {
            total_medicare_spend: new Intl.NumberFormat("en-US", {
              style: "currency",
              currency: "USD",
              maximumFractionDigits: 0,
            }).format(totalSpending),
            total_medicare_patients: new Intl.NumberFormat("en-US").format(
              totalBeneficiaries,
            ),
            spending_data_points: spendingRecords.length,
          },
        };

        const cited = buildCitation(
          "Commercial Market Synthesis",
          `${drugName} Market Position: ${uniqueFormulations} formulations averaging $${avgPrice.toFixed(2)}/unit. Total Medicare Part D exposure: $${(totalSpending / 1000000).toFixed(1)}M across ${totalBeneficiaries} patients.`,
          "CMS NADAC + Part D Spending",
          "https://data.cms.gov",
          undefined,
          "verified",
        );

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                drug_name: drugName,
                analysis: marketSynthesis,
                citation: cited,
              }),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                error:
                  error instanceof Error
                    ? error.message
                    : "Failed to analyze market position",
              }),
            },
          ],
        };
      }
    },
  );
}
