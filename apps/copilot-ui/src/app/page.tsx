"use client";

import { useState, useCallback, useEffect, useRef, KeyboardEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Atom,
  Plus,
  ArrowUp,
  Loader2,
  FlaskConical,
  Microscope,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
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
  {
    icon: FlaskConical,
    text: "Can metformin be repurposed for Alzheimer's disease?",
  },
  {
    icon: Microscope,
    text: "Could sildenafil treat pulmonary arterial hypertension in pediatric patients?",
  },
  {
    icon: Sparkles,
    text: "Is thalidomide effective for treating multiple myeloma?",
  },
];

function loadPersistedSession(): ActiveSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as ActiveSession) : null;
  } catch {
    return null;
  }
}

function persistSession(s: ActiveSession | null) {
  try {
    if (s) localStorage.setItem(SESSION_KEY, JSON.stringify(s));
    else localStorage.removeItem(SESSION_KEY);
  } catch {
    /* ignore */
  }
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

// ─── Typing dots component ───────────────────────────────────────────────
function TypingDots() {
  return (
    <div className="flex items-center gap-1 px-1">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-text-secondary"
          animate={{
            scale: [1, 1.4, 1],
            opacity: [0.4, 1, 0.4],
          }}
          transition={{
            duration: 1,
            repeat: Infinity,
            delay: i * 0.15,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}

// ─── Chat bubble ─────────────────────────────────────────────────────────
function ChatBubble({ msg, index }: { msg: ChatMessage; index: number }) {
  const isUser = msg.role === "user";

  return (
    <motion.div
      className={cn(
        "flex gap-3 max-w-[85%]",
        isUser ? "ml-auto flex-row-reverse" : "mr-auto",
      )}
      initial={{ opacity: 0, y: 8, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        duration: 0.3,
        delay: index * 0.05,
        ease: [0.2, 0.65, 0.3, 0.9],
      }}
    >
      {/* Avatar */}
      {!isUser && (
        <div className="w-7 h-7 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center shrink-0 mt-0.5">
          <Atom className="w-3.5 h-3.5 text-[#748ffc]" />
        </div>
      )}

      {/* Message body */}
      <div
        className={cn(
          "rounded-xl px-3.5 py-2.5 text-[13px] leading-relaxed",
          isUser
            ? "bg-accent/10 border border-accent/20 text-text-primary"
            : "bg-bg-card border border-border-default text-text-primary",
        )}
      >
        <p
          dangerouslySetInnerHTML={{
            __html: msg.content.replace(
              /\*\*(.*?)\*\*/g,
              "<strong>$1</strong>",
            ),
          }}
        />
      </div>
    </motion.div>
  );
}

// ─── Status badge ────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: SessionStatus }) {
  const isLive = status === "running" || status === "pending";
  const label = isLive
    ? "Live"
    : status === "completed"
      ? "Done"
      : status === "failed"
        ? "Failed"
        : "Paused";

  const colorClass = isLive
    ? "bg-[#748ffc]/10 text-[#748ffc] border-[#748ffc]/20"
    : status === "completed"
      ? "bg-[#69db7c]/10 text-[#69db7c] border-[#69db7c]/20"
      : status === "failed"
        ? "bg-[#ff6b6b]/10 text-[#ff6b6b] border-[#ff6b6b]/20"
        : "bg-[#ffa94d]/10 text-[#ffa94d] border-[#ffa94d]/20";

  return (
    <motion.span
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium border",
        colorClass,
      )}
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 500, damping: 25 }}
    >
      {isLive && (
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#748ffc] opacity-75" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#748ffc]" />
        </span>
      )}
      {label}
    </motion.span>
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
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Restore session on mount
  useEffect(() => {
    const saved = loadPersistedSession();
    if (!saved) return;
    getSession(saved.sessionId)
      .then((res) => {
        const restored: ActiveSession = {
          sessionId: res.sessionId,
          status: res.status,
          query: res.query,
        };
        setSession(restored);
        persistSession(restored);
        setMessages([
          { id: "u-0", role: "user", content: res.query },
          {
            id: "a-0",
            role: "assistant",
            content: assistantMessage(res.status, res.query),
          },
        ]);
      })
      .catch(() => persistSession(null));
  }, []);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${Math.min(ta.scrollHeight, 160)}px`;
  }, [query]);

  const handleSubmit = useCallback(async () => {
    const trimmed = query.trim();
    if (!trimmed || isLoading) return;

    setIsLoading(true);
    setError(null);
    persistSession(null);
    setSession(null);

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: "user",
      content: trimmed,
    };
    setMessages([userMsg]);
    setQuery("");

    try {
      const res = await submitResearch(trimmed);
      const newSession: ActiveSession = {
        sessionId: res.sessionId,
        status: res.status,
        query: trimmed,
      };
      setSession(newSession);
      persistSession(newSession);
      setMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: "assistant",
          content: assistantMessage(res.status, trimmed),
        },
      ]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Submission failed";
      setError(msg);
      setMessages((prev) => [
        ...prev,
        {
          id: `a-err-${Date.now()}`,
          role: "assistant",
          content: `Error: ${msg}`,
        },
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
      if (
        status === "completed" ||
        status === "failed" ||
        status === "suspended"
      ) {
        setMessages((msgs) => {
          const alreadyHas = msgs.some((m) =>
            m.content.includes(
              status === "completed"
                ? "complete"
                : status === "failed"
                  ? "wrong"
                  : "paused",
            ),
          );
          if (alreadyHas) return msgs;
          return [
            ...msgs,
            {
              id: `a-status-${Date.now()}`,
              role: "assistant",
              content: assistantMessage(status, prev.query),
            },
          ];
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

  const isTerminal =
    session?.status === "completed" || session?.status === "failed";
  const hasSession = !!session;

  return (
    <div className="flex flex-col h-screen bg-bg-deep overflow-hidden lab-bg">
      {/* ── Top nav ─────────────────────────────────────────────────────── */}
      <header className="flex items-center justify-between px-6 sm:px-8 h-12 border-b border-border-subtle bg-bg-panel/80 backdrop-blur-xl shrink-0 z-20">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center">
            <Atom className="w-4 h-4 text-[#748ffc]" />
          </div>
          <span className="text-[13px] font-semibold text-text-primary tracking-tight">
            Entropy
          </span>
          <span className="text-[11px] text-text-muted font-medium hidden sm:inline">
            Multi-Agent Research
          </span>
        </div>
        {hasSession && (
          <motion.button
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium text-text-secondary bg-white/[0.03] border border-border-default hover:bg-white/[0.06] hover:text-text-primary transition-colors"
            onClick={handleReset}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Plus className="w-3.5 h-3.5" />
            New Query
          </motion.button>
        )}
      </header>

      {/* ── Body ────────────────────────────────────────────────────────── */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* ── Left: Chat column ─────────────────────────────────────────── */}
        <div
          className={cn(
            "flex flex-col relative transition-all duration-300",
            hasSession ? "flex-1 min-w-0" : "flex-1",
          )}
        >
          {/* Landing hero + input as a centered group */}
          <AnimatePresence>
            {!hasSession && messages.length === 0 && (
              <motion.div
                className="flex-1 flex flex-col items-center justify-center px-8 sm:px-12 text-center relative"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.4 }}
              >
                {/* Background glow orbs */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                  <motion.div
                    className="absolute top-1/4 left-1/3 w-72 h-72 rounded-full bg-[#3b5bdb]/[0.06] blur-[100px]"
                    animate={{
                      x: [0, 30, 0],
                      y: [0, -20, 0],
                      scale: [1, 1.1, 1],
                    }}
                    transition={{
                      duration: 8,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                  />
                  <motion.div
                    className="absolute bottom-1/3 right-1/4 w-60 h-60 rounded-full bg-[#7048e8]/[0.05] blur-[80px]"
                    animate={{
                      x: [0, -20, 0],
                      y: [0, 25, 0],
                      scale: [1, 1.15, 1],
                    }}
                    transition={{
                      duration: 10,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                  />
                </div>

                {/* Hero text */}
                <motion.div
                  className="relative z-10"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.1 }}
                >
                  <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-3">
                    <span className="bg-clip-text text-transparent bg-gradient-to-r from-white/90 to-white/40">
                      Autonomous Drug Repurposing
                    </span>
                    <br />
                    <span className="text-text-secondary font-medium text-xl sm:text-2xl">
                      Research Platform
                    </span>
                  </h1>
                  <p className="text-text-secondary text-sm max-w-md mx-auto leading-relaxed">
                    Submit a hypothesis and Entropy will orchestrate 7
                    specialized AI agents to produce a fully cited research
                    dossier.
                  </p>
                </motion.div>

                {/* Animated divider */}
                <motion.div
                  className="w-16 h-px bg-gradient-to-r from-transparent via-accent/40 to-transparent mt-6 mb-8"
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ duration: 0.8, delay: 0.4 }}
                />

                {/* Example chips — inside the centered hero block */}
                <motion.div
                  className="flex flex-wrap gap-2 mb-4 justify-center relative z-10"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.5 }}
                >
                  {EXAMPLES.map((ex) => {
                    const Icon = ex.icon;
                    return (
                      <motion.button
                        key={ex.text}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] text-text-secondary bg-white/[0.02] border border-border-subtle hover:bg-white/[0.04] hover:border-border-default hover:text-text-primary transition-all"
                        onClick={() => setQuery(ex.text)}
                        disabled={isLoading}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <Icon className="w-3 h-3 shrink-0 opacity-60" />
                        <span className="truncate max-w-[220px]">
                          {ex.text.length > 52
                            ? ex.text.slice(0, 52) + "…"
                            : ex.text}
                        </span>
                      </motion.button>
                    );
                  })}
                </motion.div>

                {/* Input box — inside the centered hero block */}
                <div className="w-full max-w-2xl relative z-10">
                  <div className="relative rounded-xl backdrop-blur-2xl bg-white/[0.02] border border-white/[0.05] hover:border-white/[0.08] focus-within:border-white/[0.12] transition-colors overflow-hidden">
                    <textarea
                      ref={textareaRef}
                      className="w-full bg-transparent text-text-primary text-[14px] px-5 py-4 pr-14 outline-none resize-none placeholder:text-text-muted leading-relaxed font-sans min-h-[56px]"
                      placeholder="Ask a drug repurposing question… (⌘↵ to send)"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      onKeyDown={handleKey}
                      rows={2}
                      disabled={isLoading}
                    />
                    <motion.button
                      className={cn(
                        "absolute right-3 bottom-3 w-8 h-8 rounded-lg flex items-center justify-center transition-all",
                        query.trim() && !isLoading
                          ? "bg-accent text-white hover:opacity-85"
                          : "bg-white/[0.04] text-text-muted cursor-not-allowed",
                      )}
                      onClick={handleSubmit}
                      disabled={!query.trim() || isLoading}
                      whileHover={
                        query.trim() && !isLoading ? { scale: 1.08 } : undefined
                      }
                      whileTap={
                        query.trim() && !isLoading ? { scale: 0.92 } : undefined
                      }
                    >
                      {isLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <ArrowUp className="w-4 h-4" />
                      )}
                    </motion.button>
                  </div>

                  {error && (
                    <motion.p
                      className="text-[12px] text-[#ff6b6b] mt-2 text-center"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                    >
                      Error: {error}
                    </motion.p>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Chat messages */}
          {messages.length > 0 && (
            <div className="flex-1 overflow-y-auto px-6 sm:px-10 py-6 scrollbar-thin">
              <div className="max-w-2xl mx-auto flex flex-col gap-3">
                {messages.map((m, i) => (
                  <ChatBubble key={m.id} msg={m} index={i} />
                ))}
                {isLoading && (
                  <motion.div
                    className="flex gap-3 mr-auto"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <div className="w-7 h-7 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center shrink-0">
                      <Atom className="w-3.5 h-3.5 text-[#748ffc]" />
                    </div>
                    <div className="rounded-xl px-3.5 py-2.5 bg-bg-card border border-border-default">
                      <TypingDots />
                    </div>
                  </motion.div>
                )}
                <div ref={chatEndRef} />
              </div>
            </div>
          )}

          {/* HITL panel inline */}
          <AnimatePresence>
            {session?.status === "suspended" && (
              <motion.div
                className="px-6 sm:px-10 max-w-2xl mx-auto w-full"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
              >
                <HitlReviewPanel
                  sessionId={session.sessionId}
                  onDecision={() => {
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
                    setTimeout(() => clearInterval(poll), 10 * 60 * 1000);
                  }}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Report download inline */}
          <AnimatePresence>
            {session?.status === "completed" && (
              <motion.div
                className="px-6 sm:px-10 max-w-2xl mx-auto w-full"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
              >
                <ReportDownload sessionId={session.sessionId} />
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Docked input box (active session state) ─────────────── */}
          {(hasSession || messages.length > 0) && (
            <div className="shrink-0 px-6 sm:px-10 pt-3 pb-5">
              <div className="max-w-2xl mx-auto">
                <div className="relative rounded-xl backdrop-blur-2xl bg-white/[0.02] border border-white/[0.05] hover:border-white/[0.08] focus-within:border-white/[0.12] transition-colors overflow-hidden">
                  <textarea
                    ref={textareaRef}
                    className="w-full bg-transparent text-text-primary text-[14px] px-5 py-4 pr-14 outline-none resize-none placeholder:text-text-muted leading-relaxed font-sans min-h-[56px]"
                    placeholder="Ask a drug repurposing question… (⌘↵ to send)"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={handleKey}
                    rows={2}
                    disabled={isLoading}
                  />
                  <motion.button
                    className={cn(
                      "absolute right-3 bottom-3 w-8 h-8 rounded-lg flex items-center justify-center transition-all",
                      query.trim() && !isLoading
                        ? "bg-accent text-white hover:opacity-85"
                        : "bg-white/[0.04] text-text-muted cursor-not-allowed",
                    )}
                    onClick={handleSubmit}
                    disabled={!query.trim() || isLoading}
                    whileHover={
                      query.trim() && !isLoading ? { scale: 1.08 } : undefined
                    }
                    whileTap={
                      query.trim() && !isLoading ? { scale: 0.92 } : undefined
                    }
                  >
                    {isLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <ArrowUp className="w-4 h-4" />
                    )}
                  </motion.button>
                </div>

                {error && (
                  <motion.p
                    className="text-[12px] text-[#ff6b6b] mt-2 text-center"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    Error: {error}
                  </motion.p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── Right: Pipeline stages panel ──────────────────────────────── */}
        <AnimatePresence>
          {hasSession && (
            <motion.div
              className="w-[380px] shrink-0 border-l border-border-subtle bg-bg-panel/50 flex flex-col overflow-hidden stages-col-wrap"
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 380, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.35, ease: [0.2, 0.65, 0.3, 0.9] }}
            >
              {/* Panel header */}
              <div className="flex items-center justify-between px-5 h-11 border-b border-border-subtle shrink-0">
                <span className="text-[13px] font-semibold text-text-primary">
                  Pipeline
                </span>
                <StatusBadge status={session!.status} />
              </div>

              {/* Scrollable stages */}
              <div className="flex-1 overflow-y-auto px-4 py-4 scrollbar-thin">
                <PipelineStages
                  sessionId={session!.sessionId}
                  overallStatus={session!.status}
                  onStatusChange={handleStatusChange}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
