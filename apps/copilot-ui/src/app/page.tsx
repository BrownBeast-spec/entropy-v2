"use client";

import { useState, useCallback, useEffect, useRef, KeyboardEvent } from "react";
import { PipelineStages } from "@/components/PipelineStages";
import { HitlReviewPanel } from "@/components/HitlReviewPanel";
import { ReportDownload } from "@/components/ReportDownload";
import { submitResearch, getSession, SessionStatus } from "@/lib/api";

// ─── Types ────────────────────────────────────────────────────────────────
interface ActiveSession {
  sessionId: string;
  status: SessionStatus;
  query: string;
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

const SESSION_KEY = "entropy_active_session";

const EXAMPLES = [
  "Can metformin be repurposed for Alzheimer's disease?",
  "Could sildenafil treat pulmonary arterial hypertension in pediatric patients?",
  "Is thalidomide effective for treating multiple myeloma?",
];

function loadPersistedSession(): ActiveSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as ActiveSession) : null;
  } catch { return null; }
}

function persistSession(s: ActiveSession | null) {
  try {
    if (s) localStorage.setItem(SESSION_KEY, JSON.stringify(s));
    else localStorage.removeItem(SESSION_KEY);
  } catch { /* ignore */ }
}

// ─── Status-aware assistant message ──────────────────────────────────────
function assistantMessage(status: SessionStatus, query: string): string {
  switch (status) {
    case "pending":
    case "running":
      return `I've started researching **"${query}"**. The multi-agent pipeline is now running — you can track each agent's progress in real-time on the right.`;
    case "suspended":
      return "The pipeline has paused and needs your review before proceeding. Please check the review panel on the right.";
    case "completed":
      return "Research complete. All agents have finished their analysis. Your report is ready to download.";
    case "failed":
      return "Something went wrong during the pipeline run. You can start a new query using the input below.";
    default:
      return "Processing…";
  }
}

