import type { ReportInput } from "./types.js";

/**
 * Generates a pandoc-flavored Markdown document from the report input.
 *
 * Strategy:
 * - YAML frontmatter carries title/date/author metadata (pandoc picks this up)
 * - Agent content sections are emitted as-is (they're already Markdown prose
 *   produced by LLMs)
 * - Structured sections (tables, checklists) use raw LaTeX fenced blocks
 *   so pandoc passes them through verbatim to xelatex
 * - Citations are appended as a pandoc-style reference list
 */
export function generateMarkdown(input: ReportInput): string {
  const parts: string[] = [];

  parts.push(frontmatter(input));
  parts.push(executiveSummary(input));
  parts.push(ppicoSection(input));
  parts.push(biologicalRationale(input));
  parts.push(clinicalLandscape(input));
  parts.push(safetyProfile(input));
  parts.push(literatureReview(input));
  parts.push(gapAnalysisSection(input));
  parts.push(verificationReportSection(input));
  parts.push(reviewerDecisionSection(input));
  parts.push(appendicesSection(input));

  return parts.join("\n\n") + "\n";
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Wraps a raw LaTeX block so pandoc passes it through verbatim */
function rawLatex(latex: string): string {
  return "```{=latex}\n" + latex + "\n```";
}

/** Formats a severity/status badge */
function badge(value: string): string {
  return `**[${value.toUpperCase()}]**`;
}

// ─── Sections ─────────────────────────────────────────────────────────────────

function frontmatter(input: ReportInput): string {
  const sessionId = input.metadata.sessionId ?? "N/A";
  const reviewer = input.reviewerDecision.reviewer;
  const decision = input.reviewerDecision.approved ? "APPROVED" : "REJECTED";

  // YAML frontmatter — pandoc uses this for the title page
  return [
    "---",
    `title: "Drug Repurposing Dossier: ${input.query}"`,
    `date: "${input.metadata.timestamp}"`,
    `author: "Reviewed by ${reviewer} — ${decision}"`,
    `subject: "${input.query}"`,
    `keywords: [drug repurposing, ${input.query}]`,
    `session: "${sessionId}"`,
    "geometry: margin=2.5cm",
    "fontsize: 11pt",
    "mainfont: Liberation Serif",
    "sansfont: Liberation Sans",
    "monofont: Liberation Mono",
    "colorlinks: true",
    "toc: true",
    "numbersections: true",
    "---",
  ].join("\n");
}

function executiveSummary(input: ReportInput): string {
  return [
    "# Executive Summary",
    "",
    "## Verification Summary",
    "",
    input.verificationReport.summary,
    "",
    "## Gap Analysis Summary",
    "",
    input.gapAnalysis.summary,
  ].join("\n");
}

function ppicoSection(input: ReportInput): string {
  const { population, intervention, comparison, outcome } =
    input.evidence.ppicoBreakdown;

  return [
    "# PPICO Breakdown",
    "",
    `| Element | Description |`,
    `|---------|-------------|`,
    `| **Population** | ${population} |`,
    `| **Intervention** | ${intervention} |`,
    `| **Comparison** | ${comparison} |`,
    `| **Outcome** | ${outcome} |`,
  ].join("\n");
}

function biologicalRationale(input: ReportInput): string {
  const content =
    input.evidence.agents.biologist.content || "*No content provided.*";
  return ["# Biological Rationale", "", content].join("\n");
}

function clinicalLandscape(input: ReportInput): string {
  const content =
    input.evidence.agents.clinicalScout.content || "*No content provided.*";
  return ["# Clinical Landscape", "", content].join("\n");
}

function safetyProfile(input: ReportInput): string {
  const content =
    input.evidence.agents.hawk.content || "*No content provided.*";
  return ["# Safety Profile", "", content].join("\n");
}

function literatureReview(input: ReportInput): string {
  const content =
    input.evidence.agents.librarian.content || "*No content provided.*";
  return ["# Literature Review", "", content].join("\n");
}

function gapAnalysisSection(input: ReportInput): string {
  const ga = input.gapAnalysis;
  const parts: string[] = ["# Gap Analysis"];

  // TPP checklist table
  parts.push("\n## TPP Checklist\n");
  if (ga.tppChecklist.length === 0) {
    parts.push("*No checklist items.*");
  } else {
    parts.push("| Category | Status | Notes |");
    parts.push("|----------|--------|-------|");
    for (const item of ga.tppChecklist) {
      parts.push(
        `| ${item.category} | ${badge(item.status)} | ${item.notes} |`,
      );
    }
  }

  // Present evidence
  parts.push("\n## Present Evidence\n");
  if (ga.presentEvidence.length === 0) {
    parts.push("*None.*");
  } else {
    for (const e of ga.presentEvidence) {
      parts.push(
        `- **${e.category}** (${e.strength}): ${e.description} *(${e.sources.join(", ")})*`,
      );
    }
  }

  // Missing evidence
  parts.push("\n## Missing Evidence\n");
  if (ga.missingEvidence.length === 0) {
    parts.push("*None.*");
  } else {
    for (const g of ga.missingEvidence) {
      parts.push(
        `- ${badge(g.severity)} **${g.category}**: ${g.description}\n  > *Recommendation: ${g.recommendation}*`,
      );
    }
  }

  // Contradictions
  parts.push("\n## Contradictions\n");
  if (ga.contradictions.length === 0) {
    parts.push("*None.*");
  } else {
    for (const c of ga.contradictions) {
      parts.push(
        `- ${badge(c.severity)} ${c.description}\n  - ${c.sourceA.agentId}: "${c.sourceA.claim}"\n  - ${c.sourceB.agentId}: "${c.sourceB.claim}"${c.resolution ? `\n  > *Resolution: ${c.resolution}*` : ""}`,
      );
    }
  }

  // Risk flags
  parts.push("\n## Risk Flags\n");
  if (ga.riskFlags.length === 0) {
    parts.push("*None.*");
  } else {
    for (const r of ga.riskFlags) {
      parts.push(`- ${badge(r.severity)} **${r.flag}**: ${r.description}`);
    }
  }

  parts.push(`\n**Overall Readiness:** ${badge(ga.overallReadiness)}`);

  return parts.join("\n");
}

function verificationReportSection(input: ReportInput): string {
  const vr = input.verificationReport;
  const parts: string[] = ["# Verification Report"];

  parts.push("\n## Summary Statistics\n");
  parts.push(
    `| Metric | Value |\n|--------|-------|\n` +
      `| Overall Integrity | ${badge(vr.overallIntegrity)} |\n` +
      `| Total Claims | ${vr.totalClaimsChecked} |\n` +
      `| Confirmed | ${vr.confirmedCount} |\n` +
      `| Flagged | ${vr.flaggedCount} |\n` +
      `| Unverifiable | ${vr.unverifiableCount} |`,
  );

  parts.push("\n## Claims Table\n");
  if (vr.claims.length === 0) {
    parts.push("*No claims checked.*");
  } else {
    parts.push("| Claim ID | Status | Confidence | Discrepancy |");
    parts.push("|----------|--------|------------|-------------|");
    for (const c of vr.claims) {
      const pct = `${(c.confidence * 100).toFixed(0)}%`;
      const disc = c.discrepancy ?? "—";
      parts.push(
        `| ${c.claimId} | ${badge(c.verificationStatus)} | ${pct} | ${disc} |`,
      );
    }
  }

  return parts.join("\n");
}

function reviewerDecisionSection(input: ReportInput): string {
  const rd = input.reviewerDecision;
  const decision = rd.approved ? "✅ APPROVED" : "❌ REJECTED";

  return [
    "# Reviewer Decision",
    "",
    `**Decision:** ${decision}`,
    "",
    `**Reviewer:** ${rd.reviewer}`,
    "",
    `**Notes:** ${rd.notes}`,
  ].join("\n");
}

function appendicesSection(input: ReportInput): string {
  const parts: string[] = ["# Appendices"];

  parts.push("\n## Gap Analysis Recommendations\n");
  if (input.gapAnalysis.recommendations.length === 0) {
    parts.push("*None.*");
  } else {
    for (const r of input.gapAnalysis.recommendations) {
      parts.push(`1. ${r}`);
    }
  }

  parts.push("\n## Verification Report Recommendations\n");
  if (input.verificationReport.recommendations.length === 0) {
    parts.push("*None.*");
  } else {
    for (const r of input.verificationReport.recommendations) {
      parts.push(`1. ${r}`);
    }
  }

  return parts.join("\n");
}
