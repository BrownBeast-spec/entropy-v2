import { trace, SpanStatusCode, type Span } from "@opentelemetry/api";

const tracer = trace.getTracer("entropy-research", "0.0.1");

export interface AgentSpanOptions {
  agentId: string;
  model?: string;
  sessionId?: string;
  inputSummary?: string;
}

export interface ToolSpanOptions {
  toolName: string;
  endpoint?: string;
  parameters?: Record<string, unknown>;
  sessionId?: string;
}

/**
 * Create a traced agent invocation span.
 * Wraps an async function with OTel tracing.
 */
export async function traceAgentCall<T>(
  options: AgentSpanOptions,
  fn: (span: Span) => Promise<T>,
): Promise<T> {
  return tracer.startActiveSpan(`agent.${options.agentId}`, async (span) => {
    span.setAttribute("agent.id", options.agentId);
    if (options.model) span.setAttribute("agent.model", options.model);
    if (options.sessionId) span.setAttribute("session.id", options.sessionId);
    if (options.inputSummary)
      span.setAttribute("agent.input_summary", options.inputSummary);

    try {
      const result = await fn(span);
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (error) {
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error instanceof Error ? error.message : String(error),
      });
      throw error;
    } finally {
      span.end();
    }
  });
}

/**
 * Create a traced MCP tool call span.
 */
export async function traceToolCall<T>(
  options: ToolSpanOptions,
  fn: (span: Span) => Promise<T>,
): Promise<T> {
  return tracer.startActiveSpan(`tool.${options.toolName}`, async (span) => {
    span.setAttribute("tool.name", options.toolName);
    if (options.endpoint) span.setAttribute("tool.endpoint", options.endpoint);
    if (options.sessionId) span.setAttribute("session.id", options.sessionId);
    if (options.parameters) {
      span.setAttribute("tool.parameters", JSON.stringify(options.parameters));
    }

    try {
      const result = await fn(span);
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (error) {
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error instanceof Error ? error.message : String(error),
      });
      throw error;
    } finally {
      span.end();
    }
  });
}

/**
 * Create a traced workflow step span.
 */
export async function traceWorkflowStep<T>(
  stepId: string,
  sessionId: string | undefined,
  fn: (span: Span) => Promise<T>,
): Promise<T> {
  return tracer.startActiveSpan(`workflow.step.${stepId}`, async (span) => {
    span.setAttribute("workflow.step.id", stepId);
    if (sessionId) span.setAttribute("session.id", sessionId);

    try {
      const result = await fn(span);
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (error) {
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error instanceof Error ? error.message : String(error),
      });
      throw error;
    } finally {
      span.end();
    }
  });
}

/**
 * Get the current trace ID from the active context (for correlation).
 */
export function getCurrentTraceId(): string | undefined {
  const spanContext = trace.getActiveSpan()?.spanContext();
  return spanContext?.traceId;
}
