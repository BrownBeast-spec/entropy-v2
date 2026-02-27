import type { AuditStore } from "./audit-store.js";
export type ToolHandler = (params: Record<string, unknown>) => Promise<{
    content: {
        type: string;
        text: string;
    }[];
}>;
export declare function createToolLogger(auditStore: AuditStore, sessionId?: string): {
    wrapTool: (toolName: string, handler: ToolHandler) => ToolHandler;
};
//# sourceMappingURL=tool-logger.d.ts.map