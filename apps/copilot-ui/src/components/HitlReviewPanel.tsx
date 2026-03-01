"use client";

import { useState } from "react";
import { submitReview, getPreviewUrl } from "@/lib/api";

interface HitlReviewPanelProps {
  sessionId: string;
  onDecision: () => void;
}

export function HitlReviewPanel({ sessionId, onDecision }: HitlReviewPanelProps) {
  const [reviewer, setReviewer] = useState("");
  const [suggestions, setSuggestions] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [action, setAction] = useState<"approve" | "changes" | "reject" | null>(null);

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
        // After requesting changes the pipeline will re-suspend — reset UI
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

  const Spinner = () => (
    <span
      style={{
        display: "inline-block",
        width: 14,
        height: 14,
        borderRadius: "50%",
        border: "2px solid rgba(255,255,255,0.3)",
        borderTopColor: "#fff",
        animation: "spin 0.7s linear infinite",
        verticalAlign: "middle",
        marginRight: 6,
      }}
    />
  );

  return (
    <>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <div className="hitl-panel animate-in">
        {/* ── Header ── */}
        <div className="hitl-header">
          <div>
            <div className="hitl-title">Human Review Required</div>
            <div className="hitl-subtitle">
              The pipeline has completed research. Review the dossier and
              either approve, request changes, or reject.
            </div>
          </div>
        </div>

        {/* ── Preview link ── */}
        <div style={{ margin: "0 0 1.25em" }}>
          <a
            href={previewUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "0.55em 1.1em",
              borderRadius: 8,
              background: "rgba(99,102,241,0.15)",
              border: "1px solid rgba(99,102,241,0.4)",
              color: "#a5b4fc",
              fontWeight: 600,
              fontSize: "0.9em",
              textDecoration: "none",
              transition: "background 0.2s",
            }}
          >
            Open Report Preview
            <span style={{ fontSize: "0.8em", opacity: 0.8 }}>↗</span>
          </a>
          <div style={{ fontSize: "0.78em", color: "var(--text-muted)", marginTop: 4 }}>
            Opens the full dossier in a new tab — all agent findings, tables, and verification claims.
          </div>
        </div>

        {/* ── Fields ── */}
        <div className="hitl-fields">
          <div className="hitl-field">
            <label htmlFor="reviewer-name">Your Name / Reviewer ID *</label>
            <input
              id="reviewer-name"
              className="hitl-input"
              placeholder="e.g. Dr. Jane Smith"
              value={reviewer}
              onChange={(e) => setReviewer(e.target.value)}
              disabled={submitting}
            />
          </div>

          <div className="hitl-field">
            <label htmlFor="review-suggestions">
              Suggestions / Required Changes
              <span style={{ color: "var(--text-muted)", fontWeight: 400, marginLeft: 6 }}>
                (required for "Request Changes")
              </span>
            </label>
            <textarea
              id="review-suggestions"
              className="hitl-input hitl-textarea"
              placeholder={
                "Describe what needs improving, e.g.:\n" +
                "• Add more data on Phase III clinical trials\n" +
                "• The safety section is missing FDA adverse event counts\n" +
                "• Include comparator drug analysis"
              }
              value={suggestions}
              onChange={(e) => setSuggestions(e.target.value)}
              disabled={submitting}
              rows={5}
            />
          </div>
        </div>

        {/* ── Actions ── */}
        <div className="hitl-actions" style={{ flexWrap: "wrap", gap: "0.6em" }}>
          <button
            className="btn-approve"
            onClick={() => handleDecision("approve")}
            disabled={!reviewer.trim() || submitting}
            title="Approve the dossier and generate the final PDF"
          >
            {submitting && action === "approve" ? <Spinner /> : null}
            Approve & Generate PDF
          </button>

          <button
            onClick={() => handleDecision("changes")}
            disabled={!reviewer.trim() || !suggestions.trim() || submitting}
            title="Send back for refinement with your suggestions"
            style={{
              padding: "0.6em 1.2em",
              borderRadius: 8,
              border: "1px solid rgba(251,191,36,0.5)",
              background: "rgba(251,191,36,0.1)",
              color: "#fcd34d",
              fontWeight: 600,
              fontSize: "0.9em",
              cursor: !reviewer.trim() || !suggestions.trim() || submitting ? "not-allowed" : "pointer",
              opacity: !reviewer.trim() || !suggestions.trim() || submitting ? 0.5 : 1,
              transition: "all 0.2s",
            }}
          >
            {submitting && action === "changes" ? <Spinner /> : null}
            Request Changes
          </button>

          <button
            className="btn-reject"
            onClick={() => handleDecision("reject")}
            disabled={!reviewer.trim() || submitting}
            title="Reject — no PDF will be generated"
          >
            {submitting && action === "reject" ? <Spinner /> : null}
            Reject
          </button>
        </div>

        <div style={{ fontSize: "0.75em", color: "var(--text-muted)", marginTop: "0.75em" }}>
          "Request Changes" will trigger a refinement pass and bring you back here for another review.
        </div>
      </div>
    </>
  );
}
