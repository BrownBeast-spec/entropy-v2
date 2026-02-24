export const CREATE_RESEARCH_SESSIONS = `
CREATE TABLE IF NOT EXISTS research_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT,
  query TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
`;

export const CREATE_TOOL_CALL_LOGS = `
CREATE TABLE IF NOT EXISTS tool_call_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT,
  session_id UUID REFERENCES research_sessions(id),
  tool_name TEXT NOT NULL,
  api_endpoint TEXT,
  parameters JSONB NOT NULL DEFAULT '{}',
  response_hash TEXT,
  duration_ms INTEGER,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
`;

export const CREATE_AGENT_TRACES = `
CREATE TABLE IF NOT EXISTS agent_traces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT,
  session_id UUID REFERENCES research_sessions(id),
  agent_id TEXT NOT NULL,
  input JSONB NOT NULL DEFAULT '{}',
  output JSONB NOT NULL DEFAULT '{}',
  model TEXT,
  tokens_used INTEGER,
  duration_ms INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
`;

export const CREATE_HITL_RECORDS = `
CREATE TABLE IF NOT EXISTS hitl_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT,
  session_id UUID REFERENCES research_sessions(id),
  trace_id UUID REFERENCES agent_traces(id),
  reviewer TEXT NOT NULL,
  approved BOOLEAN NOT NULL,
  annotations JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
`;

export const CREATE_TOOL_RESPONSE_CACHE = `
CREATE TABLE IF NOT EXISTS tool_response_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_key TEXT NOT NULL UNIQUE,
  tool_name TEXT NOT NULL,
  parameters_hash TEXT NOT NULL,
  response JSONB NOT NULL,
  ttl_seconds INTEGER NOT NULL DEFAULT 3600,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '1 hour')
);

CREATE INDEX IF NOT EXISTS idx_cache_key ON tool_response_cache(cache_key);
CREATE INDEX IF NOT EXISTS idx_cache_expires ON tool_response_cache(expires_at);
`;

export const MIGRATION_SQL = [
  CREATE_RESEARCH_SESSIONS,
  CREATE_TOOL_CALL_LOGS,
  CREATE_AGENT_TRACES,
  CREATE_HITL_RECORDS,
  CREATE_TOOL_RESPONSE_CACHE,
].join("\n");
