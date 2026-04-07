#!/usr/bin/env node

/**
 * Real-time Strategist Query Test
 *
 * Executes a real strategist query and shows raw API outputs from each tool.
 */

import { mastra } from "../../dist/mastra/index.js";

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

async function testStrategistQuery() {
  const testQuery =
    "Analyze the commercial landscape for Metformin in diabetes treatment";

  log("\n", "reset");
  separator("═", "cyan");
  log("  STRATEGIST REAL-TIME QUERY TEST", "blue");
  separator("═", "cyan");
  log(`\nQuery: "${testQuery}"`, "yellow");
  log("Mode: Strategist", "yellow");
  separator();

  try {
    // Step 1: Test Planner Agent
    log("\n[STEP 1] STRATEGIST PLANNER AGENT", "magenta");
    separator("-", "cyan");

    const plannerAgent = mastra.agents.strategistPlannerAgent;
    log("Sending query to planner...", "cyan");

    const plannerResult = await plannerAgent.generate(testQuery, {
      structuredOutput: {
        schema: {
          type: "object",
          properties: {
            originalQuery: { type: "string" },
            rationale: { type: "string" },
            patentQuery: { type: "string" },
            commercialQuery: { type: "string" },
            pipelineQuery: { type: "string" },
          },
          required: [
            "originalQuery",
            "rationale",
            "patentQuery",
            "commercialQuery",
            "pipelineQuery",
          ],
        },
      },
    });

    log("\n✓ Planner Output:", "green");
    console.log(JSON.stringify(plannerResult, null, 2));

    const plan =
      typeof plannerResult.object === "string"
        ? JSON.parse(plannerResult.object)
        : plannerResult.object;

    // Step 2: Test Patent Strategist with Real Tools
    log(
      "\n\n[STEP 2] PATENT STRATEGIST AGENT (with USPTO & FDA Orange Book)",
      "magenta",
    );
    separator("-", "cyan");

    const patentAgent = mastra.agents.patentStrategistAgent;
    log(`Patent Query: "${plan.patentQuery}"`, "yellow");
    log("\nCalling USPTO PatentsView API and FDA Orange Book...", "cyan");

    const patentResult = await patentAgent.generate(plan.patentQuery, {
      maxSteps: 5,
    });

    log("\n✓ Patent Strategist Raw Output:", "green");
    console.log(JSON.stringify(patentResult, null, 2));

    // Step 3: Test Commercial Analyst with Real Tools
    log(
      "\n\n[STEP 3] COMMERCIAL ANALYST AGENT (with CMS NADAC & Medicare Part D)",
      "magenta",
    );
    separator("-", "cyan");

    const commercialAgent = mastra.agents.commercialAnalystAgent;
    log(`Commercial Query: "${plan.commercialQuery}"`, "yellow");
    log("\nCalling CMS NADAC API and Medicare Part D API...", "cyan");

    const commercialResult = await commercialAgent.generate(
      plan.commercialQuery,
      {
        maxSteps: 5,
      },
    );

    log("\n✓ Commercial Analyst Raw Output:", "green");
    console.log(JSON.stringify(commercialResult, null, 2));

    // Step 4: Test Pipeline CI Analyst with Real Tools
    log(
      "\n\n[STEP 4] PIPELINE CI ANALYST AGENT (with ClinicalTrials.gov & OpenFDA)",
      "magenta",
    );
    separator("-", "cyan");

    const pipelineAgent = mastra.agents.pipelineCiAnalystAgent;
    log(`Pipeline Query: "${plan.pipelineQuery}"`, "yellow");
    log("\nCalling ClinicalTrials.gov API and OpenFDA API...", "cyan");

    const pipelineResult = await pipelineAgent.generate(plan.pipelineQuery, {
      maxSteps: 5,
    });

    log("\n✓ Pipeline CI Analyst Raw Output:", "green");
    console.log(JSON.stringify(pipelineResult, null, 2));

    // Step 5: Test Synthesizer
    log("\n\n[STEP 5] STRATEGIST SYNTHESIZER AGENT", "magenta");
    separator("-", "cyan");

    const synthesizerAgent = mastra.agents.strategistSynthesizerAgent;
    const synthesisPrompt = `
Original Query: ${plan.originalQuery}

Rationale: ${plan.rationale}

--- Patent Analysis Evidence ---
${patentResult.text}

--- Commercial Analysis Evidence ---
${commercialResult.text}

--- Pipeline Analysis Evidence ---
${pipelineResult.text}

Synthesize the above into a final Markdown dossier with 4 sections:
1. Executive Summary
2. Clinical & Pipeline Whitespace
3. Commercial & Market Sizing
4. Intellectual Property & Exclusivity
`;

    log("Generating final synthesis...", "cyan");

    const synthesisResult = await synthesizerAgent.generate(synthesisPrompt, {
      maxSteps: 3,
    });

    log("\n✓ Synthesizer Raw Output:", "green");
    console.log(JSON.stringify(synthesisResult, null, 2));

    // Final Summary
    log("\n\n", "reset");
    separator("═", "cyan");
    log("  FINAL DOSSIER", "blue");
    separator("═", "cyan");
    log("\n" + synthesisResult.text, "reset");
    separator("═", "cyan");

    log("\n✓ Test completed successfully!", "green");
    log("All APIs called in real-time with actual data.\n", "green");
  } catch (error) {
    log("\n✗ Test failed:", "red");
    console.error(error);
    process.exit(1);
  }
}

log("\nStarting real-time Strategist test...", "cyan");
log("This will make real API calls to:", "yellow");
log("  • USPTO PatentsView", "yellow");
log("  • FDA Orange Book", "yellow");
log("  • CMS NADAC", "yellow");
log("  • CMS Medicare Part D", "yellow");
log("  • ClinicalTrials.gov", "yellow");
log("  • OpenFDA", "yellow");

testStrategistQuery().catch((error) => {
  log(`\nFatal error: ${error.message}`, "red");
  console.error(error);
  process.exit(1);
});
