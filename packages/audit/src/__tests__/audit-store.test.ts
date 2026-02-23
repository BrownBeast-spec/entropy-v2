import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { GenericContainer, type StartedTestContainer } from "testcontainers";
import pg from "pg";
import { createHash } from "node:crypto";
import { AuditStore } from "../audit-store.js";
import { createToolLogger } from "../tool-logger.js";

const { Pool } = pg;

describe("AuditStore", () => {
  let container: StartedTestContainer;
  let pool: pg.Pool;
  let store: AuditStore;

  beforeAll(async () => {
    container = await new GenericContainer("postgres:16-alpine")
      .withExposedPorts(5432)
      .withEnvironment({
        POSTGRES_USER: "test",
        POSTGRES_PASSWORD: "test",
        POSTGRES_DB: "audit_test",
      })
      .start();

    const connectionString = `postgresql://test:test@${container.getHost()}:${container.getMappedPort(5432)}/audit_test`;
    pool = new Pool({ connectionString });
    store = new AuditStore(pool);
  }, 60_000);

  afterAll(async () => {
    await pool.end();
    await container.stop();
  });

  it("should run migration without error", async () => {
    await expect(store.migrate()).resolves.toBeUndefined();
  });

  it("should create a session and retrieve it", async () => {
    const sessionId = await store.createSession({
      query: "test query",
      tenantId: "tenant-1",
    });

    expect(sessionId).toBeDefined();
    expect(typeof sessionId).toBe("string");

    const trail = await store.getSessionTrail(sessionId);
    expect(trail.session.query).toBe("test query");
    expect(trail.session.tenant_id).toBe("tenant-1");
    expect(trail.session.status).toBe("pending");
  });

  it("should update session status", async () => {
    const sessionId = await store.createSession({ query: "status test" });
    await store.updateSessionStatus(sessionId, "completed");

    const trail = await store.getSessionTrail(sessionId);
    expect(trail.session.status).toBe("completed");
  });

  it("should log tool calls and query by session", async () => {
    const sessionId = await store.createSession({ query: "tool call test" });

    const logId = await store.logToolCall({
      sessionId,
      toolName: "search_pubmed",
      apiEndpoint: "https://api.pubmed.gov/search",
      parameters: { query: "cancer" },
      responseHash: "abc123",
      durationMs: 150,
    });

    expect(logId).toBeDefined();

    const trail = await store.getSessionTrail(sessionId);
    expect(trail.toolCalls).toHaveLength(1);
    expect(trail.toolCalls[0].tool_name).toBe("search_pubmed");
    expect(trail.toolCalls[0].api_endpoint).toBe(
      "https://api.pubmed.gov/search",
    );
    expect(trail.toolCalls[0].duration_ms).toBe(150);
    expect(trail.toolCalls[0].response_hash).toBe("abc123");
  });

  it("should log agent traces", async () => {
    const sessionId = await store.createSession({ query: "agent trace test" });

    const traceId = await store.logAgentTrace({
      sessionId,
      agentId: "research-agent",
      input: { question: "What is BRCA1?" },
      output: { answer: "BRCA1 is a tumor suppressor gene." },
      model: "gpt-4",
      tokensUsed: 500,
      durationMs: 2000,
    });

    expect(traceId).toBeDefined();

    const trail = await store.getSessionTrail(sessionId);
    expect(trail.agentTraces).toHaveLength(1);
    expect(trail.agentTraces[0].agent_id).toBe("research-agent");
    expect(trail.agentTraces[0].model).toBe("gpt-4");
    expect(trail.agentTraces[0].tokens_used).toBe(500);
  });

  it("should log HITL decisions with annotations", async () => {
    const sessionId = await store.createSession({ query: "hitl test" });

    const traceId = await store.logAgentTrace({
      sessionId,
      agentId: "safety-agent",
      input: { data: "test" },
      output: { result: "ok" },
    });

    const recordId = await store.logHitlDecision({
      sessionId,
      traceId,
      reviewer: "dr.smith@example.com",
      approved: true,
      annotations: { comment: "Looks good", confidence: 0.95 },
    });

    expect(recordId).toBeDefined();

    const trail = await store.getSessionTrail(sessionId);
    expect(trail.hitlRecords).toHaveLength(1);
    expect(trail.hitlRecords[0].reviewer).toBe("dr.smith@example.com");
    expect(trail.hitlRecords[0].approved).toBe(true);
    expect(trail.hitlRecords[0].annotations).toEqual({
      comment: "Looks good",
      confidence: 0.95,
    });
  });

  it("should query tool calls by time range", async () => {
    const before = new Date();

    const sessionId = await store.createSession({
      query: "time range test",
      tenantId: "tenant-time",
    });
    await store.logToolCall({
      sessionId,
      tenantId: "tenant-time",
      toolName: "time_tool",
      parameters: { x: 1 },
      durationMs: 10,
    });

    const after = new Date();

    const results = await store.getToolCallsByTimeRange(before, after, {
      tenantId: "tenant-time",
    });
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results.some((r) => r.tool_name === "time_tool")).toBe(true);
  });

  it("should handle nullable tenant_id", async () => {
    const sessionId = await store.createSession({
      query: "no tenant test",
    });

    const trail = await store.getSessionTrail(sessionId);
    expect(trail.session.tenant_id).toBeNull();

    await store.logToolCall({
      sessionId,
      toolName: "no_tenant_tool",
      parameters: {},
    });

    const updatedTrail = await store.getSessionTrail(sessionId);
    expect(updatedTrail.toolCalls[0].tenant_id).toBeNull();
  });

  it("should return all related records in getSessionTrail", async () => {
    const sessionId = await store.createSession({
      query: "full trail test",
      tenantId: "tenant-full",
    });

    await store.logToolCall({
      sessionId,
      toolName: "tool-a",
      parameters: { a: 1 },
    });
    await store.logToolCall({
      sessionId,
      toolName: "tool-b",
      parameters: { b: 2 },
    });

    const traceId = await store.logAgentTrace({
      sessionId,
      agentId: "agent-1",
      input: { q: "test" },
      output: { r: "result" },
    });

    await store.logHitlDecision({
      sessionId,
      traceId,
      reviewer: "reviewer-1",
      approved: false,
    });

    const trail = await store.getSessionTrail(sessionId);
    expect(trail.session).toBeDefined();
    expect(trail.toolCalls).toHaveLength(2);
    expect(trail.agentTraces).toHaveLength(1);
    expect(trail.hitlRecords).toHaveLength(1);
  });

  describe("Tool Logger Middleware", () => {
    it("should compute correct response hash and log duration", async () => {
      const sessionId = await store.createSession({
        query: "middleware test",
      });

      const logger = createToolLogger(store, sessionId);

      const mockHandler = async (_params: Record<string, unknown>) => ({
        content: [{ type: "text", text: "Hello, world!" }],
      });

      const wrappedHandler = logger.wrapTool("test_tool", mockHandler);

      const result = await wrappedHandler({ input: "test" });
      expect(result.content[0].text).toBe("Hello, world!");

      const expectedHash = createHash("sha256")
        .update("Hello, world!")
        .digest("hex");

      const trail = await store.getSessionTrail(sessionId);
      const toolCall = trail.toolCalls.find(
        (tc) => tc.tool_name === "test_tool",
      );
      expect(toolCall).toBeDefined();
      expect(toolCall!.response_hash).toBe(expectedHash);
      expect(toolCall!.duration_ms).toBeGreaterThanOrEqual(0);
      expect(toolCall!.error).toBeNull();
    });

    it("should log error and re-throw when handler fails", async () => {
      const sessionId = await store.createSession({
        query: "error middleware test",
      });

      const logger = createToolLogger(store, sessionId);

      const failingHandler = async (
        _params: Record<string, unknown>,
      ): Promise<{ content: { type: string; text: string }[] }> => {
        throw new Error("Something went wrong");
      };

      const wrappedHandler = logger.wrapTool("failing_tool", failingHandler);

      await expect(wrappedHandler({ input: "test" })).rejects.toThrow(
        "Something went wrong",
      );

      const trail = await store.getSessionTrail(sessionId);
      const toolCall = trail.toolCalls.find(
        (tc) => tc.tool_name === "failing_tool",
      );
      expect(toolCall).toBeDefined();
      expect(toolCall!.error).toBe("Something went wrong");
      expect(toolCall!.duration_ms).toBeGreaterThanOrEqual(0);
    });
  });
});
