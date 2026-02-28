"use client";

import { useState, useCallback, useEffect } from "react";
import { ResearchInput } from "@/components/ResearchInput";
import { PipelineStatus } from "@/components/PipelineStatus";
import { HitlReviewPanel } from "@/components/HitlReviewPanel";
import { ReportDownload } from "@/components/ReportDownload";
import { CopilotSidebar } from "@/components/CopilotSidebar";
import { AgentActivityFeed } from "@/components/AgentActivityFeed";
import { submitResearch, getSession, SessionStatus } from "@/lib/api";

interface ActiveSession {
  sessionId: string;
  status: SessionStatus;
  query: string;
}

const SESSION_KEY = "entropy_active_session";

function loadPersistedSession(): ActiveSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as ActiveSession) : null;
  } catch {
    return null;
  }
}

function persistSession(session: ActiveSession | null) {
  try {
    if (session) {
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    } else {
      localStorage.removeItem(SESSION_KEY);
    }
  } catch {
    // ignore
  }
}

export default function HomePage() {
  const [session, setSession] = useState<ActiveSession | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Restore session from localStorage on first render
  useEffect(() => {
    const saved = loadPersistedSession();
    if (!saved) return;

    // Re-verify the session still exists on the API before restoring
    getSession(saved.sessionId)
      .then((res) => {
        const restored: ActiveSession = {
          sessionId: res.sessionId,
          status: res.status,
          query: res.query,
        };
        setSession(restored);
        persistSession(restored);
      })
      .catch(() => {
        // Server restarted — session is gone, clear it
        persistSession(null);
      });
  }, []);

  const handleSubmit = useCallback(async (query: string) => {
    setIsLoading(true);
    setError(null);
    persistSession(null);
    setSession(null);

    try {
      const res = await submitResearch(query);
      const newSession: ActiveSession = {
        sessionId: res.sessionId,
        status: res.status,
        query,
      };
      setSession(newSession);
      persistSession(newSession);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submission failed");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleStatusChange = useCallback((status: SessionStatus) => {
    setSession((prev) => {
      if (!prev || prev.status === status) return prev;
      const next = { ...prev, status };
      persistSession(next);
      return next;
    });
  }, []);

  const handleReviewDecision = useCallback(() => {
    // Don't flip to "running" — leave the real status from the poll to settle.
    // The HITL panel will hide itself naturally once the session moves to
    // "running" (resumed) → "completed" via the next poll.
  }, []);

  const handleReset = useCallback(() => {
    setSession(null);
    setError(null);
    persistSession(null);
  }, []);

  const isTerminal =
    session?.status === "completed" || session?.status === "failed";

  return (
    <div className="app-root">
      {/* ── Header ────────────────────────────────────────────── */}
      <header className="app-header">
        <div className="header-brand">
          <div className="header-logo">E</div>
          <div className="header-title">
            <span>Entropy</span>
          </div>
        </div>
        <span className="header-badge">Multi-Agent Research</span>
      </header>

      <div className="main-layout">
        <main className={`main-content ${sidebarOpen ? "sidebar-open" : ""}`}>

          {/* ── No active session: show query input ─────────────── */}
          {!session && (
            <ResearchInput onSubmit={handleSubmit} isLoading={isLoading} />
          )}

          {/* ── Error ────────────────────────────────────────────── */}
          {error && (
            <div
              className="glass-panel animate-in"
              style={{
                padding: "20px 24px",
                borderColor: "rgba(239,68,68,0.3)",
                marginBottom: 32,
              }}
            >
              <strong style={{ color: "var(--accent-error)" }}>⚠ Error: </strong>
              {error}
              <button onClick={handleReset} style={{ marginLeft: 16, background: "none", border: "1px solid var(--border)", color: "var(--text-secondary)", borderRadius: "var(--radius-sm)", padding: "4px 10px", cursor: "pointer", fontFamily: "inherit", fontSize: 13 }}>
                Reset
              </button>
            </div>
          )}

          {/* ── Active pipeline session ───────────────────────────── */}
          {session && (
            <>
              {/* Active query pill */}
              <div className="animate-in" style={{ marginBottom: 32 }}>
                <p className="section-label">Active Query</p>
                <div className="glass-panel" style={{ padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
                  <p style={{ fontSize: 15, fontStyle: "italic", color: "var(--text-secondary)" }}>
                    &ldquo;{session.query}&rdquo;
                  </p>
                  <button onClick={handleReset} style={{ background: "none", border: "1px solid var(--border)", color: "var(--text-muted)", borderRadius: "var(--radius-sm)", padding: "4px 10px", cursor: "pointer", fontFamily: "inherit", fontSize: 12, whiteSpace: "nowrap" }}>
                    New query
                  </button>
                </div>
              </div>

              {/* Pipeline agent grid — always shown while session active */}
              <PipelineStatus
                sessionId={session.sessionId}
                overallStatus={session.status}
                onStatusChange={handleStatusChange}
              />

              {/* Live agent activity feed — shows tool calls, step events, etc. */}
              <AgentActivityFeed
                sessionId={session.sessionId}
                isTerminal={isTerminal}
              />

              {/* HITL review — shown only when workflow is suspended */}
              {session.status === "suspended" && (
                <HitlReviewPanel
                  sessionId={session.sessionId}
                  onDecision={handleReviewDecision}
                />
              )}

              {/* Report download — shown when completed */}
              {session.status === "completed" && (
                <ReportDownload sessionId={session.sessionId} />
              )}

              {/* Running / pending status message (don't show when HITL or complete) */}
              {(session.status === "running" || session.status === "pending") && (
                <div className="empty-state">
                  <div className="empty-state-icon">⚛</div>
                  <h3>Pipeline is running</h3>
                  <p>
                    7 specialized agents are working on your research query.
                    <br />
                    Results will appear here automatically.
                  </p>
                </div>
              )}

              {/* Failed state */}
              {session.status === "failed" && (
                <div className="empty-state">
                  <div className="empty-state-icon" style={{ color: "var(--accent-error)" }}>✕</div>
                  <h3 style={{ color: "var(--accent-error)" }}>Pipeline failed</h3>
                  <p>Something went wrong. Check the API logs, then try a new query.</p>
                  <button onClick={handleReset} style={{ marginTop: 16, padding: "8px 20px", background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text-secondary)", borderRadius: "var(--radius-md)", cursor: "pointer", fontFamily: "inherit", fontSize: 14 }}>
                    New query
                  </button>
                </div>
              )}
            </>
          )}

          {/* ── Empty landing state ───────────────────────────────── */}
          {!session && !isLoading && !error && (
            <div className="empty-state" style={{ marginTop: 32 }}>
              <div className="empty-state-icon">🧪</div>
              <h3>Ready to research</h3>
              <p>
                Enter a drug repurposing hypothesis above to start the
                autonomous multi-agent pipeline.
              </p>
            </div>
          )}
        </main>

        <CopilotSidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen((v) => !v)}
        />
      </div>
    </div>
  );
}
