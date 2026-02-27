import pg from "pg";
import { MIGRATION_SQL } from "./schema.js";
const { Pool } = pg;
export class AuditStore {
    pool;
    ownsPool;
    constructor(config) {
        if (config instanceof Pool) {
            this.pool = config;
            this.ownsPool = false;
        }
        else {
            this.pool = new Pool({ connectionString: config.connectionString });
            this.ownsPool = true;
        }
    }
    async migrate() {
        await this.pool.query(MIGRATION_SQL);
    }
    async createSession(opts) {
        const result = await this.pool.query(`INSERT INTO research_sessions (query, tenant_id) VALUES ($1, $2) RETURNING id`, [opts.query, opts.tenantId ?? null]);
        return result.rows[0].id;
    }
    async updateSessionStatus(sessionId, status) {
        await this.pool.query(`UPDATE research_sessions SET status = $1, updated_at = NOW() WHERE id = $2`, [status, sessionId]);
    }
    async logToolCall(opts) {
        const result = await this.pool.query(`INSERT INTO tool_call_logs (session_id, tenant_id, tool_name, api_endpoint, parameters, response_hash, duration_ms, error)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`, [
            opts.sessionId ?? null,
            opts.tenantId ?? null,
            opts.toolName,
            opts.apiEndpoint ?? null,
            JSON.stringify(opts.parameters),
            opts.responseHash ?? null,
            opts.durationMs ?? null,
            opts.error ?? null,
        ]);
        return result.rows[0].id;
    }
    async logAgentTrace(opts) {
        const result = await this.pool.query(`INSERT INTO agent_traces (session_id, tenant_id, agent_id, input, output, model, tokens_used, duration_ms)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`, [
            opts.sessionId ?? null,
            opts.tenantId ?? null,
            opts.agentId,
            JSON.stringify(opts.input),
            JSON.stringify(opts.output),
            opts.model ?? null,
            opts.tokensUsed ?? null,
            opts.durationMs ?? null,
        ]);
        return result.rows[0].id;
    }
    async logHitlDecision(opts) {
        const result = await this.pool.query(`INSERT INTO hitl_records (session_id, tenant_id, trace_id, reviewer, approved, annotations)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`, [
            opts.sessionId ?? null,
            opts.tenantId ?? null,
            opts.traceId ?? null,
            opts.reviewer,
            opts.approved,
            opts.annotations ? JSON.stringify(opts.annotations) : null,
        ]);
        return result.rows[0].id;
    }
    async getSessionTrail(sessionId) {
        const sessionResult = await this.pool.query(`SELECT * FROM research_sessions WHERE id = $1`, [sessionId]);
        if (sessionResult.rows.length === 0) {
            throw new Error(`Session not found: ${sessionId}`);
        }
        const [toolCallsResult, agentTracesResult, hitlRecordsResult] = await Promise.all([
            this.pool.query(`SELECT * FROM tool_call_logs WHERE session_id = $1 ORDER BY created_at`, [sessionId]),
            this.pool.query(`SELECT * FROM agent_traces WHERE session_id = $1 ORDER BY created_at`, [sessionId]),
            this.pool.query(`SELECT * FROM hitl_records WHERE session_id = $1 ORDER BY created_at`, [sessionId]),
        ]);
        return {
            session: sessionResult.rows[0],
            toolCalls: toolCallsResult.rows,
            agentTraces: agentTracesResult.rows,
            hitlRecords: hitlRecordsResult.rows,
        };
    }
    async getToolCallsByTimeRange(from, to, opts) {
        if (opts?.tenantId) {
            const result = await this.pool.query(`SELECT * FROM tool_call_logs WHERE created_at >= $1 AND created_at <= $2 AND tenant_id = $3 ORDER BY created_at`, [from, to, opts.tenantId]);
            return result.rows;
        }
        const result = await this.pool.query(`SELECT * FROM tool_call_logs WHERE created_at >= $1 AND created_at <= $2 ORDER BY created_at`, [from, to]);
        return result.rows;
    }
    async close() {
        if (this.ownsPool) {
            await this.pool.end();
        }
    }
}
//# sourceMappingURL=audit-store.js.map