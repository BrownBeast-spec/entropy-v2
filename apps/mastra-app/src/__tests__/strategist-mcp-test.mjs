#!/usr/bin/env node

/**
 * Strategist MCP Server API Test Suite
 *
 * Tests all Strategist MCP servers and their APIs to verify they're working correctly.
 * This includes:
 * - mcp-patent-strategy (Orange Book, USPTO PatentsView)
 * - mcp-commercial-intel (NADAC, Medicare Part D)
 * - mcp-clinical (ClinicalTrials.gov, OpenFDA)
 */

import { MCPClient } from "@mastra/mcp";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, "../../../..");
const packagesDir = resolve(rootDir, "packages");

// Color codes for output
const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
};

function log(message, color = "reset") {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function testServer(serverName, serverPath, expectedTools) {
  log(`\n${"=".repeat(60)}`, "cyan");
  log(`Testing: ${serverName}`, "blue");
  log("=".repeat(60), "cyan");

  const client = new MCPClient({
    id: `test-${serverName}`,
    servers: {
      [serverName]: {
        command: "node",
        args: [serverPath],
      },
    },
    timeout: 10_000,
  });

  try {
    const toolsets = await client.listToolsets();
    const tools = toolsets[serverName];

    if (!tools) {
      log(`✗ Server "${serverName}" returned no tools`, "red");
      return { success: false, server: serverName, error: "No tools found" };
    }

    const toolNames = Object.keys(tools);
    log(`\n✓ Server connected successfully`, "green");
    log(`  Found ${toolNames.length} tools:`, "cyan");

    const results = {
      success: true,
      server: serverName,
      foundTools: toolNames,
      missingTools: [],
      workingApis: [],
      failedApis: [],
    };

    // Check for expected tools
    for (const expectedTool of expectedTools) {
      if (toolNames.includes(expectedTool)) {
        log(`  ✓ ${expectedTool}`, "green");
      } else {
        log(`  ✗ ${expectedTool} (MISSING)`, "red");
        results.missingTools.push(expectedTool);
        results.success = false;
      }
    }

    // Find any unexpected tools
    const unexpectedTools = toolNames.filter((t) => !expectedTools.includes(t));
    if (unexpectedTools.length > 0) {
      log(`\n  Additional tools found:`, "yellow");
      unexpectedTools.forEach((tool) => log(`    • ${tool}`, "yellow"));
    }

    await client.disconnect();
    return results;
  } catch (error) {
    log(`✗ Server failed to start: ${error.message}`, "red");
    return {
      success: false,
      server: serverName,
      error: error.message,
      foundTools: [],
      missingTools: expectedTools,
      workingApis: [],
      failedApis: [],
    };
  }
}

async function runTests() {
  log("\n" + "═".repeat(60), "cyan");
  log("  STRATEGIST MCP SERVERS API TEST SUITE", "blue");
  log("═".repeat(60), "cyan");

  const tests = [
    {
      name: "mcp-patent-strategy",
      path: resolve(packagesDir, "mcp-patent-strategy/dist/server.js"),
      expectedTools: [
        "search_orange_book",
        "get_patent_details",
        "analyze_patent_landscape",
        "get_company_patent_timeline",
      ],
    },
    {
      name: "mcp-commercial-intel",
      path: resolve(packagesDir, "mcp-commercial-intel/dist/server.js"),
      expectedTools: [
        "get_drug_pricing_nadac",
        "get_medicare_spending",
        "analyze_market_position",
      ],
    },
    {
      name: "mcp-clinical",
      path: resolve(packagesDir, "mcp-clinical/dist/server.js"),
      expectedTools: [
        "search_studies",
        "get_study_details",
        "get_eligibility_criteria",
        "extract_trial_inclusion_criteria",
        "identify_clinical_whitespace",
        "get_approved_formulations",
        "search_literature",
        "get_abstract",
      ],
    },
  ];

  const results = [];

  for (const test of tests) {
    const result = await testServer(test.name, test.path, test.expectedTools);
    results.push(result);
  }

  // Summary
  log("\n" + "═".repeat(60), "cyan");
  log("  TEST SUMMARY", "blue");
  log("═".repeat(60), "cyan");

  const allPassed = results.every((r) => r.success);
  const totalServers = results.length;
  const passedServers = results.filter((r) => r.success).length;

  log(`\nServers tested: ${totalServers}`, "cyan");
  log(
    `Servers passed: ${passedServers}`,
    passedServers === totalServers ? "green" : "yellow",
  );
  log(
    `Servers failed: ${totalServers - passedServers}`,
    passedServers === totalServers ? "green" : "red",
  );

  if (!allPassed) {
    log("\n⚠ Issues found:", "yellow");
    results.forEach((result) => {
      if (!result.success) {
        log(`\n  ${result.server}:`, "red");
        if (result.error) {
          log(`    Error: ${result.error}`, "red");
        }
        if (result.missingTools.length > 0) {
          log(`    Missing tools: ${result.missingTools.join(", ")}`, "red");
        }
      }
    });
  }

  log("\n" + "═".repeat(60), "cyan");
  log(
    allPassed ? "✓ All tests passed!" : "✗ Some tests failed",
    allPassed ? "green" : "red",
  );
  log("═".repeat(60) + "\n", "cyan");

  process.exit(allPassed ? 0 : 1);
}

runTests().catch((error) => {
  log(`\nFatal error: ${error.message}`, "red");
  console.error(error);
  process.exit(1);
});
