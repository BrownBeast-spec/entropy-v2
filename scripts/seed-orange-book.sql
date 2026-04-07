CREATE SCHEMA IF NOT EXISTS strategist;

CREATE TABLE IF NOT EXISTS strategist.orange_book_products (
  ingredient text NOT NULL,
  df_route text,
  trade_name text,
  applicant text,
  strength text,
  appl_type text,
  appl_no text NOT NULL,
  product_no text,
  te_code text,
  approval_date text,
  rld text,
  rs_type text,
  applicant_full_name text,
  PRIMARY KEY (appl_no, product_no)
);

CREATE TABLE IF NOT EXISTS strategist.orange_book_patents (
  appl_type text,
  appl_no text NOT NULL,
  product_no text,
  patent_no text NOT NULL,
  patent_expire_date text,
  drug_substance_flag text,
  drug_product_flag text,
  patent_use_code text,
  delist_flag text,
  submission_date text,
  PRIMARY KEY (appl_no, product_no, patent_no)
);

CREATE TABLE IF NOT EXISTS strategist.orange_book_exclusivity (
  appl_type text,
  appl_no text NOT NULL,
  product_no text,
  exclusivity_code text,
  exclusivity_date text,
  PRIMARY KEY (appl_no, product_no, exclusivity_code)
);

CREATE TABLE IF NOT EXISTS strategist.nadac_pricing (
  ndc_description text,
  ndc text,
  nadac_per_unit numeric,
  effective_date text,
  pricing_unit text,
  pharmacy_type_indicator text,
  otc text,
  explanation_code text,
  classification_for_rate_setting text,
  corresponding_generic_drug_nadac_per_unit text,
  corresponding_generic_drug_effective_date text,
  as_of_date text
);

CREATE INDEX IF NOT EXISTS idx_orange_book_products_ingredient
  ON strategist.orange_book_products USING gin (to_tsvector('simple', ingredient));

CREATE INDEX IF NOT EXISTS idx_orange_book_patents_patent_no
  ON strategist.orange_book_patents (patent_no);

CREATE INDEX IF NOT EXISTS idx_nadac_pricing_ndc_desc
  ON strategist.nadac_pricing USING gin (to_tsvector('simple', ndc_description));