// ─── Chat bubble ─────────────────────────────────────────────────────────
function ChatBubble({ msg }: { msg: ChatMessage }) {
  return (
    <div className={`chat-bubble chat-bubble-${msg.role}`}>
      {msg.role === "assistant" && (
        <div className="chat-avatar">
          <span>E</span>
        </div>
      )}
      <div className="chat-content">
        <p dangerouslySetInnerHTML={{ __html: msg.content.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>") }} />
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────
export default function HomePage() {
  const [session, setSession] = useState<ActiveSession | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Restore session on mount
  useEffect(() => {
    const saved = loadPersistedSession();
    if (!saved) return;
    getSession(saved.sessionId)
      .then((res) => {
        const restored: ActiveSession = { sessionId: res.sessionId, status: res.status, query: res.query };
        setSession(restored);
        persistSession(restored);
        setMessages([
          { id: "u-0", role: "user", content: res.query },
          { id: "a-0", role: "assistant", content: assistantMessage(res.status, res.query) },
        ]);
      })
      .catch(() => persistSession(null));
  }, []);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = useCallback(async () => {
    const trimmed = query.trim();
    if (!trimmed || isLoading) return;

    setIsLoading(true);
    setError(null);
    persistSession(null);
    setSession(null);

    const userMsg: ChatMessage = { id: `u-${Date.now()}`, role: "user", content: trimmed };
    setMessages([userMsg]);
    setQuery("");

    try {
      const res = await submitResearch(trimmed);
      const newSession: ActiveSession = { sessionId: res.sessionId, status: res.status, query: trimmed };
      setSession(newSession);
      persistSession(newSession);
      setMessages((prev) => [
        ...prev,
        { id: `a-${Date.now()}`, role: "assistant", content: assistantMessage(res.status, trimmed) },
      ]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Submission failed";
      setError(msg);
      setMessages((prev) => [
        ...prev,
        { id: `a-err-${Date.now()}`, role: "assistant", content: `Error: ${msg}` },
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [query, isLoading]);

  const handleStatusChange = useCallback((status: SessionStatus) => {
    setSession((prev) => {
      if (!prev || prev.status === status) return prev;
      const next = { ...prev, status };
      persistSession(next);
      // Append assistant update message on terminal transition
      if (status === "completed" || status === "failed" || status === "suspended") {
        setMessages((msgs) => {
          const alreadyHas = msgs.some((m) => m.content.includes(status === "completed" ? "complete" : status === "failed" ? "wrong" : "paused"));
          if (alreadyHas) return msgs;
          return [...msgs, { id: `a-status-${Date.now()}`, role: "assistant", content: assistantMessage(status, prev.query) }];
        });
      }
      return next;
    });
  }, []);

  const handleReset = useCallback(() => {
    setSession(null);
    setMessages([]);
    setError(null);
    persistSession(null);
  }, []);

  const handleKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const isTerminal = session?.status === "completed" || session?.status === "failed";
  const hasSession = !!session;

  return (
    <div className="page-root">
      {/* ── Top nav ─────────────────────────────────────────────────────── */}
      <header className="top-nav">
        <div className="nav-brand">
          <div className="nav-logo">E</div>
          <span className="nav-name">Entropy</span>
          <span className="nav-tag">Multi-Agent Research</span>
        </div>
        {hasSession && (
          <button className="btn-new-query" onClick={handleReset}>
            + New Query
          </button>
        )}
      </header>

      {/* ── Body ────────────────────────────────────────────────────────── */}
      <div className="page-body">

        {/* ── Left: Chat column ─────────────────────────────────────────── */}
        <div className={`chat-col ${hasSession ? "chat-col-active" : "chat-col-landing"}`}>

          {/* Landing hero */}
          {!hasSession && (
            <div className="landing-hero">
              <div className="hero-glow" />
              <h1>
                Autonomous <span className="gradient-text">Drug Repurposing</span>
                <br />Research Platform
              </h1>
              <p>
                Submit a hypothesis and Entropy will orchestrate 7 specialized AI agents
                to produce a fully cited research dossier.
              </p>
            </div>
          )}

          {/* Chat messages */}
          {messages.length > 0 && (
            <div className="chat-messages">
              {messages.map((m) => <ChatBubble key={m.id} msg={m} />)}
              {isLoading && (
                <div className="chat-bubble chat-bubble-assistant">
                  <div className="chat-avatar"><span>E</span></div>
                  <div className="chat-content typing-indicator">
                    <span /><span /><span />
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
          )}

          {/* HITL panel inline */}
          {session?.status === "suspended" && (
            <div className="chat-inset">
              <HitlReviewPanel
                sessionId={session.sessionId}
                onDecision={() => {
                  // After Approve/Reject the pipeline runs async. Poll until
                  // the session transitions out of "suspended".
                  const poll = setInterval(() => {
                    getSession(session.sessionId)
                      .then((res) => {
                        if (res.status !== "suspended") {
                          clearInterval(poll);
                          handleStatusChange(res.status);
                        }
                      })
                      .catch(() => clearInterval(poll));
                  }, 2000);
                  // Safety-guard: stop polling after 10 min
                  setTimeout(() => clearInterval(poll), 10 * 60 * 1000);
                }}
              />
            </div>
          )}

          {/* Report download inline */}
          {session?.status === "completed" && (
            <div className="chat-inset">
              <ReportDownload sessionId={session.sessionId} />
            </div>
          )}

          {/* ── Input box ─────────────────────────────────────────────── */}
          <div className={`chat-input-wrap ${hasSession ? "chat-input-docked" : "chat-input-center"}`}>

            {/* Example chips — only on landing */}
            {!hasSession && (
              <div className="example-chips">
                {EXAMPLES.map((ex) => (
                  <button
                    key={ex}
                    className="chip"
                    onClick={() => setQuery(ex)}
                    disabled={isLoading}
                  >
                    {ex.length > 52 ? ex.slice(0, 52) + "…" : ex}
                  </button>
                ))}
              </div>
            )}

            <div className="chat-input-box">
              <textarea
                className="chat-textarea"
                placeholder="Ask a drug repurposing question… (⌘↵ to send)"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKey}
                rows={2}
                disabled={isLoading}
              />
              <button
                className="chat-send-btn"
                onClick={handleSubmit}
                disabled={!query.trim() || isLoading}
              >
                {isLoading ? <span className="btn-spinner" /> : "↑"}
              </button>
            </div>

            {error && <p className="chat-error">Error: {error}</p>}
          </div>
        </div>

        {/* ── Right: Pipeline stages panel ──────────────────────────────── */}
        {hasSession && (
          <div className="stages-col">
            <div className="stages-header">
              <span className="stages-title">Pipeline</span>
              <span className={`stages-badge badge-${session.status}`}>
                {session.status === "running" || session.status === "pending" ? (
                  <><span className="live-dot" /> Live</>
                ) : session.status === "completed" ? "Done" : session.status === "failed" ? "Failed" : "Paused"}
              </span>
            </div>
            <div className="stages-scroll">
              <PipelineStages
                sessionId={session.sessionId}
                overallStatus={session.status}
                onStatusChange={handleStatusChange}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
