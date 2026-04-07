import { parse } from "csv-parse/sync";

export interface OrangeBookProduct {
  ingredient: string;
  dfRoute: string;
  tradeName: string;
  applicant: string;
  strength: string;
  applType: string;
  applNo: string;
  productNo: string;
  teCode: string;
  approvalDate: string;
  rld: string;
  rsType: string;
  applicantFullName: string;
}

export interface OrangeBookPatent {
  appl_type: string;
  appl_no: string;
  product_no: string;
  patent_no: string;
  patent_expire_date: string;
  drug_substance_flag: string;
  drug_product_flag: string;
  patent_use_code: string;
  delist_flag: string;
}

export interface OrangeBookExclusivity {
  appl_type: string;
  appl_no: string;
  product_no: string;
  exclusivity_code: string;
  exclusivity_date: string;
}

/**
 * Parse FDA Orange Book products.txt file
 */
export function parseOrangeBookProducts(buffer: Buffer): OrangeBookProduct[] {
  const content = buffer.toString("utf-8");

  const records = parse(content, {
    columns: true,
    skip_empty_lines: true,
    delimiter: "~", // Orange Book uses ~ as delimiter
    relax_column_count: true,
  });

  return records.map((record: any) => ({
    ingredient: record.Ingredient || "",
    dfRoute: record.DF_Route || "",
    tradeName: record.Trade_Name || "",
    applicant: record.Applicant || "",
    strength: record.Strength || "",
    applType: record.Appl_Type || "",
    applNo: record.Appl_No || "",
    productNo: record.Product_No || "",
    teCode: record.TE_Code || "",
    approvalDate: record.Approval_Date || "",
    rld: record.RLD || "",
    rsType: record.RS_Type || "",
    applicantFullName: record.Applicant_Full_Name || "",
  }));
}

/**
 * Parse FDA Orange Book patent.txt file
 */
export function parseOrangeBookPatents(buffer: Buffer): OrangeBookPatent[] {
  const content = buffer.toString("utf-8");

  const records = parse(content, {
    columns: true,
    skip_empty_lines: true,
    delimiter: "~",
    relax_column_count: true,
  });

  return records.map((record: any) => ({
    appl_type: record.Appl_Type || "",
    appl_no: record.Appl_No || "",
    product_no: record.Product_No || "",
    patent_no: record.Patent_No || "",
    patent_expire_date: record.Patent_Expire_Date_Text || "",
    drug_substance_flag: record.Drug_Substance_Flag || "",
    drug_product_flag: record.Drug_Product_Flag || "",
    patent_use_code: record.Patent_Use_Code || "",
    delist_flag: record.Delist_Flag || "",
  }));
}

/**
 * Parse FDA Orange Book exclusivity.txt file
 */
export function parseOrangeBookExclusivity(
  buffer: Buffer,
): OrangeBookExclusivity[] {
  const content = buffer.toString("utf-8");

  const records = parse(content, {
    columns: true,
    skip_empty_lines: true,
    delimiter: "~",
    relax_column_count: true,
  });

  return records.map((record: any) => ({
    appl_type: record.Appl_Type || "",
    appl_no: record.Appl_No || "",
    product_no: record.Product_No || "",
    exclusivity_code: record.Exclusivity_Code || "",
    exclusivity_date: record.Exclusivity_Date || "",
  }));
}

/**
 * Combined Orange Book parser (all three files)
 */
export interface OrangeBookData {
  products: OrangeBookProduct[];
  patents: OrangeBookPatent[];
  exclusivities: OrangeBookExclusivity[];
}

export function parseOrangeBookCombined(
  productsBuffer: Buffer,
  patentsBuffer: Buffer,
  exclusivityBuffer: Buffer,
): OrangeBookData {
  return {
    products: parseOrangeBookProducts(productsBuffer),
    patents: parseOrangeBookPatents(patentsBuffer),
    exclusivities: parseOrangeBookExclusivity(exclusivityBuffer),
  };
}
