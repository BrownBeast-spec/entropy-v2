"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import {
  CheckCircle2,
  Circle,
  CircleDotDashed,
  CircleX,
  ChevronDown,
  ChevronRight,
  Wrench,
  Loader2,
  Microscope,
  FlaskConical,
  ShieldAlert,
  BookOpen,
  Search,
  ShieldCheck,
  Brain,
} from "lucide-react";
import { cn } from "@/lib/utils";
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

// ─── Agent icon mapping ───────────────────────────────────────────────────
const AGENT_ICONS: Record<
  string,
  React.ComponentType<{ className?: string }>
> = {
  planner: Brain,
  biologist: FlaskConical,
  "clinical-scout": Microscope,
  "hawk-safety": ShieldAlert,
  librarian: BookOpen,
  "gap-analyst": Search,
  verifier: ShieldCheck,
};

function getAgentIcon(agentId: string) {
  return AGENT_ICONS[agentId] ?? Circle;
}

// ─── Pipeline stage definitions ───────────────────────────────────────────
const STAGE_PLANNER = {
  id: "planner",
  name: "Planning",
  desc: "Decomposes the query into PICO sub-tasks",
  step: 1,
};

const STAGE_PARALLEL = [
  { id: "biologist", name: "Biologist", desc: "Molecular targets & pathways" },
  {
    id: "clinical-scout",
    name: "Clinical Scout",
    desc: "Existing trials & endpoints",
  },
  {
    id: "hawk-safety",
    name: "Hawk Safety",
    desc: "Adverse events & FDA alerts",
  },
  { id: "librarian", name: "Librarian", desc: "PubMed literature review" },
];

const STAGE_GAP = {
  id: "gap-analyst",
  name: "Gap Analyst",
  desc: "Identifies evidence gaps vs. TPP checklist",
  step: 3,
};

const STAGE_VERIFIER = {
  id: "verifier",
  name: "Verifier",
  desc: "Cross-checks all claims for accuracy",
  step: 4,
};

// ─── Status icon component ────────────────────────────────────────────────
function StatusIcon({
  status,
  size = "md",
}: {
  status: AgentStatus;
  size?: "sm" | "md";
}) {
  const sizeClass = size === "sm" ? "w-3.5 h-3.5" : "w-4.5 h-4.5";
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={status}
        initial={{ opacity: 0, scale: 0.8, rotate: -10 }}
        animate={{ opacity: 1, scale: 1, rotate: 0 }}
        exit={{ opacity: 0, scale: 0.8, rotate: 10 }}
        transition={{ duration: 0.2, ease: [0.2, 0.65, 0.3, 0.9] }}
      >
        {status === "completed" ? (
          <CheckCircle2 className={cn(sizeClass, "text-[#69db7c]")} />
        ) : status === "running" ? (
          <CircleDotDashed className={cn(sizeClass, "text-[#748ffc]")} />
        ) : status === "failed" ? (
          <CircleX className={cn(sizeClass, "text-[#ff6b6b]")} />
        ) : (
          <Circle className={cn(sizeClass, "text-text-muted")} />
        )}
      </motion.div>
    </AnimatePresence>
  );
}

// ─── Status badge ──────────────────────────────────────────────────────────
function AgentStatusBadge({ status }: { status: AgentStatus }) {
  const styles: Record<AgentStatus, string> = {
    completed: "bg-[#69db7c]/10 text-[#69db7c]",
    running: "bg-[#748ffc]/10 text-[#748ffc]",
    failed: "bg-[#ff6b6b]/10 text-[#ff6b6b]",
    pending: "bg-white/5 text-text-muted",
  };

  return (
    <motion.span
      className={cn(
        "rounded px-1.5 py-0.5 text-[10px] font-medium",
        styles[status],
      )}
      key={status}
      initial={{ scale: 1 }}
      animate={{ scale: [1, 1.08, 1] }}
      transition={{ duration: 0.35, ease: [0.34, 1.56, 0.64, 1] }}
    >
      {status}
    </motion.span>
  );
}

