import { createHash } from "node:crypto";
export function createToolLogger(auditStore, sessionId) {
    function wrapTool(toolName, handler) {
        return async (params) => {
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
            }
            catch (error) {
                const durationMs = Date.now() - start;
                const errorMessage = error instanceof Error ? error.message : String(error);
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
//# sourceMappingURL=tool-logger.js.map