import { mastra } from "@entropy/mastra-app/src/mastra/index.js";
import { HitlResumeSchema } from "@entropy/mastra-app/src/schemas/hitl.js";
import { getSession, updateSession, appendLog } from "../store/session-store.js";
import { activityBus } from "./activity-bus.js";
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

let counter = 0;
function nextId() {
  return String(++counter);
}

/** Publish an event to both the live bus and the persistent session log. */
function publish(
  sessionId: string,
  partial: Omit<SessionState["log"][number], "id" | "ts">,
) {
  const event = {
    ...partial,
    id: nextId(),
    ts: Date.now(),
  };
  appendLog(sessionId, event);
  activityBus.emit(sessionId, event);
}

const updateAgentStatus = (
  session: SessionState,
  agentId: string,
  status: "pending" | "running" | "completed" | "failed",
) => {
  const agent = session.agents[agentId as keyof SessionState["agents"]];
  if (!agent) return;
  agent.status = status;
};

const TOOL_ICONS: Record<string, string> = {
  validate_target: "🎯",
  get_disease_info: "🧬",
  get_gene_info: "🔬",
  get_variation: "🔀",
  get_homology: "🧬",
  search_studies: "🏥",
  search_literature: "📚",
  search_preprints: "📄",
  check_drug_safety: "⚠️",
  check_adverse_events: "🚨",
  check_recalls: "⛔",
  get_compound_props: "⚗️",
  search_chembl: "🔭",
  get_bioassays: "🧪",
  searchPubMed: "📖",
  search_pubmed: "📖",
};

function toolIcon(toolName: string): string {
  return TOOL_ICONS[toolName] ?? "🔧";
}

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
        const stepId: string = event.payload?.id ?? "unknown";

        // ── Step started ────────────────────────────────────────
        if (event.type === "workflow-step-start") {
          console.log(
            `[workflow-runner] step:start ${stepId} session=${sessionId}`,
          );

          if (agentIds.has(stepId)) {
            const session = getSession(sessionId);
            if (session) {
              updateAgentStatus(session, stepId, "running");
              updateSession(sessionId, { agents: session.agents });
            }
            publish(sessionId, {
              type: "step:start",
              agentId: stepId,
              message: `${stepId} agent started`,
            });
          }
        }

        // ── Step result ─────────────────────────────────────────
        if (event.type === "workflow-step-result") {
          const status: string = event.payload?.status ?? "unknown";
          console.log(
            `[workflow-runner] step:result ${stepId} status=${status} session=${sessionId}`,
          );

          if (agentIds.has(stepId)) {
            const session = getSession(sessionId);
            if (session) {
              updateAgentStatus(
                session,
                stepId,
                status === "success" ? "completed" : "failed",
              );
              updateSession(sessionId, { agents: session.agents });
            }

            const outputRaw = event.payload?.output ?? event.payload?.result;
            let detail: string | undefined;
            if (outputRaw) {
              const str = safeStringify(outputRaw);
              detail = str.length > 400 ? str.slice(0, 400) + "…" : str;
            }

            publish(sessionId, {
              type: status === "success" ? "step:done" : "step:fail",
              agentId: stepId,
              message:
                status === "success"
                  ? `${stepId} completed`
                  : `${stepId} failed`,
              detail,
            });
          }
        }

        // ── Step suspended (HITL) ───────────────────────────────
        if (event.type === "workflow-step-suspended") {
          console.log(
            `[workflow-runner] step:suspended ${stepId} session=${sessionId}`,
          );
          publish(sessionId, {
            type: "hitl:suspended",
            agentId: "pipeline",
            message: "Pipeline paused — awaiting human review",
          });
        }

        // ── Tool calls ──────────────────────────────────────────
        if (typeof event.type === "string" && event.type.includes("tool")) {
          const toolName =
            event.payload?.toolName ??
            event.payload?.name ??
            event.payload?.id ??
            "unknown";
          const parentStep =
            event.payload?.stepId ?? event.payload?.agentId ?? "pipeline";

          console.log(
            `[workflow-runner] tool:${event.type} ${toolName} session=${sessionId}`,
          );

          if (event.type.includes("start") || event.type.includes("call")) {
            const args = event.payload?.args ?? event.payload?.input;
            let argsStr: string | undefined;
            if (args) {
              const s = safeStringify(args);
              argsStr = s.length > 200 ? s.slice(0, 200) + "…" : s;
            }
            publish(sessionId, {
              type: "tool:call",
              agentId: parentStep,
              toolName,
              message: `${toolIcon(toolName)} Calling ${toolName}`,
              detail: argsStr,
            });
          } else if (
            event.type.includes("result") ||
            event.type.includes("end")
          ) {
            const result = event.payload?.result ?? event.payload?.output;
            let resultStr: string | undefined;
            if (result !== undefined) {
              const s = safeStringify(result);
              resultStr = s.length > 300 ? s.slice(0, 300) + "…" : s;
            }
            publish(sessionId, {
              type: "tool:result",
              agentId: parentStep,
              toolName,
              message: `${toolIcon(toolName)} ${toolName} returned`,
              detail: resultStr,
            });
          }
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
      publish(sessionId, {
        type: "pipeline:done",
        agentId: "pipeline",
        message: "✅ Research pipeline completed — report ready",
      });
      activeRuns.set(sessionId, { run, status: "success" });
      activityBus.drain(sessionId);
      return;
    }

    updateSession(sessionId, {
      status: "failed",
      result: result.status === "failed" ? result.error : result,
    });
    publish(sessionId, {
      type: "pipeline:fail",
      agentId: "pipeline",
      message: "❌ Pipeline failed",
      detail:
        result.status === "failed" ? String(result.error) : undefined,
    });
    activeRuns.set(sessionId, { run, status: result.status as RunStatus });
    activityBus.drain(sessionId);
  },

  async resume(sessionId: string, payload: unknown) {
    const parsed = HitlResumeSchema.parse(payload);
    const active = activeRuns.get(sessionId);
    if (!active) {
      throw new Error(`No active workflow run for session ${sessionId}`);
    }
    const { run } = active;

    publish(sessionId, {
      type: "step:start",
      agentId: "pipeline",
      message: `Human review ${parsed.approved ? "approved ✅" : "rejected ❌"} — resuming pipeline`,
    });

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
      publish(sessionId, {
        type: "pipeline:done",
        agentId: "pipeline",
        message: "✅ Research pipeline completed — report ready",
      });
      activityBus.drain(sessionId);
      activeRuns.set(sessionId, { run, status: "success" });
      return;
    }

    updateSession(sessionId, {
      status: "failed",
      result: result.status === "failed" ? result.error : result,
    });
    activityBus.drain(sessionId);
  },

  getRun(sessionId: string) {
    return activeRuns.get(sessionId)?.run ?? null;
  },
};
