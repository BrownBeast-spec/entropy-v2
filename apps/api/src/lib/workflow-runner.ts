import { mastra } from "@entropy/mastra-app/src/mastra/index.js";
import { HitlResumeSchema } from "@entropy/mastra-app/src/schemas/hitl.js";
import {
  getSession,
  updateSession,
  type SessionState,
} from "../store/session-store.js";
import type { WorkflowRunStatus, Run } from "@mastra/core/workflows";

type RunState = {
  run: Run;
  status: WorkflowRunStatus;
};

const activeRuns = new Map<string, RunState>();

const agentIds = new Set([
  "planner",
  "biologist",
  "clinical-scout",
  "hawk-safety",
  "librarian",
  "gap-analyst",
  "verifier",
]);

const updateAgentStatus = (
  session: SessionState,
  agentId: string,
  status: "pending" | "running" | "completed" | "failed",
) => {
  const agent = session.agents[agentId as keyof SessionState["agents"]];
  if (!agent) return;
  agent.status = status;
};

const updateFromStepResult = (
  sessionId: string,
  stepId: string,
  status: "success" | "failed" | "suspended",
) => {
  const session = getSession(sessionId);
  if (!session) return;

  if (agentIds.has(stepId)) {
    updateAgentStatus(
      session,
      stepId,
      status === "success" ? "completed" : "failed",
    );
  }

  updateSession(sessionId, { agents: session.agents });
};

export const workflowRunner = {
  async start(query: string, sessionId: string) {
    const workflow = mastra.getWorkflow("researchPipelineWorkflow");
    const run = await workflow.createRun({ runId: sessionId });

    activeRuns.set(sessionId, { run, status: "running" });

    run.watch((event) => {
      if (event.type === "workflow-step-start") {
        const stepId = event.payload.id;
        if (agentIds.has(stepId)) {
          const session = getSession(sessionId);
          if (!session) return;
          updateAgentStatus(session, stepId, "running");
          updateSession(sessionId, { agents: session.agents });
        }
      }

      if (event.type === "workflow-step-result") {
        updateFromStepResult(sessionId, event.payload.id, event.payload.status);
      }

      if (event.type === "workflow-step-suspended") {
        updateFromStepResult(sessionId, event.payload.id, event.payload.status);
      }
    });

    const result = await run.start({ inputData: { prompt: query } });

    if (result.status === "suspended") {
      updateSession(sessionId, { status: "suspended" });
      activeRuns.set(sessionId, { run, status: "suspended" });
      return;
    }

    if (result.status === "success") {
      updateSession(sessionId, {
        status: "completed",
        result: result.result,
        reportTexPath: result.result.texPath,
        reportPdfPath: result.result.pdfPath,
      });
      activeRuns.set(sessionId, { run, status: "success" });
      return;
    }

    updateSession(sessionId, {
      status: "failed",
      result: result.status === "failed" ? result.error : result,
    });
    activeRuns.set(sessionId, { run, status: result.status });
  },

  async resume(sessionId: string, payload: unknown) {
    const parsed = HitlResumeSchema.parse(payload);
    const active = activeRuns.get(sessionId);
    if (!active) {
      throw new Error(`No active workflow run for session ${sessionId}`);
    }
    const run = active.run;

    const result = await run.resume({
      step: "human-review",
      resumeData: parsed,
    });

    if (result.status === "success") {
      updateSession(sessionId, {
        status: "completed",
        result: result.result,
        reportTexPath: result.result.texPath,
        reportPdfPath: result.result.pdfPath,
      });
      activeRuns.set(sessionId, { run, status: "success" });
      return;
    }

    updateSession(sessionId, {
      status: "failed",
      result: result.status === "failed" ? result.error : result,
    });
  },

  getRun(sessionId: string) {
    return activeRuns.get(sessionId)?.run ?? null;
  },
};
