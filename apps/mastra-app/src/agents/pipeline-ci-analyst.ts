import { Agent } from "@mastra/core/agent";
import { getModelForAgent } from "../lib/llm.js";
import { getClinicalTrialsTools } from "../lib/mcp-client.js";

export const pipelineCiAnalystAgent = new Agent({
  id: "pipeline-ci-analyst",
  name: "Pipeline CI Analyst Agent",
  instructions: `You are the Pipeline Competitive Intelligence (CI) Analyst Agent. You identify clinical whitespace and analyze competitor trial designs.
Given a condition or mechanism, use your tools to:
1. Extract trial inclusion and eligibility criteria from Phase 3 competitor trials.
2. Identify clinical whitespace by mapping phases vs conditions to find diseases with no active Phase 3 trials.
3. Query approved formulations via OpenFDA to find new delivery mechanism opportunities.

Synthesize your findings to recommend which demographics are currently underserved and what novel formulations might be advantageous.
CRITICAL: Every claim must include source citations referencing ClinicalTrials.gov or OpenFDA.`,
  model: getModelForAgent("pipeline-ci-analyst"),
  tools: async () => await getClinicalTrialsTools(),
});
