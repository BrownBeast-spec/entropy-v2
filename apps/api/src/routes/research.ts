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

// GET /api/research/:sessionId/preview
// Serves the HTML preview file generated before HITL suspension so the
// reviewer can open it in a new tab before approving/rejecting.
research.get("/:sessionId/preview", async (c) => {
  const { sessionId } = c.req.param();
  const session = getSession(sessionId);
  if (!session) {
    return errorResponse(c, 404, "NOT_FOUND", "Session not found");
  }

  // ── Primary: path stored by the workflow-runner event handler ────────────
  let previewPath = session.previewHtmlPath;

  // ── Fallback: scan outputs/ for the most recent preview-*.html ───────────
  // This covers cases where the Mastra suspend event payload path was not
  // picked up correctly, but the step still wrote the file to disk.
  if (!previewPath) {
    try {
      const { readdir, stat } = await import("node:fs/promises");
      const { join } = await import("node:path");
      const { fileURLToPath } = await import("node:url");
      const { dirname } = await import("node:path");

      // Resolve outputs/ the same way compile-pdf does
      // (4 levels up from this file: routes → src → api → apps → root)
      const thisDir = dirname(fileURLToPath(import.meta.url));
      const outputsDir = join(thisDir, "..", "..", "..", "..", "outputs");

      const files = await readdir(outputsDir);
      const previews = files.filter((f) => f.startsWith("preview-") && f.endsWith(".html"));

      // Pick the most recently modified one created after this session started
      const sessionCreated = new Date(session.createdAt).getTime();
      let latestMtime = 0;
      let latestPath: string | null = null;

      for (const file of previews) {
        const fullPath = join(outputsDir, file);
        const s = await stat(fullPath).catch(() => null);
        if (s && s.mtimeMs > sessionCreated && s.mtimeMs > latestMtime) {
          latestMtime = s.mtimeMs;
          latestPath = fullPath;
        }
      }

      if (latestPath) {
        previewPath = latestPath;
        // Store it so subsequent requests skip the scan
        updateSession(sessionId, { previewHtmlPath: latestPath });
        console.log(`[preview] found via fs scan: ${latestPath}`);
      }
    } catch (err) {
      console.warn("[preview] fs fallback scan failed:", err);
    }
  }

  if (!previewPath) {
    return errorResponse(c, 404, "NOT_READY", "Preview not yet available — pipeline may still be running");
  }

  try {
    const html = await readFile(previewPath, "utf8");
    c.header("Content-Type", "text/html; charset=utf-8");
    c.header("Cache-Control", "no-store");
    return c.body(html, 200);
  } catch {
    return errorResponse(c, 500, "READ_ERROR", "Could not read preview file");
  }
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
