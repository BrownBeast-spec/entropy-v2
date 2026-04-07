import { parse } from "csv-parse/sync";

export interface NADACRecord {
  ndcDescription: string;
  ndc: string;
  nadacPerUnit: number;
  effectiveDate: string;
  pricingUnit: string;
  pharmacyTypeIndicator: string;
  otcIndicator: string;
  explanationCode: string;
  classificationForRateSettingCode: string;
  correspondingGenericDrugNadacPerUnit: string;
  correspondingGenericDrugEffectiveDate: string;
  asOfDate: string;
}

/**
 * Parse CMS NADAC (National Average Drug Acquisition Cost) CSV file
 */
export function parseNADACPricing(buffer: Buffer): NADACRecord[] {
  const content = buffer.toString("utf-8");

  const records = parse(content, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });

  return records.map((record: any) => ({
    ndcDescription: record["NDC Description"] || record.ndc_description || "",
    ndc: record.NDC || record.ndc || "",
    nadacPerUnit: parseFloat(
      record["NADAC Per Unit"] || record.nadac_per_unit || "0",
    ),
    effectiveDate: record["Effective Date"] || record.effective_date || "",
    pricingUnit: record["Pricing Unit"] || record.pricing_unit || "",
    pharmacyTypeIndicator:
      record["Pharmacy Type Indicator"] || record.pharmacy_type_indicator || "",
    otcIndicator: record["OTC"] || record.otc || "",
    explanationCode:
      record["Explanation Code"] || record.explanation_code || "",
    classificationForRateSettingCode:
      record["Classification for Rate Setting"] ||
      record.classification_for_rate_setting_code ||
      "",
    correspondingGenericDrugNadacPerUnit:
      record["Corresponding Generic Drug NADAC Per Unit"] ||
      record.corresponding_generic_drug_nadac_per_unit ||
      "",
    correspondingGenericDrugEffectiveDate:
      record["Corresponding Generic Drug Effective Date"] ||
      record.corresponding_generic_drug_effective_date ||
      "",
    asOfDate: record["As of Date"] || record.as_of_date || "",
  }));
}
