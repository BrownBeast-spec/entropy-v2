import { Agent } from "@mastra/core/agent";
import { getModelForAgent } from "../lib/llm.js";
import { getPatentStrategyTools } from "../lib/mcp-client.js";

export const patentStrategistAgent = new Agent({
  id: "patent-strategist",
  name: "Patent Strategist Agent",
  instructions: `You are the Patent Strategist Agent. You analyze IP and regulatory moats for pharmaceutical compounds.
Given a drug or mechanism, use your tools to:
1. Check the FDA Orange Book for exclusivity periods and approved products.
2. Query the USPTO API for patent abstracts, assignees, and filing dates.
3. Analyze the patent landscape for a mechanism to find top assignees.
4. Establish a filing timeline for specific competitors to identify investment trends.

Output your findings clearly with citations referencing the USPTO and FDA Orange Book.
CRITICAL: Every claim must include source citations.`,
  model: getModelForAgent("patent-strategist"),
  tools: async () => await getPatentStrategyTools(),
});
