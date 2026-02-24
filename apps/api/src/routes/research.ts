import { Hono } from "hono";
import { z } from "zod";
import { HitlResumeSchema } from "@entropy/mastra-app";
import {
  createSession,
  getSession,
  updateSession,
} from "../store/session-store.js";
import { errorResponse } from "../middleware/error-handler.js";

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

  updateSession(sessionId, { status: "completed" });
  return c.json({
    sessionId,
    status: "completed",
    message: "Review submitted successfully",
  });
});

// GET /api/research/:sessionId/report
research.get("/:sessionId/report", (c) => {
  const { sessionId } = c.req.param();
  const session = getSession(sessionId);
  if (!session) {
    return errorResponse(c, 404, "NOT_FOUND", "Session not found");
  }
  if (session.status !== "completed" || !session.reportTexPath) {
    return errorResponse(c, 404, "NOT_READY", "Report not yet generated");
  }
  return c.text("% LaTeX report placeholder");
});

// GET /api/research/:sessionId/audit
research.get("/:sessionId/audit", (c) => {
  const { sessionId } = c.req.param();
  const session = getSession(sessionId);
  if (!session) {
    return errorResponse(c, 404, "NOT_FOUND", "Session not found");
  }
  return c.json({ sessionId, events: [] });
});

export { research };
