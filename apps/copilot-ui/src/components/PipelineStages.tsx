"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { getSession, getAgents, SessionStatus } from "@/lib/api";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

// ─── Types ────────────────────────────────────────────────────────────────
export type AgentStatus = "pending" | "running" | "completed" | "failed";

export interface ActivityEvent {
  id: string;
  ts: number;
  type: string;
  agentId: string;
  toolName?: string;
  message: string;
  detail?: string;
}

// ─── Pipeline stage definitions ───────────────────────────────────────────
const STAGE_PLANNER = {
  id: "planner",
  icon: "Pl",
  name: "Planning",
  desc: "Decomposes the query into PICO sub-tasks",
  step: 1,
};

const STAGE_PARALLEL = [
  { id: "biologist",      icon: "Bio",  name: "Biologist",      desc: "Molecular targets & pathways" },
  { id: "clinical-scout", icon: "Clin", name: "Clinical Scout",  desc: "Existing trials & endpoints" },
  { id: "hawk-safety",    icon: "Hawk", name: "Hawk Safety",     desc: "Adverse events & FDA alerts" },
  { id: "librarian",      icon: "Lib",  name: "Librarian",       desc: "PubMed literature review" },
];

const STAGE_GAP = {
  id: "gap-analyst",
  icon: "Gap",
  name: "Gap Analyst",
  desc: "Identifies evidence gaps vs. TPP checklist",
  step: 3,
};

const STAGE_VERIFIER = {
  id: "verifier",
  icon: "Ver",
  name: "Verifier",
  desc: "Cross-checks all claims for accuracy",
  step: 4,
};

// ─── Tool call chip ────────────────────────────────────────────────────────
function ToolCallChip({ event }: { event: ActivityEvent }) {
  const [open, setOpen] = useState(false);
  const isCall = event.type === "tool:call";
  const isResult = event.type === "tool:result";

  return (
    <div className="tool-chip">
      <button
        className={`tool-chip-row ${isCall ? "tool-chip-call" : isResult ? "tool-chip-result" : "tool-chip-other"}`}
        onClick={() => event.detail && setOpen((v) => !v)}
        style={{ cursor: event.detail ? "pointer" : "default" }}
      >
        <span className="tool-chip-icon">{isCall ? "fn" : isResult ? "->" : "."}</span>
        <span className="tool-chip-name">{event.toolName ?? event.message}</span>
        {event.detail && (
          <span className="tool-chip-toggle">{open ? "▲" : "▼"}</span>
        )}
      </button>
      {open && event.detail && (
        <pre className="tool-chip-detail">{event.detail}</pre>
      )}
    </div>
  );
}

