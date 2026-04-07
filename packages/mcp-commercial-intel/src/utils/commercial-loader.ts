/**
 * Commercial Intel Data Loader
 *
 * Loads CMS NADAC (pricing) and Medicare Part D (spending) data.
 * Updated 2026-04-08 to use new CMS APIs after Socrata migration.
 *
 * Data sources (as of 2026-04-08):
 * - NADAC: https://download.medicaid.gov/data/nadac-national-average-drug-acquisition-cost-04-08-2026.csv
 * - Part D: https://data.cms.gov/data-api/v1/dataset/7e0b4365-fd63-4a29-8f5e-e0ac9f66a81b/data (REST JSON API)
 *
 * See: amd-docs/CMS_API_ENDPOINTS.md for full API documentation
 */

import { DataCacheManager } from "@entropy/mcp-shared";
import {
  parseNADACPricing,
  parsePartDSpendingJSON,
  type NADACRecord,
  type PartDSpendingRecord,
} from "@entropy/mcp-shared";
import { execFile } from "child_process";
import { promisify } from "util";

const COMMERCIAL_URLS = {
  // NADAC: Latest 2026 dataset (updated weekly)
  // Note: This is a ~50MB CSV file and may timeout on first download
  // Consider using streaming or pre-caching for production
  nadac:
    "https://download.medicaid.gov/data/nadac-national-average-drug-acquisition-cost-04-08-2026.csv",

  // Part D: Annual spending data (2019-2023) - REST JSON API
  // Dataset ID: 7e0b4365-fd63-4a29-8f5e-e0ac9f66a81b
  // Note: Using pagination (size=1000) to avoid timeouts and memory issues
  partD:
    "https://data.cms.gov/data-api/v1/dataset/7e0b4365-fd63-4a29-8f5e-e0ac9f66a81b/data?size=1000",
} as const;

// Cache for 30 days (Commercial data updates monthly/yearly)
const cacheManager = new DataCacheManager(".cache/commercial-data", 30);
const execFileAsync = promisify(execFile);

async function queryNadacFromPostgres(
  drugName: string,
): Promise<NADACRecord[]> {
  const dbUrl =
    process.env["STRATEGIST_DATABASE_URL"] || process.env["DATABASE_URL"];
  if (!dbUrl) return [];

  const sql = `
    SELECT
      ndc_description,
      ndc,
      nadac_per_unit,
      effective_date,
      pricing_unit,
      pharmacy_type_indicator,
      otc,
      explanation_code,
      classification_for_rate_setting,
      corresponding_generic_drug_nadac_per_unit,
      corresponding_generic_drug_effective_date,
      as_of_date
    FROM strategist.nadac_pricing
    WHERE lower(ndc_description) LIKE lower('%${drugName.replace(/'/g, "''")}%')
    ORDER BY as_of_date DESC
    LIMIT 500;
  `;

  try {
    const { stdout } = await execFileAsync(
      "psql",
      [dbUrl, "-t", "-A", "-F", "\t", "-c", sql],
      { timeout: 15000 },
    );

    const lines = stdout
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);

    return lines.map((line) => {
      const [
        ndcDescription,
        ndc,
        nadacPerUnit,
        effectiveDate,
        pricingUnit,
        pharmacyTypeIndicator,
        otcIndicator,
        explanationCode,
        classificationForRateSettingCode,
        correspondingGenericDrugNadacPerUnit,
        correspondingGenericDrugEffectiveDate,
        asOfDate,
      ] = line.split("\t");

      return {
        ndcDescription: ndcDescription || "",
        ndc: ndc || "",
        nadacPerUnit: Number(nadacPerUnit || 0),
        effectiveDate: effectiveDate || "",
        pricingUnit: pricingUnit || "",
        pharmacyTypeIndicator: pharmacyTypeIndicator || "",
        otcIndicator: otcIndicator || "",
        explanationCode: explanationCode || "",
        classificationForRateSettingCode:
          classificationForRateSettingCode || "",
        correspondingGenericDrugNadacPerUnit:
          correspondingGenericDrugNadacPerUnit || "",
        correspondingGenericDrugEffectiveDate:
          correspondingGenericDrugEffectiveDate || "",
        asOfDate: asOfDate || "",
      };
    });
  } catch {
    return [];
  }
}

// Async wrapper for synchronous parser
async function wrapParser<T>(
  parser: (buffer: Buffer) => T[],
): Promise<(buffer: Buffer) => Promise<T[]>> {
  return async (buffer: Buffer) => Promise.resolve(parser(buffer));
}

/**
 * Load NADAC Pricing data
 */
export async function loadNADACPricing(): Promise<NADACRecord[]> {
  const asyncParser = await wrapParser(parseNADACPricing);
  try {
    const result = await cacheManager.fetchOrCache(
      COMMERCIAL_URLS.nadac,
      "nadac-pricing.csv",
      asyncParser,
    );
    return result.data;
  } catch (error) {
    console.error("Failed to load NADAC data:", error);
    return [];
  }
}

/**
 * Load Medicare Part D Spending data from new REST JSON API
 */
export async function loadPartDSpending(): Promise<PartDSpendingRecord[]> {
  const asyncParser = await wrapParser(parsePartDSpendingJSON);
  try {
    const result = await cacheManager.fetchOrCache(
      COMMERCIAL_URLS.partD,
      "part-d-spending.json",
      asyncParser,
    );
    return result.data;
  } catch (error) {
    console.error("Failed to load Part D data:", error);
    return [];
  }
}

/**
 * Search NADAC pricing by drug name
 */
export async function getDrugPricingNADAC(
  drugName: string,
): Promise<NADACRecord[]> {
  const fromPostgres = await queryNadacFromPostgres(drugName);
  if (fromPostgres.length > 0) {
    return fromPostgres;
  }

  const records = await loadNADACPricing();
  const searchTerm = drugName.toLowerCase().trim();

  const nadacMatches = records.filter(
    (record) =>
      record.ndcDescription.toLowerCase().includes(searchTerm) ||
      record.correspondingGenericDrugEffectiveDate
        .toLowerCase()
        .includes(searchTerm),
  );

  if (nadacMatches.length > 0) {
    return nadacMatches;
  }

  // Fallback alternative: derive per-unit pricing proxy from Medicare Part D data.
  // This keeps tool operational when NADAC bulk ingest is not configured.
  const partDProxy = await getMedicareSpending(drugName);
  return partDProxy.slice(0, 200).map((record) => ({
    ndcDescription: `${record.brandName || record.genericName} (${record.year})`,
    ndc: `${record.brandName || "unknown"}-${record.year}`,
    nadacPerUnit: Number(record.averageSpendingPerDosageUnit || 0),
    effectiveDate: `${record.year}-12-31`,
    pricingUnit: "UNIT",
    pharmacyTypeIndicator: "PART_D_PROXY",
    otcIndicator: "N",
    explanationCode: "PART_D_PROXY",
    classificationForRateSettingCode: "PROXY",
    correspondingGenericDrugNadacPerUnit: "",
    correspondingGenericDrugEffectiveDate: "",
    asOfDate: `${record.year}-12-31`,
  }));
}

/**
 * Search Part D spending by drug name
 */
export async function getMedicareSpending(
  drugName: string,
): Promise<PartDSpendingRecord[]> {
  const records = await loadPartDSpending();
  const searchTerm = drugName.toLowerCase().trim();

  return records.filter(
    (record) =>
      (record.brandName || "").toLowerCase().includes(searchTerm) ||
      (record.genericName || "").toLowerCase().includes(searchTerm),
  );
}
