import "dotenv/config";
import { Mastra } from "@mastra/core";
import { plannerAgent } from "../agents/planner.js";
import { biologistAgent } from "../agents/biologist.js";
import { clinicalScoutAgent } from "../agents/clinical-scout.js";
import { hawkAgent } from "../agents/hawk.js";
import { librarianAgent } from "../agents/librarian.js";
import { gapAnalystAgent } from "../agents/gap-analyst.js";
import { verifierAgent } from "../agents/verifier.js";
import { researchPipelineWorkflow } from "../workflows/research-pipeline.js";
import { getAuditStore, isAuditEnabled } from "../lib/audit.js";

export const mastra = new Mastra({
  agents: {
    plannerAgent,
    biologistAgent,
    clinicalScoutAgent,
    hawkAgent,
    librarianAgent,
    gapAnalystAgent,
    verifierAgent,
  },
  workflows: {
    researchPipelineWorkflow,
  },
});

if (isAuditEnabled()) {
  getAuditStore()
    .migrate()
    .catch((err) =>
      console.warn(
        "Audit migration failed:",
        err instanceof Error ? err.message : err,
      ),
    );
}
