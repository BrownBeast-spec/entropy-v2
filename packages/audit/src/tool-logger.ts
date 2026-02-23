import { createHash } from "node:crypto";
import type { AuditStore } from "./audit-store.js";

export type ToolHandler = (
  params: Record<string, unknown>,
) => Promise<{ content: { type: string; text: string }[] }>;

export function createToolLogger(
  auditStore: AuditStore,
  sessionId?: string,
): { wrapTool: (toolName: string, handler: ToolHandler) => ToolHandler } {
  function wrapTool(toolName: string, handler: ToolHandler): ToolHandler {
    return async (params: Record<string, unknown>) => {
      const start = Date.now();

      try {
        const result = await handler(params);
        const durationMs = Date.now() - start;

        const responseText = result.content.map((c) => c.text).join("");
        const responseHash = createHash("sha256")
          .update(responseText)
          .digest("hex");

        await auditStore.logToolCall({
          sessionId,
          toolName,
          parameters: params,
          responseHash,
          durationMs,
        });

        return result;
      } catch (error) {
        const durationMs = Date.now() - start;
        const errorMessage =
          error instanceof Error ? error.message : String(error);

        await auditStore.logToolCall({
          sessionId,
          toolName,
          parameters: params,
          durationMs,
          error: errorMessage,
        });

        throw error;
      }
    };
  }

  return { wrapTool };
}
