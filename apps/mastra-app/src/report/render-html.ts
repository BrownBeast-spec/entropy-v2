/**
 * render-html.ts
 *
 * Renders a complete, self-contained HTML document from ReportInput.
 * Tables and structured data are rendered from typed arrays — the LLM
 * never has to produce table markup.  Agent prose sections drop in as-is.
 *
 * The HTML is intentionally standalone (inline CSS, no external assets)
 * so Puppeteer can print it without network access.
 */
import type { ReportInput } from "./types.js";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Escape HTML entities so raw text is safe to embed in markup */
function h(text: string | number | null | undefined): string {
  if (text === null || text === undefined) return "";
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Parse a Markdown pipe-table block (array of raw lines) into an HTML table. */
function parsePipeTable(lines: string[]): string {
  const isSep = (l: string) => /^\|[\s\-:|]+\|$/.test(l.trim());

  const rows: string[][] = [];
  let hasHeader = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (isSep(line)) {
      hasHeader = true;
      continue;
    }
    const cells = line
      .split("|")
      .slice(1, -1)
      .map((c) => c.trim());
    if (cells.length > 0) rows.push(cells);
  }

  if (rows.length === 0) return "";

  const renderCell = (cell: string, tag: "th" | "td") => {
    const inner = cell
      .replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>")
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.+?)\*/g, "<em>$1</em>")
      .replace(/`([^`]+)`/g, "<code>$1</code>");
    return `<${tag}>${inner}</${tag}>`;
  };

  const headerRow = hasHeader ? rows[0] : null;
  const bodyRows = hasHeader ? rows.slice(1) : rows;

  const thead = headerRow
    ? `<thead><tr>${headerRow.map((c) => renderCell(c, "th")).join("")}</tr></thead>`
    : "";
  const tbody = `<tbody>${bodyRows
    .map((row) => `<tr>${row.map((c) => renderCell(c, "td")).join("")}</tr>`)
    .join("")}</tbody>`;

  return `<table class="data-table">${thead}${tbody}</table>`;
}

/** Convert a Markdown-ish string to HTML.
 *  Handles: pipe tables, headings, **bold**, *italic*, `code`,
 *  bullet + numbered lists, --- rules, paragraphs. */
function prose(text: string): string {
  if (!text) return "<em>No content provided.</em>";

  const isPipeLine = (l: string) => /^\|.+\|$/.test(l.trim());
  const rawLines = text.split("\n");
  const segments: Array<{ type: "text" | "table"; content: string[] }> = [];

  let i = 0;
  while (i < rawLines.length) {
    if (isPipeLine(rawLines[i])) {
      const tableLines: string[] = [];
      while (i < rawLines.length && (isPipeLine(rawLines[i]) || /^\|[\s\-:|]+\|$/.test(rawLines[i].trim()))) {
        tableLines.push(rawLines[i]);
        i++;
      }
      segments.push({ type: "table", content: tableLines });
    } else {
      if (segments.length === 0 || segments[segments.length - 1].type !== "text") {
        segments.push({ type: "text", content: [] });
      }
      segments[segments.length - 1].content.push(rawLines[i]);
      i++;
    }
  }

  return segments
    .map((seg) => {
      if (seg.type === "table") {
        return parsePipeTable(seg.content);
      }

      const joined = seg.content.join("\n");
      const transformed = joined
        .replace(/^### (.+)$/gm, "<h3>$1</h3>")
        .replace(/^## (.+)$/gm, "<h2>$1</h2>")
        .replace(/^# (.+)$/gm, "<h1>$1</h1>")
        .replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>")
        .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
        .replace(/\*(.+?)\*/g, "<em>$1</em>")
        .replace(/`([^`]+)`/g, "<code>$1</code>")
        .replace(/^---+$/gm, "<hr>")
        .replace(/^[-*]\s+(.+)$/gm, "<li>$1</li>")
        .replace(/^(\d+)\.\s+(.+)$/gm, "<li>$2</li>");

      const withLists = transformed.replace(/(<li>.*?<\/li>\n?)+/gs, (m) => `<ul>${m}</ul>`);

      return withLists
        .split(/\n{2,}/)
        .map((para) => {
          const t = para.trim();
          if (!t) return "";
          if (t.startsWith("<h") || t.startsWith("<ul>") || t.startsWith("<hr") || t.startsWith("<table")) return t;
          return `<p>${t.replace(/\n/g, "<br>")}</p>`;
        })
        .filter(Boolean)
        .join("\n");
    })
    .join("\n");
}

