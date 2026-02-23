import "dotenv/config";
import { Mastra } from "@mastra/core";
import { plannerAgent } from "../agents/planner.js";
import { biologistAgent } from "../agents/biologist.js";
import { clinicalScoutAgent } from "../agents/clinical-scout.js";
import { hawkAgent } from "../agents/hawk.js";
import { librarianAgent } from "../agents/librarian.js";

export const mastra = new Mastra({
  agents: {
    plannerAgent,
    biologistAgent,
    clinicalScoutAgent,
    hawkAgent,
    librarianAgent,
  },
});
