import { Hono } from "hono";
import { z } from "zod";
import { HitlResumeSchema } from "@entropy/mastra-app/src/schemas/hitl.js";
import { readFile } from "node:fs/promises";
import {
  createSession,
  getSession,
  updateSession,
} from "../store/session-store.js";
import { activityBus } from "../lib/activity-bus.js";
import { errorResponse } from "../middleware/error-handler.js";
import { workflowRunner } from "../lib/workflow-runner.js";
import {
  getAuditStore,
  isAuditEnabled,
} from "@entropy/mastra-app/src/lib/audit.js";

const research = new Hono();

const QuerySchema = z.object({
  query: z.string().min(1),
});

// POST /api/research
research.post("/", async (c) => {
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return errorResponse(c, 400, "BAD_REQUEST", "Invalid JSON body");
  }

  const parsed = QuerySchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(c, 400, "VALIDATION_ERROR", "Invalid request body", {
      issues: parsed.error.issues,
    });
  }

  const session = createSession(parsed.data.query);
  workflowRunner.start(parsed.data.query, session.sessionId).catch((err) => {
    console.error("[workflow-runner] start failed:", err);
    updateSession(session.sessionId, {
      status: "failed",
      result: err instanceof Error ? err.message : String(err),
    });
  });
  return c.json(
    {
      sessionId: session.sessionId,
      status: session.status,
      createdAt: session.createdAt,
    },
    201,
  );
});

// GET /api/research/:sessionId
research.get("/:sessionId", (c) => {
  const { sessionId } = c.req.param();
  const session = getSession(sessionId);
  if (!session) {
    return errorResponse(c, 404, "NOT_FOUND", "Session not found");
  }
  return c.json({
    sessionId: session.sessionId,
    status: session.status,
    query: session.query,
    createdAt: session.createdAt,
    result: session.result,
  });
});

// GET /api/research/:sessionId/agents
research.get("/:sessionId/agents", (c) => {
  const { sessionId } = c.req.param();
  const session = getSession(sessionId);
  if (!session) {
    return errorResponse(c, 404, "NOT_FOUND", "Session not found");
  }
  return c.json({ sessionId, agents: session.agents });
});

// POST /api/research/:sessionId/review
research.post("/:sessionId/review", async (c) => {
  const { sessionId } = c.req.param();
  const session = getSession(sessionId);
  if (!session) {
    return errorResponse(c, 404, "NOT_FOUND", "Session not found");
  }

  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return errorResponse(c, 400, "BAD_REQUEST", "Invalid JSON body");
  }

  const parsed = HitlResumeSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(c, 400, "VALIDATION_ERROR", "Invalid review body", {
      issues: parsed.error.issues,
    });
  }

  try {
    await workflowRunner.resume(sessionId, parsed.data);
  } catch (err) {
    console.error("[workflow-runner] resume failed:", err);
    updateSession(sessionId, {
      status: "failed",
      result: err instanceof Error ? err.message : String(err),
    });
  }

  return c.json({
    sessionId,
    status: getSession(sessionId)?.status ?? "completed",
    message: "Review submitted successfully",
  });
});

// GET /api/research/:sessionId/report
research.get("/:sessionId/report", async (c) => {
  const { sessionId } = c.req.param();
  const session = getSession(sessionId);
  if (!session) {
    return errorResponse(c, 404, "NOT_FOUND", "Session not found");
  }
  if (session.status !== "completed") {
    return errorResponse(c, 404, "NOT_READY", "Report not yet generated");
  }

  let reportPath = session.reportPdfPath;
  if (!reportPath && session.result && typeof session.result === "object") {
    const result = session.result as { pdfPath?: string };
    reportPath = result.pdfPath;
    if (reportPath) {
      updateSession(sessionId, { reportPdfPath: reportPath });
    }
  }

  if (!reportPath) {
    return errorResponse(c, 404, "NOT_READY", "Report not yet generated");
  }

  const pdfBuffer = await readFile(reportPath);
  c.header("Content-Type", "application/pdf");
  return c.body(pdfBuffer, 200);
});

// GET /api/research/:sessionId/audit
research.get("/:sessionId/audit", async (c) => {
  const { sessionId } = c.req.param();
  const session = getSession(sessionId);
  if (!session) {
    return errorResponse(c, 404, "NOT_FOUND", "Session not found");
  }
  if (!isAuditEnabled()) {
    return c.json({ sessionId, events: [] });
  }

  try {
    const trail = await getAuditStore().getSessionTrail(sessionId);
    return c.json({ sessionId, events: trail });
  } catch (err) {
    return c.json({
      sessionId,
      events: [],
      error: err instanceof Error ? err.message : String(err),
    });
  }
});

// GET /api/research/:sessionId/stream  (Server-Sent Events)
//
// Sends all historical log entries first (for clients that connect mid-run),
// then streams live events as the pipeline progresses.
research.get("/:sessionId/stream", (c) => {
  const { sessionId } = c.req.param();
  const session = getSession(sessionId);
  if (!session) {
    return errorResponse(c, 404, "NOT_FOUND", "Session not found");
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      const send = (event: object) => {
        try {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(event)}\n\n`),
          );
        } catch {
          // controller closed — client disconnected
        }
      };

      // 1. Flush historical log so late joiners catch up
      for (const entry of session.log) {
        send(entry);
      }

      // 2. Subscribe to live events
      const listener = (e: object) => send(e);
      activityBus.subscribe(sessionId, listener as (e: unknown) => void);

      // 3. Close stream when session reaches a terminal state
      const checkDone = setInterval(() => {
        const s = getSession(sessionId);
        if (!s || s.status === "completed" || s.status === "failed") {
          clearInterval(checkDone);
          activityBus.unsubscribe(sessionId, listener as (e: unknown) => void);
          try { controller.close(); } catch { /* already closed */ }
        }
      }, 3000);

      // 4. Cleanup if the HTTP connection drops
      c.req.raw.signal.addEventListener("abort", () => {
        clearInterval(checkDone);
        activityBus.unsubscribe(sessionId, listener as (e: unknown) => void);
        try { controller.close(); } catch { /* already closed */ }
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "Access-Control-Allow-Origin": "*",
    },
  });
});

export { research };
