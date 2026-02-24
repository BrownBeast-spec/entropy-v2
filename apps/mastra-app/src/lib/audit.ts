import {
  AuditStore,
  CacheStore,
  type SessionTrail,
  type ToolCallLog,
} from "../../../../packages/audit/src/index.js";

type AuditStoreLike = {
  migrate: () => Promise<void>;
  createSession: (opts: {
    query: string;
    tenantId?: string;
  }) => Promise<string>;
  updateSessionStatus: (sessionId: string, status: string) => Promise<void>;
  logToolCall: (opts: {
    sessionId?: string;
    tenantId?: string;
    toolName: string;
    apiEndpoint?: string;
    parameters: Record<string, unknown>;
    responseHash?: string;
    durationMs?: number;
    error?: string;
  }) => Promise<string>;
  logAgentTrace: (opts: {
    sessionId?: string;
    tenantId?: string;
    agentId: string;
    input: Record<string, unknown>;
    output: Record<string, unknown>;
    model?: string;
    tokensUsed?: number;
    durationMs?: number;
  }) => Promise<string>;
  logHitlDecision: (opts: {
    sessionId?: string;
    tenantId?: string;
    traceId?: string;
    reviewer: string;
    approved: boolean;
    annotations?: Record<string, unknown>;
  }) => Promise<string>;
  getSessionTrail: (sessionId: string) => Promise<SessionTrail>;
  getToolCallsByTimeRange: (
    from: Date,
    to: Date,
    opts?: { tenantId?: string },
  ) => Promise<ToolCallLog[]>;
  close: () => Promise<void>;
};

type CacheStoreLike = {
  get: (
    toolName: string,
    parameters: Record<string, unknown>,
  ) => Promise<unknown | null>;
  set: (
    toolName: string,
    parameters: Record<string, unknown>,
    response: unknown,
    ttlSeconds?: number,
  ) => Promise<void>;
  invalidate: (
    toolName: string,
    parameters: Record<string, unknown>,
  ) => Promise<void>;
  invalidateByTool: (toolName: string) => Promise<number>;
  flush: () => Promise<number>;
  evictExpired: () => Promise<number>;
  getMetrics: () => { hits: number; misses: number; evictions: number };
  resetMetrics: () => void;
  close: () => Promise<void>;
};

const databaseUrl = process.env["DATABASE_URL"];
let warnedNoDb = false;

const warnNoDatabase = () => {
  if (warnedNoDb) return;
  warnedNoDb = true;
  console.warn("DATABASE_URL is not set. Audit trail is disabled.");
};

class NoOpAuditStore implements AuditStoreLike {
  async migrate(): Promise<void> {
    warnNoDatabase();
  }

  async createSession(): Promise<string> {
    warnNoDatabase();
    return `noop-session-${Date.now()}`;
  }

  async updateSessionStatus(): Promise<void> {
    warnNoDatabase();
  }

  async logToolCall(): Promise<string> {
    warnNoDatabase();
    return "noop-tool-call";
  }

  async logAgentTrace(): Promise<string> {
    warnNoDatabase();
    return "noop-agent-trace";
  }

  async logHitlDecision(): Promise<string> {
    warnNoDatabase();
    return "noop-hitl-record";
  }

  async getSessionTrail(sessionId: string): Promise<SessionTrail> {
    warnNoDatabase();
    return {
      session: {
        id: sessionId,
        tenant_id: null,
        query: "",
        status: "pending",
        created_at: new Date(),
        updated_at: new Date(),
      },
      toolCalls: [],
      agentTraces: [],
      hitlRecords: [],
    };
  }

  async getToolCallsByTimeRange(): Promise<ToolCallLog[]> {
    warnNoDatabase();
    return [];
  }

  async close(): Promise<void> {
    warnNoDatabase();
  }
}

class NoOpCacheStore implements CacheStoreLike {
  async get(): Promise<unknown | null> {
    warnNoDatabase();
    return null;
  }

  async set(): Promise<void> {
    warnNoDatabase();
  }

  async invalidate(): Promise<void> {
    warnNoDatabase();
  }

  async invalidateByTool(): Promise<number> {
    warnNoDatabase();
    return 0;
  }

  async flush(): Promise<number> {
    warnNoDatabase();
    return 0;
  }

  async evictExpired(): Promise<number> {
    warnNoDatabase();
    return 0;
  }

  getMetrics() {
    warnNoDatabase();
    return { hits: 0, misses: 0, evictions: 0 };
  }

  resetMetrics(): void {
    warnNoDatabase();
  }

  async close(): Promise<void> {
    warnNoDatabase();
  }
}

let auditStore: AuditStoreLike | null = null;
let cacheStore: CacheStoreLike | null = null;
let currentSessionId: string | null = null;

export const isAuditEnabled = () => Boolean(databaseUrl);

export const setCurrentSessionId = (sessionId: string | null) => {
  currentSessionId = sessionId;
};

export const getCurrentSessionId = () => currentSessionId;

export const clearCurrentSessionId = () => {
  currentSessionId = null;
};

export const getAuditStore = (): AuditStoreLike => {
  if (auditStore) return auditStore;
  if (!databaseUrl) {
    auditStore = new NoOpAuditStore();
    return auditStore;
  }
  auditStore = new AuditStore({ connectionString: databaseUrl });
  return auditStore;
};

export const getCacheStore = (): CacheStoreLike => {
  if (cacheStore) return cacheStore;
  if (!databaseUrl) {
    cacheStore = new NoOpCacheStore();
    return cacheStore;
  }
  cacheStore = new CacheStore({ connectionString: databaseUrl });
  return cacheStore;
};