function badge(value: string): string {
  const cls = value.toLowerCase().replace(/[^a-z0-9]/g, "-");
  return `<span class="badge badge-${cls}">${h(value.toUpperCase())}</span>`;
}

// ─── Section renderers ────────────────────────────────────────────────────────

function renderPpicoTable(input: ReportInput): string {
  const { population, intervention, comparison, outcome } =
    input.evidence.ppicoBreakdown;
  return `
    <table class="data-table">
      <thead><tr><th>Element</th><th>Description</th></tr></thead>
      <tbody>
        <tr><td><strong>Population</strong></td><td>${h(population)}</td></tr>
        <tr><td><strong>Intervention</strong></td><td>${h(intervention)}</td></tr>
        <tr><td><strong>Comparison</strong></td><td>${h(comparison)}</td></tr>
        <tr><td><strong>Outcome</strong></td><td>${h(outcome)}</td></tr>
      </tbody>
    </table>`;
}

function renderTppTable(input: ReportInput): string {
  const items = input.gapAnalysis.tppChecklist;
  if (items.length === 0) return "<p><em>No checklist items.</em></p>";
  const rows = items
    .map(
      (item) => `
      <tr>
        <td>${h(item.category)}</td>
        <td>${badge(item.status)}</td>
        <td>${h(item.notes)}</td>
      </tr>`,
    )
    .join("");
  return `
    <table class="data-table">
      <thead><tr><th>Category</th><th>Status</th><th>Notes</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
}

function renderClaimsTable(input: ReportInput): string {
  const claims = input.verificationReport.claims;
  if (claims.length === 0) return "<p><em>No claims checked.</em></p>";
  const rows = claims
    .map(
      (c) => `
      <tr>
        <td>${h(c.claimId)}</td>
        <td>${badge(c.verificationStatus)}</td>
        <td>${(c.confidence * 100).toFixed(0)}%</td>
        <td>${h(c.discrepancy ?? "—")}</td>
      </tr>`,
    )
    .join("");
  return `
    <table class="data-table">
      <thead><tr><th>Claim ID</th><th>Status</th><th>Confidence</th><th>Discrepancy</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
}

function renderGapLists(input: ReportInput): string {
  const ga = input.gapAnalysis;

  const present =
    ga.presentEvidence.length === 0
      ? "<li><em>None.</em></li>"
      : ga.presentEvidence
          .map(
            (e) =>
              `<li><strong>${h(e.category)}</strong> <em>(${h(e.strength)})</em>: ${h(e.description)}</li>`,
          )
          .join("");

  const missing =
    ga.missingEvidence.length === 0
      ? "<li><em>None.</em></li>"
      : ga.missingEvidence
          .map(
            (g) =>
              `<li>${badge(g.severity)} <strong>${h(g.category)}</strong>: ${h(g.description)}<br>
               <span class="recommendation">→ ${h(g.recommendation)}</span></li>`,
          )
          .join("");

  const contradictions =
    ga.contradictions.length === 0
      ? "<li><em>None.</em></li>"
      : ga.contradictions
          .map(
            (c) =>
              `<li>${badge(c.severity)} ${h(c.description)}
               <br><em>${h(c.sourceA.agentId)}: "${h(c.sourceA.claim)}"</em>
               vs <em>${h(c.sourceB.agentId)}: "${h(c.sourceB.claim)}"</em>
               ${c.resolution ? `<br><span class="recommendation">→ ${h(c.resolution)}</span>` : ""}</li>`,
          )
          .join("");

  const flags =
    ga.riskFlags.length === 0
      ? "<li><em>None.</em></li>"
      : ga.riskFlags
          .map(
            (r) =>
              `<li>${badge(r.severity)} <strong>${h(r.flag)}</strong>: ${h(r.description)}</li>`,
          )
          .join("");

  return `
    <h3>Present Evidence</h3><ul>${present}</ul>
    <h3>Missing Evidence</h3><ul>${missing}</ul>
    <h3>Contradictions</h3><ul>${contradictions}</ul>
    <h3>Risk Flags</h3><ul>${flags}</ul>
    <p><strong>Overall Readiness:</strong> ${badge(ga.overallReadiness)}</p>`;
}

