import "dotenv/config";
import { Mastra } from "@mastra/core";
import { plannerAgent } from "../agents/planner.js";

export const mastra = new Mastra({
  agents: { plannerAgent },
});
