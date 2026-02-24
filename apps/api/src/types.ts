export type SessionStatus = "running" | "suspended" | "completed" | "failed";

export type AgentName =
  | "planner"
  | "biologist"
  | "clinical-scout"
  | "hawk-safety"
  | "librarian"
  | "gap-analyst"
  | "verifier";

export interface AgentStatus {
  status: "pending" | "running" | "completed" | "failed";
}

export interface SessionState {
  sessionId: string;
  query: string;
  status: SessionStatus;
  createdAt: string;
  result: unknown | null;
  agents: Record<AgentName, AgentStatus>;
  reportTexPath?: string;
}
