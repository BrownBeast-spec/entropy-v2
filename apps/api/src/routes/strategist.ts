import { Hono } from "hono";
import { z } from "zod";
import {
  createSession,
  getSession,
  updateSession,
} from "../store/session-store.js";
import { activityBus } from "../lib/activity-bus.js";
import { errorResponse } from "../middleware/error-handler.js";
import { workflowRunner } from "../lib/workflow-runner.js";

const strategist = new Hono();

const QuerySchema = z.object({
  query: z.string().min(1),
});

strategist.post("/", async (c) => {
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
  workflowRunner.start(parsed.data.query, session.sessionId, "strategistPipelineWorkflow").catch((err) => {
    console.error("[workflow-runner-strategist] start failed:", err);
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

strategist.get("/:sessionId", (c) => {
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

strategist.get("/:sessionId/stream", (c) => {
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

      for (const entry of session.log) {
        send(entry);
      }

      const listener = (e: object) => send(e);
      activityBus.subscribe(sessionId, listener as (e: unknown) => void);

      const checkDone = setInterval(() => {
        const s = getSession(sessionId);
        if (!s || s.status === "completed" || s.status === "failed") {
          clearInterval(checkDone);
          activityBus.unsubscribe(sessionId, listener as (e: unknown) => void);
          try { controller.close(); } catch { /* already closed */ }
        }
      }, 3000);

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

export { strategist };