// ─── CSS ──────────────────────────────────────────────────────────────────────

const CSS = `
  * { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    font-family: "Georgia", "Times New Roman", serif;
    font-size: 11pt;
    line-height: 1.6;
    color: #1a1a1a;
    background: #fff;
    padding: 2.5cm 2.5cm 3cm;
    max-width: 210mm;
  }

  /* ── Title page ── */
  .title-page {
    text-align: center;
    padding: 4cm 1cm 5cm;
    page-break-after: always;
  }
  .title-page .doc-type {
    font-size: 13pt;
    letter-spacing: 0.15em;
    text-transform: uppercase;
    color: #666;
    margin-bottom: 1.5em;
  }
  .title-page h1 {
    font-size: 22pt;
    font-weight: 700;
    line-height: 1.3;
    color: #1a1a1a;
    margin-bottom: 2em;
  }
  .title-page .meta-row {
    font-size: 10pt;
    color: #555;
    margin-bottom: 0.4em;
  }
  .title-page .meta-row strong { color: #1a1a1a; }
  .title-page .decision-badge {
    display: inline-block;
    margin-top: 2em;
    padding: 0.5em 1.5em;
    border-radius: 4px;
    font-size: 12pt;
    font-weight: 700;
    letter-spacing: 0.05em;
  }
  .decision-approved { background: #d4edda; color: #155724; border: 1px solid #c3e6cb; }
  .decision-rejected { background: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; }
  .decision-pending  { background: #fff3cd; color: #856404; border: 1px solid #ffc107; }

  /* ── Table of contents ── */
  .toc { page-break-after: always; padding: 1cm 0; }
  .toc h2 { margin-bottom: 1em; font-size: 16pt; }
  .toc ol { padding-left: 1.5em; }
  .toc li { margin-bottom: 0.35em; font-size: 11pt; color: #333; }

  /* ── Sections ── */
  h1 { font-size: 18pt; margin: 1.5em 0 0.5em; padding-bottom: 0.3em; border-bottom: 2px solid #1a1a1a; page-break-before: always; }
  h1:first-of-type { page-break-before: avoid; }
  h2 { font-size: 14pt; margin: 1.2em 0 0.4em; color: #2c2c2c; }
  h3 { font-size: 12pt; margin: 1em 0 0.3em; color: #3a3a3a; }
  p  { margin-bottom: 0.8em; }
  ul, ol { padding-left: 1.5em; margin-bottom: 0.8em; }
  li { margin-bottom: 0.25em; }
  hr { border: none; border-top: 1px solid #ddd; margin: 1.5em 0; }
  code { font-family: "Courier New", monospace; font-size: 9pt; background: #f5f5f5; padding: 0.1em 0.3em; border-radius: 2px; }
  strong { font-weight: 700; }
  em { font-style: italic; }

  /* ── Tables ── */
  table.data-table {
    width: 100%;
    border-collapse: collapse;
    margin: 0.8em 0 1.2em;
    font-size: 10pt;
  }
  table.data-table th {
    background: #2c2c2c;
    color: #fff;
    font-weight: 600;
    padding: 0.5em 0.75em;
    text-align: left;
  }
  table.data-table td {
    padding: 0.45em 0.75em;
    vertical-align: top;
    border-bottom: 1px solid #e0e0e0;
  }
  table.data-table tr:nth-child(even) td { background: #fafafa; }

  /* ── Badges ── */
  .badge {
    display: inline-block;
    padding: 0.15em 0.5em;
    border-radius: 3px;
    font-size: 8.5pt;
    font-weight: 700;
    letter-spacing: 0.04em;
    white-space: nowrap;
  }
  .badge-complete, .badge-confirmed { background: #d4edda; color: #155724; }
  .badge-partial { background: #fff3cd; color: #856404; }
  .badge-missing, .badge-flagged, .badge-rejected { background: #f8d7da; color: #721c24; }
  .badge-low { background: #d1ecf1; color: #0c5460; }
  .badge-medium, .badge-conditional { background: #fff3cd; color: #856404; }
  .badge-high, .badge-approved { background: #d4edda; color: #155724; }
  .badge-major { background: #f8d7da; color: #721c24; }
  .badge-minor { background: #fff3cd; color: #856404; }
  .badge-unverifiable, .badge-not-ready { background: #e2e3e5; color: #383d41; }

  /* ── Stats grid ── */
  .stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
    gap: 0.75em;
    margin: 0.8em 0 1.2em;
  }
  .stat-card {
    background: #f8f9fa;
    border: 1px solid #dee2e6;
    border-radius: 4px;
    padding: 0.75em;
    text-align: center;
  }
  .stat-card .stat-value { font-size: 20pt; font-weight: 700; color: #2c2c2c; }
  .stat-card .stat-label { font-size: 8.5pt; color: #666; margin-top: 0.2em; }

  /* ── Recommendation list ── */
  .recommendation { color: #0056b3; font-style: italic; font-size: 9.5pt; }

  /* ── Print ── */
  @media print {
    body { padding: 0; }
    h1 { page-break-before: always; }
    .title-page { page-break-after: always; }
    .toc { page-break-after: always; }
    table { page-break-inside: avoid; }
  }
`;

