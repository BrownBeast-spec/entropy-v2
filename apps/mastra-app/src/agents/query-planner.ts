import { Agent } from "@mastra/core/agent";
import { getModelForAgent } from "../lib/llm.js";

export const queryPlannerAgent = new Agent({
  id: "query-planner",
  name: "Query Planner Agent",
  instructions: `You normalize biomedical user questions into tool-specific query inputs.

Rules:
1. Preserve intent and do not invent entities.
2. Prefer concise, API-safe strings with no markdown.
3. If confidence is low for a field, use the original user query.
4. Keep gene symbols uppercase when clearly identifiable (e.g., SNCA, LRRK2).
5. Return only content required by the output schema.`,
  model: getModelForAgent("query-planner"),
});
