"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertTriangle,
  CheckCircle2,
  XCircle,
  RotateCcw,
  ExternalLink,
  Loader2,
  Eye,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { submitReview, getPreviewUrl } from "@/lib/api";

interface HitlReviewPanelProps {
  sessionId: string;
  onDecision: () => void;
}

export function HitlReviewPanel({
  sessionId,
  onDecision,
}: HitlReviewPanelProps) {
  const [reviewer, setReviewer] = useState("");
  const [suggestions, setSuggestions] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [action, setAction] = useState<"approve" | "changes" | "reject" | null>(
    null,
  );

  const previewUrl = getPreviewUrl(sessionId);

  const handleDecision = async (type: "approve" | "changes" | "reject") => {
    if (!reviewer.trim()) return;
    if (type === "changes" && !suggestions.trim()) return;

    setSubmitting(true);
    setAction(type);

    try {
      if (type === "approve") {
        await submitReview(sessionId, {
          approved: true,
          reviewer: reviewer.trim(),
          suggestions: suggestions.trim() || undefined,
        });
      } else if (type === "changes") {
        await submitReview(sessionId, {
          approved: false,
          requestChanges: true,
          reviewer: reviewer.trim(),
          suggestions: suggestions.trim(),
        });
        setSuggestions("");
        setAction(null);
        setSubmitting(false);
        return;
      } else {
        await submitReview(sessionId, {
          approved: false,
          reviewer: reviewer.trim(),
          suggestions: suggestions.trim() || undefined,
        });
      }
      onDecision();
    } catch (err) {
      console.error("[hitl] review submission failed:", err);
      setSubmitting(false);
      setAction(null);
    }
  };

  return (
    <motion.div
      className="mb-3 rounded-lg border border-border-default bg-bg-card/80 backdrop-blur-xl overflow-hidden"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.2, 0.65, 0.3, 0.9] }}
    >
      {/* Accent top border */}
      <div className="h-0.5 bg-gradient-to-r from-accent-warn via-[#fbbf24] to-accent-warn" />

      <div className="p-5">
        {/* ── Header ── */}
        <div className="flex items-start gap-3 mb-4">
          <div className="w-8 h-8 rounded-lg bg-accent-warn/10 flex items-center justify-center shrink-0 mt-0.5">
            <AlertTriangle className="w-4 h-4 text-[#ffa94d]" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-text-primary">
              Human Review Required
            </h3>
            <p className="text-xs text-text-secondary mt-1 leading-relaxed">
              The pipeline has completed research. Review the dossier and either
              approve, request changes, or reject.
            </p>
          </div>
        </div>

        {/* ── Preview link ── */}
        <motion.a
          href={previewUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-accent/10 border border-accent/30 text-[#a5b4fc] font-semibold text-[13px] no-underline transition-colors hover:bg-accent/15 mb-4"
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
        >
          <Eye className="w-3.5 h-3.5" />
          Open Report Preview
          <ExternalLink className="w-3 h-3 opacity-70" />
        </motion.a>
        <p className="text-[11px] text-text-muted mb-4">
          Opens the full dossier in a new tab — all agent findings, tables, and
          verification claims.
        </p>

        {/* ── Fields ── */}
        <div className="flex flex-col gap-3 mb-4">
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1.5">
              Your Name / Reviewer ID *
            </label>
            <input
              className="w-full px-3 py-2 bg-bg-deep border border-border-default rounded-md text-text-primary text-[13px] font-sans outline-none transition-colors focus:border-white/20 placeholder:text-text-muted"
              placeholder="e.g. Dr. Jane Smith"
              value={reviewer}
              onChange={(e) => setReviewer(e.target.value)}
              disabled={submitting}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1.5">
              Suggestions / Required Changes
              <span className="text-text-muted font-normal ml-1">
                (required for &quot;Request Changes&quot;)
              </span>
            </label>
            <textarea
              className="w-full px-3 py-2 bg-bg-deep border border-border-default rounded-md text-text-primary text-[13px] font-sans outline-none transition-colors focus:border-white/20 placeholder:text-text-muted resize-y min-h-[80px]"
              placeholder={
                "Describe what needs improving, e.g.:\n" +
                "\u2022 Add more data on Phase III clinical trials\n" +
                "\u2022 The safety section is missing FDA adverse event counts\n" +
                "\u2022 Include comparator drug analysis"
              }
              value={suggestions}
              onChange={(e) => setSuggestions(e.target.value)}
              disabled={submitting}
              rows={5}
            />
          </div>
        </div>

        {/* ── Actions ── */}
        <div className="flex flex-wrap gap-2.5">
          <motion.button
            onClick={() => handleDecision("approve")}
            disabled={!reviewer.trim() || submitting}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            title="Approve the dossier and generate the final PDF"
            className={cn(
              "flex items-center gap-2 px-3.5 py-2 rounded-lg text-[13px] font-medium transition-all",
              "bg-accent-success/10 border border-accent-success/30 text-[#69db7c]",
              "hover:bg-accent-success/15",
              "disabled:opacity-35 disabled:cursor-not-allowed",
            )}
          >
            {submitting && action === "approve" ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <CheckCircle2 className="w-3.5 h-3.5" />
            )}
            Approve & Generate PDF
          </motion.button>

          <motion.button
            onClick={() => handleDecision("changes")}
            disabled={!reviewer.trim() || !suggestions.trim() || submitting}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            title="Send back for refinement with your suggestions"
            className={cn(
              "flex items-center gap-2 px-3.5 py-2 rounded-lg text-[13px] font-medium transition-all",
              "bg-[#fbbf24]/10 border border-[#fbbf24]/30 text-[#fcd34d]",
              "hover:bg-[#fbbf24]/15",
              "disabled:opacity-35 disabled:cursor-not-allowed",
            )}
          >
            {submitting && action === "changes" ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <RotateCcw className="w-3.5 h-3.5" />
            )}
            Request Changes
          </motion.button>

          <motion.button
            onClick={() => handleDecision("reject")}
            disabled={!reviewer.trim() || submitting}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            title="Reject — no PDF will be generated"
            className={cn(
              "flex items-center gap-2 px-3.5 py-2 rounded-lg text-[13px] font-medium transition-all",
              "bg-accent-error/10 border border-accent-error/25 text-[#ff6b6b]",
              "hover:bg-accent-error/15",
              "disabled:opacity-35 disabled:cursor-not-allowed",
            )}
          >
            {submitting && action === "reject" ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <XCircle className="w-3.5 h-3.5" />
            )}
            Reject
          </motion.button>
        </div>

        <p className="text-[11px] text-text-muted mt-3">
          &quot;Request Changes&quot; will trigger a refinement pass and bring
          you back here for another review.
        </p>
      </div>
    </motion.div>
  );
}
