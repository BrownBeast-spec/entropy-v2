import type { SessionState, AgentName } from "../types.js";

const AGENT_NAMES: AgentName[] = [
  "planner",
  "biologist",
  "clinical-scout",
  "hawk-safety",
  "librarian",
  "gap-analyst",
  "verifier",
];

function defaultAgents(): Record<
  AgentName,
  { status: "pending" | "running" | "completed" | "failed" }
> {
  return Object.fromEntries(
    AGENT_NAMES.map((name) => [name, { status: "pending" }]),
  ) as Record<
    AgentName,
    { status: "pending" | "running" | "completed" | "failed" }
  >;
}

const store = new Map<string, SessionState>();

export function createSession(query: string): SessionState {
  const sessionId = `ses_${Math.random().toString(36).slice(2, 10)}`;
  const session: SessionState = {
    sessionId,
    query,
    status: "running",
    createdAt: new Date().toISOString(),
    result: null,
    agents: defaultAgents(),
  };
  store.set(sessionId, session);
  return session;
}

export function getSession(sessionId: string): SessionState | undefined {
  return store.get(sessionId);
}

export function updateSession(
  sessionId: string,
  updates: Partial<SessionState>,
): SessionState | undefined {
  const session = store.get(sessionId);
  if (!session) return undefined;
  const updated = { ...session, ...updates };
  store.set(sessionId, updated);
  return updated;
}

export function clearStore(): void {
  store.clear();
}
