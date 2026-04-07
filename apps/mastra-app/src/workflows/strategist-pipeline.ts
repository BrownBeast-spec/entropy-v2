import { createWorkflow, createStep } from "@mastra/core/workflows";
import { z } from "zod";
import { strategistPlannerAgent } from "../agents/strategist-planner.js";
import { patentStrategistAgent } from "../agents/patent-strategist.js";
import { commercialAnalystAgent } from "../agents/commercial-analyst.js";
import { pipelineCiAnalystAgent } from "../agents/pipeline-ci-analyst.js";
import { strategistSynthesizerAgent } from "../agents/strategist-synthesizer.js";
import { sanitizeAgentOutput } from "../lib/sanitize-agent-output.js";

const StrategistPlannerOutputSchema = z.object({
  originalQuery: z.string(),
  rationale: z.string(),
  patentQuery: z.string(),
  commercialQuery: z.string(),
  pipelineQuery: z.string(),
});

type StrategistPlannerOutput = z.infer<typeof StrategistPlannerOutputSchema>;

const plannerStep = createStep(strategistPlannerAgent, {
  structuredOutput: { schema: StrategistPlannerOutputSchema },
});

const patentStep = createStep(patentStrategistAgent, { maxSteps: 10 });
const commercialStep = createStep(commercialAnalystAgent, { maxSteps: 10 });
const pipelineStep = createStep(pipelineCiAnalystAgent, { maxSteps: 10 });

const parallelResultsSchema = z.object({
  "patent-strategist": z.any(),
  "commercial-analyst": z.any(),
  "pipeline-ci-analyst": z.any(),
});

type StepResultLike = {
  status?: "success" | "failed";
  output?: { text?: string };
  text?: string;
  error?: unknown;
};

const formatOutput = (result: StepResultLike | undefined): string => {
  if (result?.status === "failed") {
    return `Error: ${result.error}`;
  }
  return sanitizeAgentOutput(result?.output?.text ?? result?.text ?? "");
};

const mergeStep = createStep({
  id: "merge-strategist-evidence",
  inputSchema: parallelResultsSchema,
  outputSchema: z.object({
    patentEvidence: z.string(),
    commercialEvidence: z.string(),
    pipelineEvidence: z.string(),
    rationale: z.string(),
    originalQuery: z.string(),
  }),
  execute: async ({ inputData, getStepResult }) => {
    const plannerResult = getStepResult<StrategistPlannerOutput>("strategist-planner");
    
    return {
      patentEvidence: formatOutput(inputData["patent-strategist"] as StepResultLike),
      commercialEvidence: formatOutput(inputData["commercial-analyst"] as StepResultLike),
      pipelineEvidence: formatOutput(inputData["pipeline-ci-analyst"] as StepResultLike),
      rationale: plannerResult.rationale,
      originalQuery: plannerResult.originalQuery,
    };
  },
});

const synthesizerStep = createStep(strategistSynthesizerAgent, { maxSteps: 5 });

export const strategistPipelineWorkflow = createWorkflow({
  id: "strategist-pipeline",
  inputSchema: z.object({ prompt: z.string() }),
  outputSchema: z.object({ result: z.any() }),
})
  .then(
    createStep({
      id: "prepare-prompt",
      inputSchema: z.object({ prompt: z.string() }),
      outputSchema: z.object({ prompt: z.string() }),
      execute: async ({ inputData }) => {
        return inputData;
      },
    })
  )
  .then(plannerStep)
  .map(async ({ inputData }) => {
    const plannerResult = inputData as StrategistPlannerOutput;
    
    // Send a combined prompt so each agent knows its task
    const prompt = [
      "Original Business Query:",
      plannerResult.originalQuery,
      "",
      "--- Patents & IP Task ---",
      plannerResult.patentQuery,
      "",
      "--- Commercial Analysis Task ---",
      plannerResult.commercialQuery,
      "",
      "--- Pipeline Analysis Task ---",
      plannerResult.pipelineQuery,
      "",
      "Use only the task relevant to your role."
    ].join("\\n");
    
    return { prompt };
  })
  .parallel([patentStep, commercialStep, pipelineStep])
  .then(mergeStep)
  .map(async ({ inputData }) => {
    const merged = inputData;
    const prompt = [
      "Original Business Query:",
      merged.originalQuery,
      "",
      "Synthesis Rationale:",
      merged.rationale,
      "",
      "--- Patent Analysis Evidence ---",
      merged.patentEvidence,
      "",
      "--- Commercial Analysis Evidence ---",
      merged.commercialEvidence,
      "",
      "--- Pipeline Analysis Evidence ---",
      merged.pipelineEvidence,
      "",
      "Synthesize the above into the final Markdown dossier."
    ].join("\\n");
    return { prompt };
  })
  .then(synthesizerStep)
  .map(async ({ inputData }) => {
    return { result: formatOutput(inputData as StepResultLike) };
  })
  .commit();
