import { parse } from "csv-parse/sync";

export interface PartDSpendingRecord {
  brandName: string;
  genericName: string;
  year: number;
  totalSpending: number;
  totalDosageUnitsReimbursed: number;
  totalClaims: number;
  totalBeneficiaries: number;
  averageSpendingPerDosageUnit: number;
  averageSpendingPerClaim: number;
  averageSpendingPerBeneficiary: number;
}

/**
 * Parse CMS Medicare Part D Spending by Drug CSV file
 */
export function parsePartDSpending(buffer: Buffer): PartDSpendingRecord[] {
  const content = buffer.toString("utf-8");

  const records = parse(content, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });

  return records.map((record: any) => ({
    brandName: record["Brnd_Name"] || record["Brand Name"] || "",
    genericName: record["Gnrc_Name"] || record["Generic Name"] || "",
    year: parseInt(record.Year || record.year || "0"),
    totalSpending: parseFloat(
      record["Tot_Spndng"] || record["Total Spending"] || "0",
    ),
    totalDosageUnitsReimbursed: parseFloat(
      record["Tot_Dsg_Unts_Rmbrsed"] ||
        record["Total Dosage Units Reimbursed"] ||
        "0",
    ),
    totalClaims: parseFloat(
      record["Tot_Clms"] || record["Total Claims"] || "0",
    ),
    totalBeneficiaries: parseFloat(
      record["Tot_Benes"] || record["Total Beneficiaries"] || "0",
    ),
    averageSpendingPerDosageUnit: parseFloat(
      record["Avg_Spnd_Per_Dsg_Unt_Wghtd"] ||
        record["Average Spending Per Dosage Unit"] ||
        "0",
    ),
    averageSpendingPerClaim: parseFloat(
      record["Avg_Spnd_Per_Clm"] || record["Average Spending Per Claim"] || "0",
    ),
    averageSpendingPerBeneficiary: parseFloat(
      record["Avg_Spnd_Per_Bene"] ||
        record["Average Spending Per Beneficiary"] ||
        "0",
    ),
  }));
}