// ─── Tool call chip ────────────────────────────────────────────────────────
function ToolCallChip({ event }: { event: ActivityEvent }) {
  const [open, setOpen] = useState(false);
  const isCall = event.type === "tool:call";
  const isResult = event.type === "tool:result";

  return (
    <div className="rounded border border-border-subtle overflow-hidden">
      <button
        className={cn(
          "flex items-center gap-1.5 px-2 py-1 w-full text-left transition-colors",
          isCall && "bg-accent/5",
          isResult && "bg-accent-success/5",
          !isCall && !isResult && "bg-transparent",
          event.detail
            ? "cursor-pointer hover:bg-white/[0.025]"
            : "cursor-default",
        )}
        onClick={() => event.detail && setOpen((v) => !v)}
      >
        <Wrench
          className={cn(
            "w-3 h-3 shrink-0",
            isCall
              ? "text-[#748ffc]"
              : isResult
                ? "text-[#69db7c]"
                : "text-text-muted",
          )}
        />
        <span className="font-mono text-[11px] text-text-secondary flex-1 truncate">
          {event.toolName ?? event.message}
        </span>
        {event.detail && (
          <ChevronDown
            className={cn(
              "w-3 h-3 text-text-muted transition-transform",
              open && "rotate-180",
            )}
          />
        )}
      </button>
      <AnimatePresence>
        {open && event.detail && (
          <motion.pre
            className="px-2.5 py-2 font-mono text-[10px] text-text-secondary bg-bg-deep border-t border-border-subtle overflow-x-auto whitespace-pre-wrap break-all max-h-[150px] overflow-y-auto leading-relaxed"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {event.detail}
          </motion.pre>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Single agent row ──────────────────────────────────────────────────────
function AgentRow({
  agentId,
  name,
  desc,
  status,
  events,
}: {
  agentId: string;
  name: string;
  desc: string;
  status: AgentStatus;
  events: ActivityEvent[];
}) {
  const [expanded, setExpanded] = useState(true);
  const Icon = getAgentIcon(agentId);

  const toolEvents = events.filter(
    (e) =>
      e.agentId === agentId &&
      (e.type === "tool:call" || e.type === "tool:result"),
  );

  const stepEvents = events.filter(
    (e) =>
      e.agentId === agentId &&
      (e.type === "step:start" ||
        e.type === "step:done" ||
        e.type === "step:fail"),
  );

  const hasContent = toolEvents.length > 0 || stepEvents.length > 0;

  return (
    <motion.div
      className={cn(
        "rounded-md border overflow-hidden transition-colors",
        status === "running" && "border-accent/20",
        status === "completed" && "border-accent-success/15",
        status === "failed" && "border-accent-error/15",
        status === "pending" && "border-border-subtle",
      )}
      layout
    >
      <motion.div
        className="flex items-center justify-between px-3.5 py-2 cursor-pointer select-none hover:bg-white/[0.025] transition-colors"
        onClick={() => setExpanded((v) => !v)}
        whileHover={{ backgroundColor: "rgba(255,255,255,0.025)" }}
      >
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          <StatusIcon status={status} size="sm" />
          <Icon className="w-3.5 h-3.5 text-text-muted shrink-0" />
          <div className="flex flex-col gap-px min-w-0">
            <span className="text-xs font-semibold text-text-primary truncate">
              {name}
            </span>
            <span className="text-[10px] text-text-muted truncate">{desc}</span>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {status === "running" && (
            <Loader2 className="w-3 h-3 text-[#748ffc] animate-spin" />
          )}
          <AgentStatusBadge status={status} />
          {toolEvents.length > 0 && (
            <span className="text-[10px] font-medium font-mono text-text-muted bg-bg-deep border border-border-default rounded px-1 py-px">
              {toolEvents.length}
            </span>
          )}
          {hasContent &&
            (expanded ? (
              <ChevronDown className="w-3 h-3 text-text-muted" />
            ) : (
              <ChevronRight className="w-3 h-3 text-text-muted" />
            ))}
        </div>
      </motion.div>

      <AnimatePresence>
        {expanded && hasContent && (
          <motion.div
            className="border-t border-border-subtle px-3 py-2 flex flex-col gap-1.5"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{
              duration: 0.25,
              ease: [0.2, 0.65, 0.3, 0.9],
            }}
          >
            {stepEvents.map((e) => (
              <div
                key={e.id}
                className="flex items-center gap-1.5 px-1 py-0.5 rounded"
              >
                {e.type === "step:done" ? (
                  <CheckCircle2 className="w-2.5 h-2.5 text-[#69db7c] shrink-0" />
                ) : e.type === "step:fail" ? (
                  <CircleX className="w-2.5 h-2.5 text-[#ff6b6b] shrink-0" />
                ) : (
                  <Circle className="w-2.5 h-2.5 text-text-muted shrink-0" />
                )}
                <span className="text-[11px] text-text-secondary leading-snug">
                  {e.message}
                </span>
              </div>
            ))}
            {toolEvents.map((e) => (
              <ToolCallChip key={e.id} event={e} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
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
    <motion.div
      className={cn(
        "rounded-md border bg-bg-card overflow-hidden transition-colors",
        isActive ? "border-border-default" : "border-border-subtle",
      )}
      initial={{ opacity: 0, y: -5 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 500, damping: 30 }}
    >
      <div
        className={cn(
          "flex items-center gap-2.5 px-4 py-3 border-b",
          isActive ? "border-border-default" : "border-border-subtle",
        )}
      >
        <div className="w-5 h-5 rounded-full bg-accent/10 text-[#748ffc] text-[10px] font-semibold flex items-center justify-center shrink-0">
          {stepNum}
        </div>
        <div className="flex flex-col gap-px">
          <span className="text-[13px] font-semibold text-text-primary">
            {label}
          </span>
          {sublabel && (
            <span className="text-[11px] text-text-muted">{sublabel}</span>
          )}
        </div>
      </div>
      <div className="p-3 flex flex-col gap-1.5">{children}</div>
    </motion.div>
  );
}

// ─── Stage connector ───────────────────────────────────────────────────────
function StageConnector({ active }: { active: boolean }) {
  return (
    <div
      className={cn(
        "w-px h-4 mx-auto transition-colors",
        active ? "bg-accent/25" : "bg-border-subtle",
      )}
    />
  );
}

// ─── Main component ────────────────────────────────────────────────────────
interface PipelineStagesProps {
  sessionId: string;
  overallStatus: SessionStatus;
  onStatusChange: (s: SessionStatus) => void;
}

export function PipelineStages({
  sessionId,
  overallStatus,
  onStatusChange,
}: PipelineStagesProps) {
  const [agentStatuses, setAgentStatuses] = useState<
    Record<string, AgentStatus>
  >({});
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const esRef = useRef<EventSource | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const isTerminal =
    overallStatus === "completed" || overallStatus === "failed";

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
      } catch {
        /* silently retry */
      }
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
      } catch {
        /* ignore */
      }
    };

    return () => {
      es.close();
      esRef.current = null;
    };
  }, [sessionId, isTerminal]);

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [events.length]);

  const st = (id: string): AgentStatus => agentStatuses[id] ?? "pending";

  const plannerActive = st("planner") !== "pending";
  const parallelActive = STAGE_PARALLEL.some((a) => st(a.id) !== "pending");
  const gapActive = st("gap-analyst") !== "pending";
  const verifierActive = st("verifier") !== "pending";

  return (
    <motion.div
      className="flex flex-col"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.2, 0.65, 0.3, 0.9] }}
    >
      <LayoutGroup>
        {/* ── Step 1: Planning ───────────────────────────────────── */}
        <StageBlock
          stepNum={1}
          label="Planning"
          sublabel="Decomposing query into research sub-tasks"
          isActive={plannerActive}
        >
          <AgentRow
            agentId="planner"
            name={STAGE_PLANNER.name}
            desc={STAGE_PLANNER.desc}
            status={st("planner")}
            events={events}
          />
        </StageBlock>

        <StageConnector active={parallelActive} />

        {/* ── Step 2: Parallel Research ──────────────────────────── */}
        <StageBlock
          stepNum={2}
          label="Parallel Research"
          sublabel="4 agents running simultaneously"
          isActive={parallelActive}
        >
          <div className="flex flex-col gap-1.5">
            {STAGE_PARALLEL.map((a) => (
              <AgentRow
                key={a.id}
                agentId={a.id}
                name={a.name}
                desc={a.desc}
                status={st(a.id)}
                events={events}
              />
            ))}
          </div>
        </StageBlock>

        <StageConnector active={gapActive} />

        {/* ── Step 3: Gap Analysis ──────────────────────────────── */}
        <StageBlock
          stepNum={3}
          label="Gap Analysis"
          sublabel="Identifying evidence gaps vs. TPP"
          isActive={gapActive}
        >
          <AgentRow
            agentId="gap-analyst"
            name={STAGE_GAP.name}
            desc={STAGE_GAP.desc}
            status={st("gap-analyst")}
            events={events}
          />
        </StageBlock>

        <StageConnector active={verifierActive} />

        {/* ── Step 4: Verification ──────────────────────────────── */}
        <StageBlock
          stepNum={4}
          label="Verification"
          sublabel="Cross-checking all claims"
          isActive={verifierActive}
        >
          <AgentRow
            agentId="verifier"
            name={STAGE_VERIFIER.name}
            desc={STAGE_VERIFIER.desc}
            status={st("verifier")}
            events={events}
          />
        </StageBlock>
      </LayoutGroup>

      <div ref={bottomRef} />
    </motion.div>
  );
}
