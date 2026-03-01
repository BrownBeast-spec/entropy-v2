import { mastra } from "@entropy/mastra-app/src/mastra/index.js";
import { HitlResumeSchema } from "@entropy/mastra-app/src/schemas/hitl.js";
import { sessionContext } from "@entropy/mastra-app/src/lib/session-context.js";
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
  const event = { ...partial, id: nextId(), ts: Date.now() };
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

    const safeStringify = (value: unknown, maxLen = 400) => {
      try {
        const s = JSON.stringify(value, null, 2);
        return s.length > maxLen ? s.slice(0, maxLen) + "…" : s;
      } catch (err) {
        return `"[unserializable: ${err instanceof Error ? err.message : String(err)}]"`;
      }
    };

    const contextHooks = {
      sessionId,
      onToolCall: (agentId: string, toolName: string, args: unknown) => {
        console.log(
          `[workflow-runner] tool:call ${toolName} agent=${agentId} session=${sessionId}`,
        );
        publish(sessionId, {
          type: "tool:call",
          agentId,
          toolName,
          message: `${toolIcon(toolName)} Calling ${toolName}`,
          detail: safeStringify(args, 300),
        });
      },
      onToolResult: (agentId: string, toolName: string, result: unknown) => {
        publish(sessionId, {
          type: "tool:result",
          agentId,
          toolName,
          message: `${toolIcon(toolName)} ${toolName} returned`,
          detail: safeStringify(result, 400),
        });
      },
    };

    activeRuns.set(sessionId, { run, status: "running" });

    // Subscribe to workflow step events (step-start / step-result / etc.)
    run.watch(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (event: any) => {
        const stepId: string = event.payload?.id ?? "unknown";

        // ── Step started ──────────────────────────────────────────────────
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

        // ── Step result ───────────────────────────────────────────────────
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
            publish(sessionId, {
              type: status === "success" ? "step:done" : "step:fail",
              agentId: stepId,
              message:
                status === "success"
                  ? `${stepId} completed`
                  : `${stepId} failed`,
              detail: outputRaw ? safeStringify(outputRaw) : undefined,
            });
          }
        }

        // ── Step suspended (HITL) ─────────────────────────────────────────
        if (event.type === "workflow-step-suspended") {
          console.log(
            `[workflow-runner] step:suspended ${stepId} session=${sessionId}`,
          );
          // Log full event to diagnose the correct suspend-payload path
          console.log(
            "[workflow-runner] full suspend event:",
            JSON.stringify(event, null, 2).slice(0, 2000),
          );

          // Try several payload paths — Mastra's event shape varies by version
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const ev = event as any;
          const suspendPayload =
            ev?.payload?.status?.payload ??
            ev?.payload?.payload ??
            ev?.payload ??
            ev?.suspendPayload ??
            null;

          const previewHtmlPath: string | undefined =
            suspendPayload?.html_preview_path;
          const reviewIteration: number | undefined =
            suspendPayload?.iteration_count;

          if (previewHtmlPath) {
            updateSession(sessionId, { previewHtmlPath, reviewIteration });
            console.log(
              `[workflow-runner] preview HTML stored: ${previewHtmlPath}`,
            );
          } else {
            console.warn(
              "[workflow-runner] suspend payload has no html_preview_path. suspendPayload:",
              suspendPayload,
            );
          }

          publish(sessionId, {
            type: "hitl:suspended",
            agentId: "pipeline",
            message: reviewIteration && reviewIteration > 1
              ? `⏸ Pipeline paused — awaiting review (iteration ${reviewIteration})`
              : "⏸ Pipeline paused — awaiting human review",
          });
        }
      },
    );

    // Run the workflow inside the sessionContext so AsyncLocalStorage propagates
    // the hooks into withToolInterception() deep in the AI SDK call stack.
    const result = await sessionContext.run(contextHooks, () =>
      run.start({ inputData: { prompt: query } }),
    );

    if (result.status === "suspended") {
      // Also try extracting the preview path from the run result directly
      // (more reliable than the watch event payload on some Mastra versions)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const resultAny = result as any;
      const resultPayload =
        resultAny?.suspendedData ??
        resultAny?.steps?.["human-review"]?.payload ??
        resultAny?.payload ??
        null;
      const previewFromResult: string | undefined =
        resultPayload?.html_preview_path;
      const iterationFromResult: number | undefined =
        resultPayload?.iteration_count;

      console.log(
        "[workflow-runner] run.start() suspended result keys:",
        Object.keys(resultAny ?? {}),
        "previewFromResult:",
        previewFromResult ?? "(not found)",
      );

      updateSession(sessionId, {
        status: "suspended",
        ...(previewFromResult
          ? { previewHtmlPath: previewFromResult, reviewIteration: iterationFromResult }
          : {}),
      });
      activeRuns.set(sessionId, { run, status: "suspended" });
      return;
    }

    if (result.status === "success") {
      const output = result.result as { htmlPath?: string; pdfPath?: string };
      updateSession(sessionId, {
        status: "completed",
        result: result.result,
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
      const output = result.result as { htmlPath?: string; pdfPath?: string };
      updateSession(sessionId, {
        status: "completed",
        result: result.result,
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
