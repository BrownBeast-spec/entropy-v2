"use client";

import { useEffect, useRef, useState, useCallback } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export interface ActivityEvent {
  id: string;
  ts: number;
  type: string;
  agentId: string;
  toolName?: string;
  message: string;
  detail?: string;
}

interface Props {
  sessionId: string;
  /** Stop streaming once the parent says the session is terminal */
  isTerminal: boolean;
}

const TYPE_STYLE: Record<string, { icon: string; color: string }> = {
  "step:start":      { icon: "▶", color: "var(--accent)" },
  "step:done":       { icon: "✓", color: "#4ade80" },
  "step:fail":       { icon: "✗", color: "#f87171" },
  "tool:call":       { icon: "⚙", color: "#a78bfa" },
  "tool:result":     { icon: "↩", color: "#818cf8" },
  "hitl:suspended":  { icon: "⏸", color: "#fbbf24" },
  "pipeline:done":   { icon: "🏁", color: "#4ade80" },
  "pipeline:fail":   { icon: "💥", color: "#f87171" },
};

const AGENT_LABELS: Record<string, string> = {
  planner:         "Planner",
  biologist:       "Biologist",
  "clinical-scout":"Clinical Scout",
  "hawk-safety":   "Hawk Safety",
  librarian:       "Librarian",
  "gap-analyst":   "Gap Analyst",
  verifier:        "Verifier",
  pipeline:        "Pipeline",
};

function relTime(ts: number) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  return "long ago";
}

export function AgentActivityFeed({ sessionId, isTerminal }: Props) {
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const bottomRef = useRef<HTMLDivElement>(null);
  const esRef = useRef<EventSource | null>(null);

  const toggleExpand = useCallback((id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

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
          // Deduplicate by id
          if (prev.some((p) => p.id === evt.id)) return prev;
          return [...prev, evt];
        });
      } catch {/* ignore bad frames */}
    };

    es.onerror = () => {
      // quietly retry — browser handles SSE reconnection automatically
    };

    return () => {
      es.close();
      esRef.current = null;
    };
  }, [sessionId, isTerminal]);

  // Auto-scroll to bottom on new events
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [events.length]);

  if (events.length === 0) return null;

  return (
    <div className="activity-feed animate-in">
      <div className="activity-feed-header">
        <span className="section-label" style={{ margin: 0 }}>Live Activity</span>
        {!isTerminal && (
          <span className="feed-live-badge">
            <span className="feed-live-dot" />
            LIVE
          </span>
        )}
      </div>

      <div className="activity-feed-body">
        {events.map((ev) => {
          const style = TYPE_STYLE[ev.type] ?? { icon: "·", color: "var(--text-muted)" };
          const isExpanded = expanded.has(ev.id);

          return (
            <div key={ev.id} className={`feed-entry feed-type-${ev.type.replace(":", "-")}`}>
              <div className="feed-entry-row">
                <span className="feed-icon" style={{ color: style.color }}>
                  {style.icon}
                </span>
                <div className="feed-main">
                  <span className="feed-message">{ev.message}</span>
                  <div className="feed-meta">
                    <span className="feed-agent">{AGENT_LABELS[ev.agentId] ?? ev.agentId}</span>
                    {ev.toolName && (
                      <span className="feed-tool">{ev.toolName}</span>
                    )}
                    <span className="feed-time">{relTime(ev.ts)}</span>
                  </div>
                </div>
                {ev.detail && (
                  <button
                    className="feed-expand-btn"
                    onClick={() => toggleExpand(ev.id)}
                    aria-label={isExpanded ? "Collapse" : "Expand"}
                  >
                    {isExpanded ? "▲" : "▼"}
                  </button>
                )}
              </div>

              {ev.detail && isExpanded && (
                <pre className="feed-detail">{ev.detail}</pre>
              )}
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
