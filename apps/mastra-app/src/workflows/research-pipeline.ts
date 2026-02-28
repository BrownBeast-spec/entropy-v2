import { createWorkflow, createStep } from "@mastra/core/workflows";
import { z } from "zod";
import { plannerAgent } from "../agents/planner.js";
import { biologistAgent } from "../agents/biologist.js";
import { clinicalScoutAgent } from "../agents/clinical-scout.js";
import { hawkAgent } from "../agents/hawk.js";
import { librarianAgent } from "../agents/librarian.js";
import { gapAnalystAgent } from "../agents/gap-analyst.js";
import { verifierAgent } from "../agents/verifier.js";
import {
  PlannerOutputSchema,
  type PlannerOutput,
} from "../schemas/planner-output.js";
import {
  EvidenceSchema,
  type Evidence,
  type AgentEvidence,
} from "../schemas/evidence.js";
import {
  GapAnalysisSchema,
  type GapAnalysis,
} from "../schemas/gap-analysis.js";
import { VerificationReportSchema } from "../schemas/verification-report.js";
import {
  HitlResumeSchema,
  HitlOutputSchema,
  type HitlOutput,
} from "../schemas/hitl.js";
import { DEFAULT_TPP_CHECKLIST } from "../lib/tpp-checklist.js";
import { renderHtmlReport } from "../report/render-html.js";
import { compilePdf } from "../report/compile-pdf.js";
import {
  clearCurrentSessionId,
  getAuditStore,
  getCurrentSessionId,
  setCurrentSessionId,
} from "../lib/audit.js";
import { sanitizeAgentOutput } from "../lib/sanitize-agent-output.js";

const auditStore = getAuditStore();
const promptCache: Record<string, string> = {};

/** Fire-and-forget audit call — logs warning on failure, never throws */
const safeAudit = async <T>(fn: () => Promise<T>, fallback: T): Promise<T> => {
  try {
    return await fn();
  } catch (err) {
    console.warn("[audit] operation failed (degrading gracefully):", err);
    return fallback;
  }
};

const plannerStep = createStep(plannerAgent, {
  structuredOutput: { schema: PlannerOutputSchema },
});

const biologistStep = createStep(biologistAgent, { maxSteps: 10 });
const clinicalScoutStep = createStep(clinicalScoutAgent, { maxSteps: 10 });
const hawkStep = createStep(hawkAgent, { maxSteps: 10 });
const librarianStep = createStep(librarianAgent, { maxSteps: 10 });

const gapAnalystStep = createStep(gapAnalystAgent, {
  structuredOutput: { schema: GapAnalysisSchema },
});

const verifierStep = createStep(verifierAgent, {
  maxSteps: 15,
  structuredOutput: { schema: VerificationReportSchema },
});

