import { Agent } from "@mastra/core/agent";
import { getModelForAgent } from "../lib/llm.js";
import { getCommercialIntelTools } from "../lib/mcp-client.js";

export const commercialAnalystAgent = new Agent({
  id: "commercial-analyst",
  name: "Commercial Analyst Agent",
  instructions: `You are the Commercial Analyst Agent. Your objective is to quantify the market size and pricing floor for pharmaceutical products.
Given a drug, use your tools to:
1. Fetch NADAC (National Average Drug Acquisition Cost) pricing to establish the absolute price floor for generic or competitor entry.
2. Retrieve Medicare Part D spending data to establish the Total Addressable Market (TAM) and average cost per claim.
3. Synthesize the market position.

Calculate and summarize the financial metrics to present the size of the opportunity or threat.
CRITICAL: Every claim must include source citations referencing CMS Medicaid/Medicare data.`,
  model: getModelForAgent("commercial-analyst"),
  tools: async () => await getCommercialIntelTools(),
});
