import pg from "pg";
export interface Session {
    id: string;
    tenant_id: string | null;
    query: string;
    status: string;
    created_at: Date;
    updated_at: Date;
}
export interface ToolCallLog {
    id: string;
    tenant_id: string | null;
    session_id: string | null;
    tool_name: string;
    api_endpoint: string | null;
    parameters: Record<string, unknown>;
    response_hash: string | null;
    duration_ms: number | null;
    error: string | null;
    created_at: Date;
}
export interface AgentTrace {
    id: string;
    tenant_id: string | null;
    session_id: string | null;
    agent_id: string;
    input: Record<string, unknown>;
    output: Record<string, unknown>;
    model: string | null;
    tokens_used: number | null;
    duration_ms: number | null;
    created_at: Date;
}
export interface HitlRecord {
    id: string;
    tenant_id: string | null;
    session_id: string | null;
    trace_id: string | null;
    reviewer: string;
    approved: boolean;
    annotations: Record<string, unknown> | null;
    created_at: Date;
}
export interface SessionTrail {
    session: Session;
    toolCalls: ToolCallLog[];
    agentTraces: AgentTrace[];
    hitlRecords: HitlRecord[];
}
export declare class AuditStore {
    private pool;
    private ownsPool;
    constructor(config: {
        connectionString: string;
    } | pg.Pool);
    migrate(): Promise<void>;
    createSession(opts: {
        query: string;
        tenantId?: string;
    }): Promise<string>;
    updateSessionStatus(sessionId: string, status: string): Promise<void>;
    logToolCall(opts: {
        sessionId?: string;
        tenantId?: string;
        toolName: string;
        apiEndpoint?: string;
        parameters: Record<string, unknown>;
        responseHash?: string;
        durationMs?: number;
        error?: string;
    }): Promise<string>;
    logAgentTrace(opts: {
        sessionId?: string;
        tenantId?: string;
        agentId: string;
        input: Record<string, unknown>;
        output: Record<string, unknown>;
        model?: string;
        tokensUsed?: number;
        durationMs?: number;
    }): Promise<string>;
    logHitlDecision(opts: {
        sessionId?: string;
        tenantId?: string;
        traceId?: string;
        reviewer: string;
        approved: boolean;
        annotations?: Record<string, unknown>;
    }): Promise<string>;
    getSessionTrail(sessionId: string): Promise<SessionTrail>;
    getToolCallsByTimeRange(from: Date, to: Date, opts?: {
        tenantId?: string;
    }): Promise<ToolCallLog[]>;
    close(): Promise<void>;
}
//# sourceMappingURL=audit-store.d.ts.map