const humanReviewStep = createStep({
  id: "human-review",
  inputSchema: VerificationReportSchema,
  outputSchema: HitlOutputSchema,
  resumeSchema: HitlResumeSchema,
  suspendSchema: z.object({
    dossier_preview: z.string(),
  }),
  execute: async ({ inputData, resumeData, suspend }) => {
    const { approved, reviewer, notes } = resumeData ?? {};

    // First execution: suspend and surface the verification report for review
    if (approved === undefined) {
      return await suspend({
        dossier_preview: JSON.stringify(inputData, null, 2),
      });
    }

    // Resumed: return the decision
    const sessionId = getCurrentSessionId() ?? undefined;
    await safeAudit(
      () =>
        auditStore.logHitlDecision({
          sessionId,
          reviewer: reviewer ?? "unknown",
          approved,
          annotations: notes ? { notes } : undefined,
        }),
      "noop-hitl-record",
    );

    return {
      approved,
      reviewer: reviewer ?? "unknown",
      notes: notes ?? "",
      verificationReport: inputData,
    };
  },
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

  const raw = result?.output?.text ?? result?.text ?? "";
  const text = sanitizeAgentOutput(raw);
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
    const sessionId = getCurrentSessionId() ?? undefined;
    const prompt = promptCache.parallel ?? "";
    await safeAudit(
      () =>
        Promise.all([
          auditStore.logAgentTrace({
            sessionId,
            agentId: "biologist",
            input: { prompt },
            output: (inputData.biologist ?? {}) as Record<string, unknown>,
          }),
          auditStore.logAgentTrace({
            sessionId,
            agentId: "clinical-scout",
            input: { prompt },
            output: (inputData["clinical-scout"] ?? {}) as Record<
              string,
              unknown
            >,
          }),
          auditStore.logAgentTrace({
            sessionId,
            agentId: "hawk-safety",
            input: { prompt },
            output: (inputData["hawk-safety"] ?? {}) as Record<string, unknown>,
          }),
          auditStore.logAgentTrace({
            sessionId,
            agentId: "librarian",
            input: { prompt },
            output: (inputData.librarian ?? {}) as Record<string, unknown>,
          }),
        ]),
      undefined as unknown as [string, string, string, string],
    );

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

export const ReportOutputSchema = z.object({
  hitlOutput: HitlOutputSchema,
  htmlPath: z.string(),
  pdfPath: z.string(),
  pdfSuccess: z.boolean(),
  pdfError: z.string().optional(),
});

export type ReportOutput = z.infer<typeof ReportOutputSchema>;

const reportStep = createStep({
  id: "generate-report",
  inputSchema: HitlOutputSchema,
  outputSchema: ReportOutputSchema,
  execute: async ({ inputData, getStepResult }) => {
    const hitl = inputData as HitlOutput;
    const evidence = getStepResult<Evidence>("merge-evidence");
    const gapAnalysis = getStepResult<GapAnalysis>("gap-analyst");

    const reportSessionId = `report-${Date.now()}`;

    const reportInput = {
      query: evidence.query,
      evidence,
      gapAnalysis,
      verificationReport: hitl.verificationReport,
      reviewerDecision: {
        approved: hitl.approved,
        reviewer: hitl.reviewer,
        notes: hitl.notes,
      },
      metadata: {
        sessionId: reportSessionId,
        timestamp: new Date().toISOString(),
      },
    };

    // Render to HTML, then compile to PDF via Puppeteer (no LaTeX needed).
    const html = renderHtmlReport(reportInput);
    const pdfResult = await compilePdf(html, reportSessionId);

    if (!pdfResult.success) {
      console.error(`[report-step] PDF compilation failed: ${pdfResult.error}`);
    }

    // htmlPath is written alongside the PDF by compilePdf()
    const htmlPath = pdfResult.outputPath.replace(/\.pdf$/, ".html");

    const sessionId = getCurrentSessionId() ?? undefined;
    if (sessionId) {
      await safeAudit(
        () => auditStore.updateSessionStatus(sessionId, "completed"),
        undefined,
      );
      clearCurrentSessionId();
    }

    return {
      hitlOutput: hitl,
      htmlPath,
      pdfPath: pdfResult.outputPath,
      pdfSuccess: pdfResult.success,
      pdfError: pdfResult.error,
    };
  },
});

export const researchPipelineWorkflow = createWorkflow({
  id: "research-pipeline",
  inputSchema: z.object({ prompt: z.string() }),
  outputSchema: ReportOutputSchema,
})
  .then(
    createStep({
      id: "audit-session",
      inputSchema: z.object({ prompt: z.string() }),
      outputSchema: z.object({ prompt: z.string() }),
      execute: async ({ inputData }) => {
        const sessionId = await safeAudit(
          () => auditStore.createSession({ query: inputData.prompt }),
          `noop-session-${Date.now()}`,
        );
        setCurrentSessionId(sessionId);
        await safeAudit(
          () => auditStore.updateSessionStatus(sessionId, "running"),
          undefined,
        );
        promptCache.planner = inputData.prompt;
        return inputData;
      },
    }),
  )
  .then(plannerStep)
  .map(async ({ inputData }) => {
    const sessionId = getCurrentSessionId() ?? undefined;
    await safeAudit(
      () =>
        auditStore.logAgentTrace({
          sessionId,
          agentId: "planner",
          input: { prompt: promptCache.planner ?? "" },
          output: inputData as Record<string, unknown>,
        }),
      "noop-agent-trace",
    );
    const prompt = buildParallelPrompt(inputData);
    promptCache.parallel = prompt;
    return { prompt };
  })
  .parallel([biologistStep, clinicalScoutStep, hawkStep, librarianStep])
  .then(mergeEvidenceStep)
  .map(async ({ inputData }) => {
    const prompt = buildGapAnalystPrompt(inputData);
    promptCache["gap-analyst"] = prompt;
    return { prompt };
  })
  .then(gapAnalystStep)
  .map(async ({ inputData, getStepResult }) => {
    const sessionId = getCurrentSessionId() ?? undefined;
    await safeAudit(
      () =>
        auditStore.logAgentTrace({
          sessionId,
          agentId: "gap-analyst",
          input: { prompt: promptCache["gap-analyst"] ?? "" },
          output: inputData as Record<string, unknown>,
        }),
      "noop-agent-trace",
    );
    const evidence = getStepResult<Evidence>("merge-evidence");
    const prompt = [
      "Gap Analysis Report:",
      JSON.stringify(inputData, null, 2),
      "",
      "Original Evidence:",
      JSON.stringify(evidence, null, 2),
    ].join("\n");
    promptCache.verifier = prompt;
    return {
      prompt,
    };
  })
  .then(verifierStep)
  .map(async ({ inputData }) => {
    const sessionId = getCurrentSessionId() ?? undefined;
    await safeAudit(
      () =>
        auditStore.logAgentTrace({
          sessionId,
          agentId: "verifier",
          input: { prompt: promptCache.verifier ?? "" },
          output: inputData as Record<string, unknown>,
        }),
      "noop-agent-trace",
    );
    return inputData;
  })
  .then(humanReviewStep)
  .then(reportStep)
  .commit();
