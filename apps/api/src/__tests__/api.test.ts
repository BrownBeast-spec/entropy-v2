import { describe, it, expect, beforeEach } from "vitest";
import { app } from "../index.js";
import { clearStore } from "../store/session-store.js";

beforeEach(() => {
  clearStore();
});

describe("POST /api/research", () => {
  it("creates a session and returns 201 with sessionId, status, createdAt", async () => {
    const res = await app.request("/api/research", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: "Can imatinib treat pancreatic cancer?" }),
    });

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body).toHaveProperty("sessionId");
    expect(body.sessionId).toMatch(/^ses_/);
    expect(body).toHaveProperty("status", "running");
    expect(body).toHaveProperty("createdAt");
    expect(typeof body.createdAt).toBe("string");
  });

  it("returns 400 when query is missing", async () => {
    const res = await app.request("/api/research", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });
});

describe("GET /api/research/:id", () => {
  it("returns session details after creating one", async () => {
    const createRes = await app.request("/api/research", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: "Test drug repurposing query" }),
    });
    const { sessionId } = await createRes.json();

    const res = await app.request(`/api/research/${sessionId}`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.sessionId).toBe(sessionId);
    expect(body.status).toBe("running");
    expect(body.query).toBe("Test drug repurposing query");
    expect(body).toHaveProperty("createdAt");
    expect(body).toHaveProperty("result");
  });

  it("returns 404 for unknown session ID", async () => {
    const res = await app.request("/api/research/ses_unknown123");
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error.code).toBe("NOT_FOUND");
  });
});

describe("GET /api/research/:id/agents", () => {
  it("returns agents object with all 7 agents", async () => {
    const createRes = await app.request("/api/research", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: "Drug repurposing for Alzheimer's" }),
    });
    const { sessionId } = await createRes.json();

    const res = await app.request(`/api/research/${sessionId}/agents`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.sessionId).toBe(sessionId);
    expect(body.agents).toHaveProperty("planner");
    expect(body.agents).toHaveProperty("biologist");
    expect(body.agents).toHaveProperty("clinical-scout");
    expect(body.agents).toHaveProperty("hawk-safety");
    expect(body.agents).toHaveProperty("librarian");
    expect(body.agents).toHaveProperty("gap-analyst");
    expect(body.agents).toHaveProperty("verifier");
    expect(Object.keys(body.agents)).toHaveLength(7);
  });

  it("returns 404 for unknown session ID", async () => {
    const res = await app.request("/api/research/ses_unknown456/agents");
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error.code).toBe("NOT_FOUND");
  });
});

describe("POST /api/research/:id/review", () => {
  it("submits valid review and returns 200 with status", async () => {
    const createRes = await app.request("/api/research", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: "Review test query" }),
    });
    const { sessionId } = await createRes.json();

    const res = await app.request(`/api/research/${sessionId}/review`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        approved: true,
        reviewer: "Dr. Smith",
        notes: "Looks good",
      }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.sessionId).toBe(sessionId);
    // Without a real workflow run, resume fails and status becomes "failed"
    expect(["completed", "failed"]).toContain(body.status);
    expect(body.message).toBe("Review submitted successfully");
  });

  it("returns 400 for invalid review body", async () => {
    const createRes = await app.request("/api/research", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: "Invalid review test" }),
    });
    const { sessionId } = await createRes.json();

    const res = await app.request(`/api/research/${sessionId}/review`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes: "Missing required fields" }),
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });
});

describe("GET /api/research/:id/report", () => {
  it("returns 404 when report is not yet generated", async () => {
    const createRes = await app.request("/api/research", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: "Report test query" }),
    });
    const { sessionId } = await createRes.json();

    const res = await app.request(`/api/research/${sessionId}/report`);
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error.code).toBe("NOT_READY");
  });
});

describe("GET /api/research/:id/audit", () => {
  it("returns sessionId and empty events array", async () => {
    const createRes = await app.request("/api/research", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: "Audit test query" }),
    });
    const { sessionId } = await createRes.json();

    const res = await app.request(`/api/research/${sessionId}/audit`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.sessionId).toBe(sessionId);
    expect(body.events).toEqual([]);
  });
});

describe("GET /api/health", () => {
  it("returns status ok with timestamp", async () => {
    const res = await app.request("/api/health");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("ok");
    expect(body).toHaveProperty("timestamp");
    expect(typeof body.timestamp).toBe("string");
  });
});

describe("Unknown route", () => {
  it("returns 404 with error format for unknown route", async () => {
    const res = await app.request("/api/does-not-exist");
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBeDefined();
    expect(body.error.code).toBe("NOT_FOUND");
    expect(body.error.message).toBe("Route not found");
    expect(body.error.details).toEqual({});
  });
});
