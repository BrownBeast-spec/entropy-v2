"use client";

import { useState, useCallback, KeyboardEvent } from "react";

const EXAMPLES = [
  "Can metformin be repurposed for Alzheimer's disease?",
  "Could sildenafil treat pulmonary arterial hypertension in pediatric patients?",
  "Is thalidomide effective for treating multiple myeloma?",
];

interface ResearchInputProps {
  onSubmit: (query: string) => void;
  isLoading: boolean;
}

export function ResearchInput({ onSubmit, isLoading }: ResearchInputProps) {
  const [query, setQuery] = useState("");

  const handleSubmit = useCallback(() => {
    const trimmed = query.trim();
    if (!trimmed || isLoading) return;
    onSubmit(trimmed);
    setQuery("");
  }, [query, isLoading, onSubmit]);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="research-input-container animate-in">
      <div className="research-hero">
        <h1>
          Autonomous <span className="gradient-text">Drug Repurposing</span>
          <br />
          Research Platform
        </h1>
        <p>
          Submit a natural-language hypothesis and Entropy will orchestrate 7
          specialized AI agents to produce a fully cited research dossier.
        </p>
      </div>

      <div className="search-form">
        <div className="search-input-wrap">
          <label htmlFor="research-query">Research Query</label>
          <textarea
            id="research-query"
            className="search-input"
            placeholder="e.g. Can metformin be repurposed for Alzheimer's disease?"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={2}
            disabled={isLoading}
          />
          <span className="search-shortcut">⌘↵</span>
        </div>

        <button
          className="btn-submit"
          onClick={handleSubmit}
          disabled={!query.trim() || isLoading}
        >
          {isLoading ? (
            <>
              <span className="spinner" />
              Running…
            </>
          ) : (
            <>
              <span>⚗</span>
              Analyse
            </>
          )}
        </button>
      </div>

      <div className="example-queries">
        {EXAMPLES.map((ex) => (
          <button
            key={ex}
            className="example-chip"
            onClick={() => setQuery(ex)}
            disabled={isLoading}
          >
            {ex.length > 48 ? ex.slice(0, 48) + "…" : ex}
          </button>
        ))}
      </div>
    </div>
  );
}
