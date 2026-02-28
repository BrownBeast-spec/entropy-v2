"use client";

import { useEffect, useState } from "react";
import { getSession, getAgents, SessionStatus } from "@/lib/api";

const AGENT_META: Record<
  string,
  { icon: string; name: string; desc: string }
> = {
  planner: { icon: "🧭", name: "Planner", desc: "Decomposes query into PICO sub-tasks" },
  biologist: { icon: "🧬", name: "Biologist", desc: "Molecular targets & pathways" },
  "clinical-scout": { icon: "🏥", name: "Clinical Scout", desc: "Existing trials & endpoints" },
  "hawk-safety": { icon: "🦅", name: "Hawk Safety", desc: "Adverse events & FDA alerts" },
  librarian: { icon: "📚", name: "Librarian", desc: "PubMed literature review" },
  "gap-analyst": { icon: "🔍", name: "Gap Analyst", desc: "Evidence gaps vs. TPP checklist" },
  verifier: { icon: "✅", name: "Verifier", desc: "Cross-checks claims for accuracy" },
};

const AGENT_ORDER = Object.keys(AGENT_META);

type AgentStatus = "pending" | "running" | "completed" | "failed";

interface PipelineStatusProps {
  sessionId: string;
  overallStatus: SessionStatus;
  onStatusChange: (status: SessionStatus) => void;
}

export function PipelineStatus({
  sessionId,
  overallStatus,
  onStatusChange,
}: PipelineStatusProps) {
  // agentStatuses is a flat map: agentId → status
  const [agentStatuses, setAgentStatuses] = useState<Record<string, AgentStatus>>(
    () => Object.fromEntries(AGENT_ORDER.map((id) => [id, "pending" as AgentStatus])),
  );

  useEffect(() => {
    if (overallStatus === "completed" || overallStatus === "failed") return;

    const poll = async () => {
      try {
        const [sessionRes, agentsRes] = await Promise.all([
          getSession(sessionId),
          getAgents(sessionId),
        ]);
        onStatusChange(sessionRes.status);

        // The API returns agents as either:
        //   - an object: { planner: { status }, biologist: { status }, ... }
        //   - an array: [{ agentId, status }, ...]
        // Normalise both shapes into a flat Record<id, status>.
        const raw = agentsRes.agents as
          | Record<string, { status: AgentStatus }>
          | Array<{ agentId: string; status: AgentStatus }>;

        if (Array.isArray(raw)) {
          setAgentStatuses((prev) => {
            const next = { ...prev };
            for (const a of raw) next[a.agentId] = a.status;
            return next;
          });
        } else if (raw && typeof raw === "object") {
          setAgentStatuses((prev) => {
            const next = { ...prev };
            for (const [id, val] of Object.entries(raw)) {
              if (val?.status) next[id] = val.status;
            }
            return next;
          });
        }
      } catch {
        // silently retry
      }
    };

    poll();
    const interval = setInterval(poll, 2000);
    return () => clearInterval(interval);
  }, [sessionId, overallStatus, onStatusChange]);

  const statusLabel: Record<SessionStatus, string> = {
    pending: "Pending",
    running: "Running pipeline…",
    suspended: "Awaiting review",
    completed: "Completed",
    failed: "Failed",
  };

  return (
    <div className="pipeline-section animate-in">
      <div className="pipeline-header">
        <p className="section-label">Research Pipeline</p>
        <div className="session-meta">
          <span className="session-id-badge">{sessionId.slice(0, 12)}…</span>
          <span className={`pipeline-overall-status status-${overallStatus}`}>
            {statusLabel[overallStatus]}
          </span>
        </div>
      </div>

      <div className="agent-grid">
        {AGENT_ORDER.map((agentId) => {
          const meta = AGENT_META[agentId];
          const status = agentStatuses[agentId] ?? "pending";

          return (
            <div key={agentId} className={`agent-card card-${status}`}>
              <div className="agent-card-header">
                <span className="agent-icon">{meta.icon}</span>
                <span className={`agent-status-dot dot-${status}`} />
              </div>
              <div className="agent-name">{meta.name}</div>
              <div className="agent-desc">{meta.desc}</div>
              <div className={`agent-status-label label-${status}`}>
                {status === "running" ? "Analysing…"
                  : status === "completed" ? "Done"
                  : status === "failed" ? "Error"
                  : "Waiting"}
              </div>
              {status === "running" && (
                <div className="progress-track">
                  <div className="progress-fill" />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