// ─── Single agent row ──────────────────────────────────────────────────────
function AgentRow({
  agentId,
  icon,
  name,
  desc,
  status,
  events,
}: {
  agentId: string;
  icon: string;
  name: string;
  desc: string;
  status: AgentStatus;
  events: ActivityEvent[];
}) {
  const [expanded, setExpanded] = useState(true);

  const toolEvents = events.filter(
    (e) => e.agentId === agentId && (e.type === "tool:call" || e.type === "tool:result")
  );

  const stepEvents = events.filter(
    (e) => e.agentId === agentId && (e.type === "step:start" || e.type === "step:done" || e.type === "step:fail")
  );

  return (
    <div className={`agent-row agent-row-${status}`}>
      <div className="agent-row-header" onClick={() => setExpanded((v) => !v)}>
        <div className="agent-row-left">
          <span className={`agent-row-dot dot-${status}`} />
          <div className="agent-row-info">
            <span className="agent-row-name">{name}</span>
            <span className="agent-row-desc">{desc}</span>
          </div>
        </div>
        <div className="agent-row-right">
          {status === "running" && <span className="agent-row-spinner" />}
          {status === "completed" && <span className="agent-row-check">done</span>}
          {status === "failed" && <span className="agent-row-fail">fail</span>}
          {toolEvents.length > 0 && (
            <span className="agent-row-count">{toolEvents.length} calls</span>
          )}
          {(toolEvents.length > 0 || stepEvents.length > 0) && (
            <span className="agent-row-toggle">{expanded ? "▲" : "▼"}</span>
          )}
        </div>
      </div>

      {expanded && (toolEvents.length > 0 || stepEvents.length > 0) && (
        <div className="agent-row-body">
          {stepEvents.map((e) => (
            <div key={e.id} className={`step-event step-${e.type.replace(":", "-")}`}>
              <span className="step-event-icon">
                {e.type === "step:done" ? "+" : e.type === "step:fail" ? "-" : ">"}
              </span>
              <span className="step-event-msg">{e.message}</span>
            </div>
          ))}
          {toolEvents.map((e) => (
            <ToolCallChip key={e.id} event={e} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Stage block ───────────────────────────────────────────────────────────
function StageBlock({
  stepNum,
  label,
  sublabel,
  isActive,
  children,
}: {
  stepNum: number;
  label: string;
  sublabel?: string;
  isActive: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={`stage-block ${isActive ? "stage-active" : ""}`}>
      <div className="stage-header">
        <div className="stage-step-badge">{stepNum}</div>
        <div className="stage-meta">
          <span className="stage-label">{label}</span>
          {sublabel && <span className="stage-sublabel">{sublabel}</span>}
        </div>
      </div>
      <div className="stage-body">{children}</div>
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────
interface PipelineStagesProps {
  sessionId: string;
  overallStatus: SessionStatus;
  onStatusChange: (s: SessionStatus) => void;
}

export function PipelineStages({ sessionId, overallStatus, onStatusChange }: PipelineStagesProps) {
  const [agentStatuses, setAgentStatuses] = useState<Record<string, AgentStatus>>({});
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const esRef = useRef<EventSource | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const isTerminal = overallStatus === "completed" || overallStatus === "failed";

  // ── Poll agent statuses ──────────────────────────────────────────────────
  useEffect(() => {
    if (isTerminal) return;

    const poll = async () => {
      try {
        const [sessionRes, agentsRes] = await Promise.all([
          getSession(sessionId),
          getAgents(sessionId),
        ]);
        onStatusChange(sessionRes.status);

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
      } catch { /* silently retry */ }
    };

    poll();
    const interval = setInterval(poll, 2000);
    return () => clearInterval(interval);
  }, [sessionId, isTerminal, onStatusChange]);

  // ── SSE activity stream ──────────────────────────────────────────────────
  useEffect(() => {
    if (isTerminal && esRef.current) {
      esRef.current.close();
      return;
    }

    const url = `${API_BASE}/api/research/${sessionId}/stream`;
    const es = new EventSource(url);
    esRef.current = es;

    es.onmessage = (e) => {
      try {
        const evt = JSON.parse(e.data) as ActivityEvent;
        setEvents((prev) => {
          if (prev.some((p) => p.id === evt.id)) return prev;
          return [...prev, evt];
        });
      } catch { /* ignore */ }
    };

    return () => { es.close(); esRef.current = null; };
  }, [sessionId, isTerminal]);

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [events.length]);

  const st = (id: string): AgentStatus => agentStatuses[id] ?? "pending";

  // Determine which stages are "active" (have any activity)
  const plannerActive = st("planner") !== "pending";
  const parallelActive = STAGE_PARALLEL.some((a) => st(a.id) !== "pending");
  const gapActive = st("gap-analyst") !== "pending";
  const verifierActive = st("verifier") !== "pending";

  return (
    <div className="pipeline-stages">
      {/* ── Step 1: Planning ───────────────────────────────────────────── */}
      <StageBlock stepNum={1} label="Planning" sublabel="Decomposing query into research sub-tasks" isActive={plannerActive}>
        <AgentRow
          agentId="planner"
          icon={STAGE_PLANNER.icon}
          name={STAGE_PLANNER.name}
          desc={STAGE_PLANNER.desc}
          status={st("planner")}
          events={events}
        />
      </StageBlock>

      {/* ── Stage connector ─────────────────────────────────────────────── */}
      <div className={`stage-connector ${parallelActive ? "connector-active" : ""}`} />

      {/* ── Step 2: Parallel Research ───────────────────────────────────── */}
      <StageBlock stepNum={2} label="Parallel Research" sublabel="4 agents running simultaneously" isActive={parallelActive}>
        <div className="parallel-agents">
          {STAGE_PARALLEL.map((a) => (
            <AgentRow
              key={a.id}
              agentId={a.id}
              icon={a.icon}
              name={a.name}
              desc={a.desc}
              status={st(a.id)}
              events={events}
            />
          ))}
        </div>
      </StageBlock>

      {/* ── Stage connector ─────────────────────────────────────────────── */}
      <div className={`stage-connector ${gapActive ? "connector-active" : ""}`} />

      {/* ── Step 3: Gap Analysis ────────────────────────────────────────── */}
      <StageBlock stepNum={3} label="Gap Analysis" sublabel="Identifying evidence gaps vs. TPP" isActive={gapActive}>
        <AgentRow
          agentId="gap-analyst"
          icon={STAGE_GAP.icon}
          name={STAGE_GAP.name}
          desc={STAGE_GAP.desc}
          status={st("gap-analyst")}
          events={events}
        />
      </StageBlock>

      {/* ── Stage connector ─────────────────────────────────────────────── */}
      <div className={`stage-connector ${verifierActive ? "connector-active" : ""}`} />

      {/* ── Step 4: Verification ────────────────────────────────────────── */}
      <StageBlock stepNum={4} label="Verification" sublabel="Cross-checking all claims" isActive={verifierActive}>
        <AgentRow
          agentId="verifier"
          icon={STAGE_VERIFIER.icon}
          name={STAGE_VERIFIER.name}
          desc={STAGE_VERIFIER.desc}
          status={st("verifier")}
          events={events}
        />
      </StageBlock>

      <div ref={bottomRef} />
    </div>
  );
}
