#!/usr/bin/env node

import { execFile } from "child_process";
import { promisify } from "util";
import { mkdtemp, access } from "fs/promises";
import { tmpdir } from "os";
import { join, resolve } from "path";

const execFileAsync = promisify(execFile);

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function run() {
  const dbUrl = process.env.STRATEGIST_DATABASE_URL || process.env.DATABASE_URL;
  if (!dbUrl) {
    throw new Error("Set DATABASE_URL or STRATEGIST_DATABASE_URL first");
  }

  const zipPath =
    process.env.ORANGE_BOOK_ZIP_PATH ||
    resolve(
      process.cwd(),
      "packages/mcp-patent-strategy/data/EOBZIP_2026_02.zip",
    );

  if (!(await exists(zipPath))) {
    throw new Error(`Orange Book ZIP not found at: ${zipPath}`);
  }

  const nadacCsv =
    process.env.NADAC_CSV_PATH || resolve(process.cwd(), "nadac-latest.csv");

  const tmp = await mkdtemp(join(tmpdir(), "entropy-orange-book-"));
  await execFileAsync("unzip", [
    "-o",
    zipPath,
    "products.txt",
    "patent.txt",
    "exclusivity.txt",
    "-d",
    tmp,
  ]);

  const sqlPath = resolve(process.cwd(), "scripts/seed-orange-book.sql");
  await execFileAsync("psql", [dbUrl, "-f", sqlPath], { stdio: "inherit" });

  await execFileAsync("psql", [
    dbUrl,
    "-c",
    `\\copy strategist.orange_book_products(ingredient,df_route,trade_name,applicant,strength,appl_type,appl_no,product_no,te_code,approval_date,rld,rs_type,applicant_full_name) FROM '${join(tmp, "products.txt")}' WITH (FORMAT csv, HEADER true, DELIMITER '~')`,
  ]);

  await execFileAsync("psql", [
    dbUrl,
    "-c",
    `\\copy strategist.orange_book_patents(appl_type,appl_no,product_no,patent_no,patent_expire_date,drug_substance_flag,drug_product_flag,patent_use_code,delist_flag,submission_date) FROM '${join(tmp, "patent.txt")}' WITH (FORMAT csv, HEADER true, DELIMITER '~')`,
  ]);

  await execFileAsync("psql", [
    dbUrl,
    "-c",
    `\\copy strategist.orange_book_exclusivity(appl_type,appl_no,product_no,exclusivity_code,exclusivity_date) FROM '${join(tmp, "exclusivity.txt")}' WITH (FORMAT csv, HEADER true, DELIMITER '~')`,
  ]);

  if (await exists(nadacCsv)) {
    await execFileAsync("psql", [
      dbUrl,
      "-c",
      `\\copy strategist.nadac_pricing(ndc_description,ndc,nadac_per_unit,effective_date,pricing_unit,pharmacy_type_indicator,otc,explanation_code,classification_for_rate_setting,corresponding_generic_drug_nadac_per_unit,corresponding_generic_drug_effective_date,as_of_date) FROM '${nadacCsv}' WITH (FORMAT csv, HEADER true)`,
    ]);
    console.log(`Loaded NADAC CSV: ${nadacCsv}`);
  } else {
    console.log(`NADAC CSV not found at ${nadacCsv}; skipping NADAC load.`);
  }

  console.log("Orange Book seed complete.");
}

run().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
