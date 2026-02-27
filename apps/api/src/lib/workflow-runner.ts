import { mastra } from "@entropy/mastra-app/src/mastra/index.js";
import { HitlResumeSchema } from "@entropy/mastra-app/src/schemas/hitl.js";
import { getSession, updateSession } from "../store/session-store.js";
import type { SessionState } from "../types.js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type WorkflowRun = Awaited<
  ReturnType<ReturnType<typeof mastra.getWorkflow>["createRun"]>
>;

type RunStatus = "running" | "suspended" | "success" | "failed";

type RunState = {
  run: WorkflowRun;
  status: RunStatus;
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
  status: string,
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

    const safeStringify = (value: unknown) => {
      try {
        return JSON.stringify(value, null, 2);
      } catch (err) {
        return `"[unserializable: ${err instanceof Error ? err.message : String(err)}]"`;
      }
    };

    activeRuns.set(sessionId, { run, status: "running" });

    run.watch(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (event: any) => {
        if (event.type === "workflow-step-start") {
          const stepId = event.payload.id;
          console.log(
            `[workflow-runner] step:start ${stepId ?? "unknown"} session=${sessionId}`,
          );
          if (agentIds.has(stepId)) {
            const session = getSession(sessionId);
            if (!session) return;
            updateAgentStatus(session, stepId, "running");
            updateSession(sessionId, { agents: session.agents });
          }
        }

        if (event.type === "workflow-step-result") {
          console.log(
            `[workflow-runner] step:result ${event.payload?.id ?? "unknown"} status=${event.payload?.status ?? "unknown"} session=${sessionId}`,
          );
          console.log(
            `[workflow-runner] step:output ${event.payload?.id ?? "unknown"} session=${sessionId} ${safeStringify(event.payload?.output ?? event.payload?.result ?? event.payload)}`,
          );
          updateFromStepResult(
            sessionId,
            event.payload.id,
            event.payload.status,
          );
        }

        if (event.type === "workflow-step-suspended") {
          console.log(
            `[workflow-runner] step:suspended ${event.payload?.id ?? "unknown"} status=${event.payload?.status ?? "unknown"} session=${sessionId}`,
          );
          updateFromStepResult(
            sessionId,
            event.payload.id,
            event.payload.status,
          );
        }

        if (typeof event.type === "string" && event.type.includes("tool")) {
          const toolName =
            event.payload?.toolName ?? event.payload?.name ?? event.payload?.id;
          console.log(
            `[workflow-runner] tool:${event.type} ${toolName ?? "unknown"} session=${sessionId}`,
          );
        }
      },
    );

    const result = await run.start({ inputData: { prompt: query } });

    if (result.status === "suspended") {
      updateSession(sessionId, { status: "suspended" });
      activeRuns.set(sessionId, { run, status: "suspended" });
      return;
    }

    if (result.status === "success") {
      const output = result.result as { texPath?: string; pdfPath?: string };
      updateSession(sessionId, {
        status: "completed",
        result: result.result,
        reportTexPath: output.texPath,
        reportPdfPath: output.pdfPath,
      });
      activeRuns.set(sessionId, { run, status: "success" });
      return;
    }

    updateSession(sessionId, {
      status: "failed",
      result: result.status === "failed" ? result.error : result,
    });
    activeRuns.set(sessionId, { run, status: result.status as RunStatus });
  },

  async resume(sessionId: string, payload: unknown) {
    const parsed = HitlResumeSchema.parse(payload);
    const active = activeRuns.get(sessionId);
    if (!active) {
      throw new Error(`No active workflow run for session ${sessionId}`);
    }
    const { run } = active;

    const result = await run.resume({
      step: "human-review",
      resumeData: parsed,
    });

    if (result.status === "success") {
      const output = result.result as { texPath?: string; pdfPath?: string };
      updateSession(sessionId, {
        status: "completed",
        result: result.result,
        reportTexPath: output.texPath,
        reportPdfPath: output.pdfPath,
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
