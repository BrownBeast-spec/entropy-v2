"use client";

import { useState } from "react";
import { submitReview } from "@/lib/api";

interface HitlReviewPanelProps {
  sessionId: string;
  onDecision: () => void;
}

export function HitlReviewPanel({ sessionId, onDecision }: HitlReviewPanelProps) {
  const [reviewer, setReviewer] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleDecision = async (approved: boolean) => {
    if (!reviewer.trim()) return;
    setSubmitting(true);
    try {
      await submitReview(sessionId, {
        approved,
        reviewer: reviewer.trim(),
        notes: notes.trim() || undefined,
      });
      onDecision();
    } catch (err) {
      console.error("[hitl] review submission failed:", err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="hitl-panel animate-in">
      <div className="hitl-header">
        <span className="hitl-icon">⚖️</span>
        <div>
          <div className="hitl-title">Human Review Required</div>
          <div className="hitl-subtitle">
            The pipeline has generated a verification report and is awaiting
            your approval before producing the final PDF dossier.
          </div>
        </div>
      </div>

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
          <label htmlFor="review-notes">Notes (optional)</label>
          <textarea
            id="review-notes"
            className="hitl-input hitl-textarea"
            placeholder="Any comments or caveats for the research team…"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            disabled={submitting}
          />
        </div>
      </div>

      <div className="hitl-actions">
        <button
          className="btn-approve"
          onClick={() => handleDecision(true)}
          disabled={!reviewer.trim() || submitting}
        >
          {submitting ? (
            <span className="spinner" style={{ borderTopColor: "#fff", border: "2px solid rgba(255,255,255,0.3)", borderRadius: "50%", width: 16, height: 16, display: "inline-block" }} />
          ) : (
            "✓"
          )}{" "}
          Approve & Generate Report
        </button>
        <button
          className="btn-reject"
          onClick={() => handleDecision(false)}
          disabled={!reviewer.trim() || submitting}
        >
          ✕ Reject
        </button>
      </div>
    </div>
  );
}
