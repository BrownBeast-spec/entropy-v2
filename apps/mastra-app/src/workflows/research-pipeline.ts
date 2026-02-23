import { createWorkflow, createStep } from "@mastra/core/workflows";
import { z } from "zod";
import { plannerAgent } from "../agents/planner.js";
import { biologistAgent } from "../agents/biologist.js";
import { clinicalScoutAgent } from "../agents/clinical-scout.js";
import { hawkAgent } from "../agents/hawk.js";
import { librarianAgent } from "../agents/librarian.js";
import { gapAnalystAgent } from "../agents/gap-analyst.js";
import {
  PlannerOutputSchema,
  type PlannerOutput,
} from "../schemas/planner-output.js";
import {
  EvidenceSchema,
  type Evidence,
  type AgentEvidence,
} from "../schemas/evidence.js";
import { GapAnalysisSchema } from "../schemas/gap-analysis.js";
import { DEFAULT_TPP_CHECKLIST } from "../lib/tpp-checklist.js";

const plannerStep = createStep(plannerAgent, {
  structuredOutput: { schema: PlannerOutputSchema },
});

const biologistStep = createStep(biologistAgent);
const clinicalScoutStep = createStep(clinicalScoutAgent);
const hawkStep = createStep(hawkAgent);
const librarianStep = createStep(librarianAgent);

const gapAnalystStep = createStep(gapAnalystAgent, {
  structuredOutput: { schema: GapAnalysisSchema },
});

const parallelResultsSchema = z.object({
  biologist: z.any(),
  "clinical-scout": z.any(),
  "hawk-safety": z.any(),
  librarian: z.any(),
});

type StepResultLike = {
  status?: "success" | "failed";
  output?: { text?: string };
  text?: string;
  error?: unknown;
};

const formatError = (error: unknown) => {
  if (!error) {
    return undefined;
  }

  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  try {
    return JSON.stringify(error);
  } catch {
    return "Unknown error";
  }
};

const toAgentEvidence = (
  agentId: string,
  result: StepResultLike | undefined,
  timestamp: string,
): AgentEvidence => {
  if (result?.status === "failed") {
    return {
      agentId,
      status: "failure",
      content: "",
      error: formatError(result.error),
      timestamp,
    };
  }

  const text = result?.output?.text ?? result?.text ?? "";
  const status = text ? "success" : "failure";

  return {
    agentId,
    status,
    content: text,
    error: status === "failure" ? formatError(result?.error) : undefined,
    timestamp,
  };
};

const buildParallelPrompt = (plannerOutput: PlannerOutput) => {
  const getTasks = (
    agentId: PlannerOutput["subTasks"][number]["targetAgent"],
  ) =>
    plannerOutput.subTasks
      .filter((task) => task.targetAgent === agentId)
      .map((task) => `- (${task.id}, priority: ${task.priority}) ${task.query}`)
      .join("\n") || "- No assigned tasks";

  return [
    `Original query: ${plannerOutput.originalQuery}`,
    "PICO breakdown:",
    `- Population: ${plannerOutput.ppicoBreakdown.population}`,
    `- Intervention: ${plannerOutput.ppicoBreakdown.intervention}`,
    `- Comparison: ${plannerOutput.ppicoBreakdown.comparison}`,
    `- Outcome: ${plannerOutput.ppicoBreakdown.outcome}`,
    "",
    "Assigned tasks by agent:",
    "Biologist:",
    getTasks("biologist"),
    "",
    "Clinical Scout:",
    getTasks("clinical-scout"),
    "",
    "Hawk Safety:",
    getTasks("hawk-safety"),
    "",
    "Librarian:",
    getTasks("librarian"),
    "",
    "Use only the tasks for your agent id and return your specialized analysis.",
  ].join("\n");
};

export const buildEvidence = (params: {
  plannerResult: PlannerOutput;
  parallelResults: z.infer<typeof parallelResultsSchema>;
  timestamp?: string;
}): Evidence => {
  const now = params.timestamp ?? new Date().toISOString();

  return {
    query: params.plannerResult.originalQuery,
    ppicoBreakdown: params.plannerResult.ppicoBreakdown,
    plannerRationale: params.plannerResult.rationale,
    agents: {
      biologist: toAgentEvidence(
        "biologist",
        params.parallelResults.biologist as StepResultLike,
        now,
      ),
      clinicalScout: toAgentEvidence(
        "clinical-scout",
        params.parallelResults["clinical-scout"] as StepResultLike,
        now,
      ),
      hawk: toAgentEvidence(
        "hawk-safety",
        params.parallelResults["hawk-safety"] as StepResultLike,
        now,
      ),
      librarian: toAgentEvidence(
        "librarian",
        params.parallelResults.librarian as StepResultLike,
        now,
      ),
    },
    completedAt: now,
  };
};

const mergeEvidenceStep = createStep({
  id: "merge-evidence",
  inputSchema: parallelResultsSchema,
  outputSchema: EvidenceSchema,
  execute: async ({ inputData, getStepResult }) => {
    const plannerResult = getStepResult<PlannerOutput>("planner");

    return buildEvidence({
      plannerResult,
      parallelResults: inputData,
    });
  },
});

const buildGapAnalystPrompt = (evidence: Evidence) =>
  [
    "TPP Checklist:",
    JSON.stringify(DEFAULT_TPP_CHECKLIST, null, 2),
    "",
    "Merged Evidence:",
    JSON.stringify(evidence, null, 2),
  ].join("\n");

export const researchPipelineWorkflow = createWorkflow({
  id: "research-pipeline",
  inputSchema: z.object({ prompt: z.string() }),
  outputSchema: GapAnalysisSchema,
})
  .then(plannerStep)
  .map(async ({ inputData }) => ({
    prompt: buildParallelPrompt(inputData),
  }))
  .parallel([biologistStep, clinicalScoutStep, hawkStep, librarianStep])
  .then(mergeEvidenceStep)
  .map(async ({ inputData }) => ({
    prompt: buildGapAnalystPrompt(inputData),
  }))
  .then(gapAnalystStep)
  .commit();
