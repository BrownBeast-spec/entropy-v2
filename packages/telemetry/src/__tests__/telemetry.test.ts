import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import {
  initTelemetry,
  shutdownTelemetry,
  getMemoryExporter,
} from "../setup.js";
import {
  traceAgentCall,
  traceToolCall,
  traceWorkflowStep,
  getCurrentTraceId,
} from "../spans.js";

describe("Telemetry", () => {
  beforeAll(() => {
    initTelemetry({ exporter: "memory" });
  });

  afterAll(async () => {
    await shutdownTelemetry();
  });

  beforeEach(() => {
    getMemoryExporter()?.reset();
  });

  it("initializes without error", () => {
    expect(getMemoryExporter()).not.toBeNull();
  });

  it("creates agent call spans", async () => {
    await traceAgentCall(
      {
        agentId: "planner",
        model: "google:gemini-2.5-flash",
        sessionId: "sess-1",
      },
      async (span) => {
        span.setAttribute("agent.tokens", 100);
        return "result";
      },
    );

    const spans = getMemoryExporter()!.getFinishedSpans();
    expect(spans).toHaveLength(1);
    expect(spans[0].name).toBe("agent.planner");
    expect(spans[0].attributes["agent.id"]).toBe("planner");
    expect(spans[0].attributes["agent.model"]).toBe("google:gemini-2.5-flash");
    expect(spans[0].attributes["session.id"]).toBe("sess-1");
  });

  it("creates tool call spans", async () => {
    await traceToolCall(
      {
        toolName: "search_targets",
        endpoint: "https://api.opentargets.io",
        parameters: { query: "BRCA1" },
      },
      async () => ({ results: [] }),
    );

    const spans = getMemoryExporter()!.getFinishedSpans();
    expect(spans).toHaveLength(1);
    expect(spans[0].name).toBe("tool.search_targets");
    expect(spans[0].attributes["tool.name"]).toBe("search_targets");
  });

  it("creates workflow step spans", async () => {
    await traceWorkflowStep("merge-evidence", "sess-2", async () => "merged");

    const spans = getMemoryExporter()!.getFinishedSpans();
    expect(spans).toHaveLength(1);
    expect(spans[0].name).toBe("workflow.step.merge-evidence");
    expect(spans[0].attributes["session.id"]).toBe("sess-2");
  });

  it("marks error spans on failure", async () => {
    try {
      await traceAgentCall({ agentId: "biologist" }, async () => {
        throw new Error("LLM timeout");
      });
    } catch (e) {
      /* expected */
    }

    const spans = getMemoryExporter()!.getFinishedSpans();
    expect(spans).toHaveLength(1);
    expect(spans[0].status.code).toBe(2); // SpanStatusCode.ERROR
  });

  it("supports nested spans (agent -> tool)", async () => {
    await traceAgentCall({ agentId: "biologist" }, async () => {
      await traceToolCall({ toolName: "search_targets" }, async () => "data");
      return "analysis";
    });

    const spans = getMemoryExporter()!.getFinishedSpans();
    expect(spans).toHaveLength(2);
    const toolSpan = spans.find((s) => s.name === "tool.search_targets");
    const agentSpan = spans.find((s) => s.name === "agent.biologist");
    expect(toolSpan).toBeDefined();
    expect(agentSpan).toBeDefined();
    // Tool span should be a child of agent span
    expect(toolSpan!.parentSpanId).toBe(agentSpan!.spanContext().spanId);
  });

  it("can retrieve current trace ID", async () => {
    let traceId: string | undefined;
    await traceAgentCall({ agentId: "test" }, async () => {
      traceId = getCurrentTraceId();
      return "ok";
    });
    expect(traceId).toBeDefined();
    expect(typeof traceId).toBe("string");
    expect(traceId!.length).toBe(32); // OTel trace IDs are 32 hex chars
  });
});
