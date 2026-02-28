const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export type SessionStatus =
  | "pending"
  | "running"
  | "suspended"
  | "completed"
  | "failed";

export interface AgentInfo {
  agentId: string;
  status: "pending" | "running" | "completed" | "failed";
  startedAt?: string;
  completedAt?: string;
  error?: string;
}

export interface Session {
  sessionId: string;
  status: SessionStatus;
  query: string;
  createdAt: string;
  result?: unknown;
}

export interface AgentsResponse {
  sessionId: string;
  agents: AgentInfo[];
}

export interface ReviewPayload {
  approved: boolean;
  reviewer: string;
  notes?: string;
}

export async function submitResearch(query: string): Promise<Session> {
  const res = await fetch(`${API_BASE}/api/research`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });
  if (!res.ok) throw new Error(`Submit failed: ${res.statusText}`);
  return res.json();
}

export async function getSession(sessionId: string): Promise<Session> {
  const res = await fetch(`${API_BASE}/api/research/${sessionId}`);
  if (!res.ok) throw new Error(`Fetch session failed: ${res.statusText}`);
  return res.json();
}

export async function getAgents(sessionId: string): Promise<AgentsResponse> {
  const res = await fetch(`${API_BASE}/api/research/${sessionId}/agents`);
  if (!res.ok) throw new Error(`Fetch agents failed: ${res.statusText}`);
  return res.json();
}

export async function submitReview(
  sessionId: string,
  payload: ReviewPayload,
): Promise<void> {
  const res = await fetch(`${API_BASE}/api/research/${sessionId}/review`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Review submission failed: ${res.statusText}`);
}

export function getReportUrl(sessionId: string): string {
  return `${API_BASE}/api/research/${sessionId}/report`;
}