// ─── Main renderer ────────────────────────────────────────────────────────────

export function renderHtmlReport(input: ReportInput): string {
  const { evidence, gapAnalysis, verificationReport, reviewerDecision, metadata } = input;

  const isPending = reviewerDecision.reviewer === "Pending Review";
  const decisionClass = isPending
    ? "decision-pending"
    : reviewerDecision.approved
      ? "decision-approved"
      : "decision-rejected";
  const decisionText = isPending
    ? "⏳ PENDING REVIEW"
    : reviewerDecision.approved
      ? "✓ APPROVED"
      : "✗ REJECTED";

  const vr = verificationReport;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Drug Repurposing Dossier – ${h(input.query)}</title>
  <style>${CSS}</style>
</head>
<body>

<!-- ═══════════════════════ TITLE PAGE ═══════════════════════ -->
<div class="title-page">
  <div class="doc-type">Drug Repurposing Dossier</div>
  <h1>${h(input.query)}</h1>
  <div class="meta-row"><strong>Date:</strong> ${h(metadata.timestamp)}</div>
  <div class="meta-row"><strong>Session:</strong> ${h(metadata.sessionId ?? "N/A")}</div>
  <div class="meta-row"><strong>Reviewer:</strong> ${h(reviewerDecision.reviewer)}</div>
  <div>
    <span class="decision-badge ${decisionClass}">${decisionText}</span>
  </div>
</div>

<!-- ═══════════════════════ TABLE OF CONTENTS ═══════════════════════ -->
<div class="toc">
  <h2>Contents</h2>
  <ol>
    <li>Executive Summary</li>
    <li>PPICO Breakdown</li>
    <li>Biological Rationale</li>
    <li>Clinical Landscape</li>
    <li>Safety Profile</li>
    <li>Literature Review</li>
    <li>Gap Analysis</li>
    <li>Verification Report</li>
    <li>Reviewer Decision</li>
    <li>Appendices</li>
  </ol>
</div>

<!-- ═══════════════════════ 1. EXECUTIVE SUMMARY ═══════════════════════ -->
<h1>1. Executive Summary</h1>

<h2>Verification Summary</h2>
${prose(vr.summary)}

<h2>Gap Analysis Summary</h2>
${prose(gapAnalysis.summary)}

<!-- ═══════════════════════ 2. PPICO BREAKDOWN ═══════════════════════ -->
<h1>2. PPICO Breakdown</h1>
${renderPpicoTable(input)}

<!-- ═══════════════════════ 3. BIOLOGICAL RATIONALE ═══════════════════════ -->
<h1>3. Biological Rationale</h1>
${prose(evidence.agents.biologist.content)}

<!-- ═══════════════════════ 4. CLINICAL LANDSCAPE ═══════════════════════ -->
<h1>4. Clinical Landscape</h1>
${prose(evidence.agents.clinicalScout.content)}

<!-- ═══════════════════════ 5. SAFETY PROFILE ═══════════════════════ -->
<h1>5. Safety Profile</h1>
${prose(evidence.agents.hawk.content)}

<!-- ═══════════════════════ 6. LITERATURE REVIEW ═══════════════════════ -->
<h1>6. Literature Review</h1>
${prose(evidence.agents.librarian.content)}

<!-- ═══════════════════════ 7. GAP ANALYSIS ═══════════════════════ -->
<h1>7. Gap Analysis</h1>

<h2>TPP Checklist</h2>
${renderTppTable(input)}

${renderGapLists(input)}

<!-- ═══════════════════════ 8. VERIFICATION REPORT ═══════════════════════ -->
<h1>8. Verification Report</h1>

<div class="stats-grid">
  <div class="stat-card">
    <div class="stat-value">${vr.totalClaimsChecked}</div>
    <div class="stat-label">Total Claims</div>
  </div>
  <div class="stat-card">
    <div class="stat-value" style="color:#155724">${vr.confirmedCount}</div>
    <div class="stat-label">Confirmed</div>
  </div>
  <div class="stat-card">
    <div class="stat-value" style="color:#856404">${vr.flaggedCount}</div>
    <div class="stat-label">Flagged</div>
  </div>
  <div class="stat-card">
    <div class="stat-value" style="color:#383d41">${vr.unverifiableCount}</div>
    <div class="stat-label">Unverifiable</div>
  </div>
</div>

<p><strong>Overall Integrity:</strong> ${badge(vr.overallIntegrity)}</p>

<h2>Claims</h2>
${renderClaimsTable(input)}

<!-- ═══════════════════════ 9. REVIEWER DECISION ═══════════════════════ -->
<h1>9. Reviewer Decision</h1>

<p><strong>Decision:</strong> <span class="decision-badge ${decisionClass}">${decisionText}</span></p>
<p><strong>Reviewer:</strong> ${h(reviewerDecision.reviewer)}</p>
${reviewerDecision.notes ? `<p><strong>Notes:</strong> ${h(reviewerDecision.notes)}</p>` : ""}

<!-- ═══════════════════════ 10. APPENDICES ═══════════════════════ -->
<h1>10. Appendices</h1>

<h2>Gap Analysis Recommendations</h2>
${gapAnalysis.recommendations.length === 0
  ? "<p><em>None.</em></p>"
  : `<ol>${gapAnalysis.recommendations.map((r) => `<li>${h(r)}</li>`).join("")}</ol>`
}

<h2>Verification Report Recommendations</h2>
${vr.recommendations.length === 0
  ? "<p><em>None.</em></p>"
  : `<ol>${vr.recommendations.map((r) => `<li>${h(r)}</li>`).join("")}</ol>`
}

</body>
</html>`;
}
