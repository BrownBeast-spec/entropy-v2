import "dotenv/config";
import { Mastra } from "@mastra/core";
import { InMemoryStore } from "@mastra/core/storage";
import { plannerAgent } from "../agents/planner.js";
import { biologistAgent } from "../agents/biologist.js";
import { clinicalScoutAgent } from "../agents/clinical-scout.js";
import { hawkAgent } from "../agents/hawk.js";
import { librarianAgent } from "../agents/librarian.js";
import { gapAnalystAgent } from "../agents/gap-analyst.js";
import { verifierAgent } from "../agents/verifier.js";
import { queryPlannerAgent } from "../agents/query-planner.js";
import { evidenceSummarizerAgent } from "../agents/evidence-summarizer.js";
import { strategistPlannerAgent } from "../agents/strategist-planner.js";
import { patentStrategistAgent } from "../agents/patent-strategist.js";
import { commercialAnalystAgent } from "../agents/commercial-analyst.js";
import { pipelineCiAnalystAgent } from "../agents/pipeline-ci-analyst.js";
import { strategistSynthesizerAgent } from "../agents/strategist-synthesizer.js";
import { researchPipelineWorkflow } from "../workflows/research-pipeline.js";
import { graphSynthesisPipeline } from "../workflows/graph-synthesis-pipeline.js";
import { strategistPipelineWorkflow } from "../workflows/strategist-pipeline.js";
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
    queryPlannerAgent,
    evidenceSummarizerAgent,
    strategistPlannerAgent,
    patentStrategistAgent,
    commercialAnalystAgent,
    pipelineCiAnalystAgent,
    strategistSynthesizerAgent,
  },
  workflows: {
    researchPipelineWorkflow,
    graphSynthesisPipeline,
    strategistPipelineWorkflow,
  },
  storage: new InMemoryStore({ id: "entropy-storage" }),
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
