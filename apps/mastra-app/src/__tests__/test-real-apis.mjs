#!/usr/bin/env node

/**
 * Direct MCP Tool Test - Real API Calls
 *
 * Tests each Strategist MCP tool directly with real API calls and shows raw outputs.
 */

import { MCPClient } from "@mastra/mcp";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, "../../../..");
const packagesDir = resolve(rootDir, "packages");

const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
  magenta: "\x1b[35m",
};

function log(message, color = "reset") {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function separator(char = "=", color = "cyan") {
  log(char.repeat(80), color);
}

async function testRealAPIs() {
  log("\n", "reset");
  separator("═", "cyan");
  log("  STRATEGIST MCP TOOLS - REAL API TEST", "blue");
  separator("═", "cyan");
  log('\nQuery: "Metformin for diabetes treatment"', "yellow");
  log("Testing all Strategist tools with REAL API calls\n", "yellow");

  const client = new MCPClient({
    id: "test-strategist-real",
    servers: {
      patentStrategy: {
        command: "node",
        args: [resolve(packagesDir, "mcp-patent-strategy/dist/server.js")],
      },
      commercialIntel: {
        command: "node",
        args: [resolve(packagesDir, "mcp-commercial-intel/dist/server.js")],
      },
      clinical: {
        command: "node",
        args: [resolve(packagesDir, "mcp-clinical/dist/server.js")],
      },
    },
    timeout: 60_000,
  });

  try {
    const toolsets = await client.listToolsets();

    // Test 1: FDA Orange Book for Metformin
    log("\n[TEST 1] FDA Orange Book - Search Metformin", "magenta");
    separator("-", "cyan");
    log("API: FDA Orange Book CSV", "cyan");
    log('Calling: search_orange_book("metformin")\n', "yellow");

    const orangeBookTool = toolsets.patentStrategy.search_orange_book;
    const orangeBookResult = await orangeBookTool.execute({
      drugName: "metformin",
    });

    log("✓ RAW API RESPONSE:", "green");
    console.log(JSON.stringify(orangeBookResult, null, 2));

    // Test 2: USPTO Patents for Metformin
    log("\n\n[TEST 2] USPTO PatentsView - Metformin Patents", "magenta");
    separator("-", "cyan");
    log("API: USPTO PatentsView REST API", "cyan");
    log("Calling: analyze_patent_landscape() for metformin\n", "yellow");

    const patentLandscapeTool =
      toolsets.patentStrategy.analyze_patent_landscape;
    const patentResult = await patentLandscapeTool.execute({
      mechanism: "metformin",
      yearFrom: 2015,
      limit: 5,
    });

    log("✓ RAW API RESPONSE:", "green");
    console.log(JSON.stringify(patentResult, null, 2));

    // Test 3: CMS NADAC Pricing
    log("\n\n[TEST 3] CMS NADAC - Metformin Pricing", "magenta");
    separator("-", "cyan");
    log("API: CMS NADAC CSV Download", "cyan");
    log('Calling: get_drug_pricing_nadac("metformin")\n', "yellow");

    const nadacTool = toolsets.commercialIntel.get_drug_pricing_nadac;
    const nadacResult = await nadacTool.execute({
      drugName: "metformin",
      limit: 10,
    });

    log("✓ RAW API RESPONSE:", "green");
    console.log(JSON.stringify(nadacResult, null, 2));

    // Test 4: Medicare Part D Spending
    log("\n\n[TEST 4] Medicare Part D - Metformin Spending", "magenta");
    separator("-", "cyan");
    log("API: CMS Medicare Part D CSV Download", "cyan");
    log('Calling: get_medicare_spending("metformin")\n', "yellow");

    const partDTool = toolsets.commercialIntel.get_medicare_spending;
    const partDResult = await partDTool.execute({
      drugName: "metformin",
      limit: 5,
    });

    log("✓ RAW API RESPONSE:", "green");
    console.log(JSON.stringify(partDResult, null, 2));

    // Test 5: ClinicalTrials.gov Search
    log("\n\n[TEST 5] ClinicalTrials.gov - Diabetes Trials", "magenta");
    separator("-", "cyan");
    log("API: ClinicalTrials.gov API v2", "cyan");
    log('Calling: search_studies("diabetes metformin")\n', "yellow");

    const searchStudiesTool = toolsets.clinical.search_studies;
    const trialsResult = await searchStudiesTool.execute({
      term: "diabetes metformin",
      limit: 5,
    });

    log("✓ RAW API RESPONSE:", "green");
    console.log(JSON.stringify(trialsResult, null, 2));

    // Test 6: Clinical Whitespace
    log("\n\n[TEST 6] Clinical Whitespace - Diabetes Mechanisms", "magenta");
    separator("-", "cyan");
    log("API: ClinicalTrials.gov API v2", "cyan");
    log('Calling: identify_clinical_whitespace("metformin")\n', "yellow");

    const whitespaceTool = toolsets.clinical.identify_clinical_whitespace;
    const whitespaceResult = await whitespaceTool.execute({
      mechanism: "metformin",
    });

    log("✓ RAW API RESPONSE:", "green");
    console.log(JSON.stringify(whitespaceResult, null, 2));

    // Test 7: OpenFDA Approved Formulations
    log("\n\n[TEST 7] OpenFDA - Metformin Formulations", "magenta");
    separator("-", "cyan");
    log("API: OpenFDA REST API", "cyan");
    log('Calling: get_approved_formulations("metformin")\n', "yellow");

    const formulationsTool = toolsets.clinical.get_approved_formulations;
    const formulationsResult = await formulationsTool.execute({
      drugName: "metformin",
    });

    log("✓ RAW API RESPONSE:", "green");
    console.log(JSON.stringify(formulationsResult, null, 2));

    // Test 8: Market Position Analysis (Combined)
    log(
      "\n\n[TEST 8] Market Position Analysis - Combined NADAC + Part D",
      "magenta",
    );
    separator("-", "cyan");
    log("APIs: CMS NADAC + Medicare Part D (Combined)", "cyan");
    log('Calling: analyze_market_position("metformin")\n', "yellow");

    const marketTool = toolsets.commercialIntel.analyze_market_position;
    const marketResult = await marketTool.execute({
      drugName: "metformin",
    });

    log("✓ RAW API RESPONSE:", "green");
    console.log(JSON.stringify(marketResult, null, 2));

    // Summary
    log("\n\n", "reset");
    separator("═", "cyan");
    log("  TEST SUMMARY", "blue");
    separator("═", "cyan");
    log("\n✓ All 8 tools tested successfully with REAL API calls!", "green");
    log("✓ APIs Called:", "green");
    log("  • FDA Orange Book (CSV)", "green");
    log("  • USPTO PatentsView (REST)", "green");
    log("  • CMS NADAC (CSV)", "green");
    log("  • CMS Medicare Part D (CSV)", "green");
    log("  • ClinicalTrials.gov API v2 (REST)", "green");
    log("  • OpenFDA (REST)", "green");
    separator("═", "cyan");
    log("", "reset");

    await client.disconnect();
  } catch (error) {
    log("\n✗ Test failed:", "red");
    console.error(error);
    await client.disconnect();
    process.exit(1);
  }
}

log(
  "\n⚠️  Starting REAL API tests - This will make actual HTTP requests!",
  "yellow",
);
log("Downloading CSV files and calling REST APIs...", "yellow");

testRealAPIs().catch((error) => {
  log(`\nFatal error: ${error.message}`, "red");
  console.error(error);
  process.exit(1);
});
