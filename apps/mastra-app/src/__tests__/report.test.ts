import { describe, it, expect } from "vitest";
import { existsSync } from "node:fs";
import { escapeLatex } from "../report/latex-escape.js";
import { generateReport, type ReportInput } from "../report/generate-report.js";
import { generateMarkdown } from "../report/generate-markdown.js";
import { compileReport, getReportTempDir } from "../report/compile-report.js";
import { extractCitations } from "../report/sections.js";

// ─── Shared Test Fixtures ──────────────────────────────────────────────────────

const minimalInput: ReportInput = {
  query: "Metformin for Alzheimer disease",
  evidence: {
    query: "Metformin for Alzheimer disease",
    ppicoBreakdown: {
      population: "Adults with Alzheimer disease",
      intervention: "Metformin",
      comparison: "Placebo",
      outcome: "Cognitive decline",
    },
    plannerRationale: "AMPK pathway activation may be neuroprotective.",
    agents: {
      biologist: {
        agentId: "biologist",
        status: "success",
        content: "",
        timestamp: "2025-01-01T00:00:00Z",
      },
      clinicalScout: {
        agentId: "clinicalScout",
        status: "success",
        content: "",
        timestamp: "2025-01-01T00:00:00Z",
      },
      hawk: {
        agentId: "hawk",
        status: "success",
        content: "",
        timestamp: "2025-01-01T00:00:00Z",
      },
      librarian: {
        agentId: "librarian",
        status: "success",
        content: "",
        timestamp: "2025-01-01T00:00:00Z",
      },
    },
    completedAt: "2025-01-01T00:00:00Z",
  },
  gapAnalysis: {
    summary: "Minimal gap analysis summary.",
    tppChecklist: [],
    presentEvidence: [],
    missingEvidence: [],
    contradictions: [],
    riskFlags: [],
    overallReadiness: "not-ready",
    recommendations: [],
  },
  verificationReport: {
    summary: "Minimal verification summary.",
    totalClaimsChecked: 0,
    confirmedCount: 0,
    flaggedCount: 0,
    unverifiableCount: 0,
    claims: [],
    overallIntegrity: "low",
    recommendations: [],
  },
  reviewerDecision: {
    approved: false,
    reviewer: "Dr. Smith",
    notes: "Insufficient evidence.",
  },
  metadata: {
    sessionId: "ses_test_001",
    timestamp: "2025-01-01T12:00:00Z",
  },
};

const fullInput: ReportInput = {
  query: "Aspirin for colorectal cancer prevention",
  evidence: {
    query: "Aspirin for colorectal cancer prevention",
    ppicoBreakdown: {
      population: "Adults aged 50+ at average risk",
      intervention: "Aspirin 81mg/day",
      comparison: "Placebo",
      outcome: "Colorectal cancer incidence",
    },
    plannerRationale:
      "COX-2 inhibition reduces prostaglandin-mediated tumor promotion.",
    agents: {
      biologist: {
        agentId: "biologist",
        status: "success",
        content:
          "Aspirin inhibits COX-1 and COX-2 enzymes. Key reference: PMID 12345678. " +
          "See also DOI: 10.1056/NEJMoa2101100 for mechanism details.",
        timestamp: "2025-01-02T10:00:00Z",
      },
      clinicalScout: {
        agentId: "clinicalScout",
        status: "success",
        content:
          "Multiple RCTs support aspirin's role. ClinicalTrials.gov: https://clinicaltrials.gov/ct2/show/NCT12345678.",
        timestamp: "2025-01-02T10:05:00Z",
      },
      hawk: {
        agentId: "hawk",
        status: "success",
        content:
          "GI bleeding risk increases with long-term use. PMID 87654321 documents adverse events.",
        timestamp: "2025-01-02T10:10:00Z",
      },
      librarian: {
        agentId: "librarian",
        status: "success",
        content:
          "Systematic review: DOI: 10.1016/j.canlet.2021.01.001. 15 trials included.",
        timestamp: "2025-01-02T10:15:00Z",
      },
    },
    completedAt: "2025-01-02T10:20:00Z",
  },
  gapAnalysis: {
    summary: "Evidence is moderate but gaps exist in long-term safety data.",
    tppChecklist: [
      {
        category: "Mechanism of Action",
        status: "complete",
        notes: "Well established",
      },
      {
        category: "Clinical Efficacy",
        status: "partial",
        notes: "Phase 2 data only",
      },
      {
        category: "Long-term Safety",
        status: "missing",
        notes: "No 10-year data",
      },
    ],
    presentEvidence: [
      {
        category: "Mechanism of Action",
        description: "COX-2 inhibition reduces tumor promotion.",
        sources: ["biologist"],
        strength: "strong",
      },
    ],
    missingEvidence: [
      {
        category: "Long-term Safety",
        description: "No 10-year safety data available.",
        severity: "major",
        recommendation: "Conduct long-term cohort study.",
      },
    ],
    contradictions: [
      {
        description: "Conflicting data on optimal dose.",
        sourceA: { agentId: "biologist", claim: "81mg is sufficient" },
        sourceB: {
          agentId: "clinicalScout",
          claim: "325mg required for effect",
        },
        severity: "minor",
        resolution: "Head-to-head trial needed.",
      },
    ],
    riskFlags: [
      {
        flag: "GI_BLEEDING",
        description: "Risk of gastrointestinal bleeding in elderly patients.",
        severity: "major",
        relatedGaps: ["Long-term Safety"],
      },
    ],
    overallReadiness: "conditional",
    recommendations: [
      "Conduct 10-year safety study.",
      "Define optimal dose in RCT.",
    ],
  },
  verificationReport: {
    summary: "Most claims confirmed; one flagged for dose discrepancy.",
    totalClaimsChecked: 3,
    confirmedCount: 2,
    flaggedCount: 1,
    unverifiableCount: 0,
    claims: [
      {
        claimId: "claim-001",
        originalClaim: "Aspirin inhibits COX-2.",
        sourceAgent: "biologist",
        verificationStatus: "confirmed",
        confidence: 0.95,
        evidence: "Multiple biochemistry studies confirm COX-2 inhibition.",
      },
      {
        claimId: "claim-002",
        originalClaim: "81mg/day is effective dose.",
        sourceAgent: "clinicalScout",
        verificationStatus: "flagged",
        confidence: 0.6,
        evidence: "Some studies suggest 325mg needed.",
        discrepancy: "Dose inconsistency across studies.",
      },
      {
        claimId: "claim-003",
        originalClaim: "GI bleeding risk documented.",
        sourceAgent: "hawk",
        verificationStatus: "confirmed",
        confidence: 0.9,
        evidence: "FDA adverse event database confirms.",
      },
    ],
    overallIntegrity: "medium",
    recommendations: [
      "Clarify optimal dose in further RCTs.",
      "Monitor GI safety in long-term studies.",
    ],
  },
  reviewerDecision: {
    approved: true,
    reviewer: "Prof. Johnson",
    notes: "Proceed with conditional approval pending dose clarification.",
  },
  metadata: {
    sessionId: "ses_test_full_001",
    timestamp: "2025-01-02T11:00:00Z",
    llmProviders: { biologist: "gpt-4o", clinicalScout: "claude-3-5-sonnet" },
  },
};

// ─── escapeLatex ──────────────────────────────────────────────────────────────

describe("escapeLatex", () => {
  it("escapes all LaTeX special characters", () => {
    const input = "a & b % c $ d # e _ f { g } h ~ i ^ j \\k";
    const result = escapeLatex(input);

    expect(result).toContain("\\&");
    expect(result).toContain("\\%");
    expect(result).toContain("\\$");
    expect(result).toContain("\\#");
    expect(result).toContain("\\_");
    expect(result).toContain("\\{");
    expect(result).toContain("\\}");
    expect(result).toContain("\\textasciitilde{}");
    expect(result).toContain("\\textasciicircum{}");
    expect(result).toContain("\\textbackslash{}");
  });

  it("leaves plain text unchanged", () => {
    expect(escapeLatex("Hello World")).toBe("Hello World");
    expect(escapeLatex("123 abc")).toBe("123 abc");
  });

  it("handles empty string", () => {
    expect(escapeLatex("")).toBe("");
  });
});

// ─── extractCitations ─────────────────────────────────────────────────────────

describe("extractCitations", () => {
  it("extracts DOI references", () => {
    const text = "See DOI: 10.1056/NEJMoa2101100 for details.";
    const citations = extractCitations(text);
    expect(citations.some((c) => c.ref.includes("10.1056/NEJMoa2101100"))).toBe(
      true,
    );
  });

  it("extracts PMID references", () => {
    const text = "Key study PMID: 12345678 supports this claim.";
    const citations = extractCitations(text);
    expect(citations.some((c) => c.key === "pmid:12345678")).toBe(true);
  });

  it("extracts URL references", () => {
    const text =
      "Data from https://clinicaltrials.gov/ct2/show/NCT001 was used.";
    const citations = extractCitations(text);
    expect(citations.some((c) => c.ref.includes("clinicaltrials.gov"))).toBe(
      true,
    );
  });

  it("deduplicates identical citations", () => {
    const text = "See PMID: 99999999 and again PMID: 99999999 here.";
    const citations = extractCitations(text);
    const pmidCitations = citations.filter((c) => c.key === "pmid:99999999");
    expect(pmidCitations.length).toBe(1);
  });
});

// ─── generateReport (raw LaTeX) ───────────────────────────────────────────────

describe("generateReport", () => {
  it("returns a string containing \\documentclass", () => {
    const result = generateReport(minimalInput);
    expect(result).toContain("\\documentclass");
    expect(typeof result).toBe("string");
  });

  it("contains \\begin{document} and \\end{document}", () => {
    const result = generateReport(minimalInput);
    expect(result).toContain("\\begin{document}");
    expect(result).toContain("\\end{document}");
  });

  it("includes title page with query, timestamp, session ID, and reviewer", () => {
    const result = generateReport(minimalInput);
    expect(result).toContain("\\begin{titlepage}");
    expect(result).toContain("Metformin for Alzheimer disease");
    expect(result).toContain("2025-01-01T12:00:00Z");
    expect(result).toContain("ses\\_test\\_001");
    expect(result).toContain("Dr. Smith");
  });

  it("includes Executive Summary section", () => {
    const result = generateReport(fullInput);
    expect(result).toContain("\\section{Executive Summary}");
    expect(result).toContain("Most claims confirmed");
    expect(result).toContain("Evidence is moderate but gaps exist");
  });

  it("includes PPICO Breakdown section", () => {
    const result = generateReport(fullInput);
    expect(result).toContain("\\section{PPICO Breakdown}");
    expect(result).toContain("Adults aged 50+");
    expect(result).toContain("Aspirin 81mg/day");
    expect(result).toContain("Colorectal cancer incidence");
  });

  it("includes Biological Rationale, Clinical Landscape, Safety Profile, Literature Review sections", () => {
    const result = generateReport(fullInput);
    expect(result).toContain("\\section{Biological Rationale}");
    expect(result).toContain("\\section{Clinical Landscape}");
    expect(result).toContain("\\section{Safety Profile}");
    expect(result).toContain("\\section{Literature Review}");
  });

  it("includes Gap Analysis section with TPP checklist", () => {
    const result = generateReport(fullInput);
    expect(result).toContain("\\section{Gap Analysis}");
    expect(result).toContain("\\subsection{TPP Checklist}");
    expect(result).toContain("Mechanism of Action");
    expect(result).toContain("Clinical Efficacy");
    expect(result).toContain("Long-term Safety");
  });

  it("includes Verification Report section with claims table", () => {
    const result = generateReport(fullInput);
    expect(result).toContain("\\section{Verification Report}");
    expect(result).toContain("\\subsection{Claims Table}");
    expect(result).toContain("claim-001");
    expect(result).toContain("claim-002");
    expect(result).toContain("confirmed");
    expect(result).toContain("flagged");
  });

  it("includes Reviewer Decision section", () => {
    const result = generateReport(fullInput);
    expect(result).toContain("\\section{Reviewer Decision}");
    expect(result).toContain("APPROVED");
    expect(result).toContain("Prof. Johnson");
  });

  it("includes Appendices section", () => {
    const result = generateReport(fullInput);
    expect(result).toContain("\\appendix");
    expect(result).toContain("Gap Analysis Recommendations");
    expect(result).toContain("Verification Report Recommendations");
  });

  it("includes bibliography section", () => {
    const result = generateReport(fullInput);
    expect(result).toContain("\\begin{thebibliography}");
    expect(result).toContain("\\end{thebibliography}");
  });

  it("generates APA-style bibliography with DOIs and PMIDs from agent content", () => {
    const result = generateReport(fullInput);
    expect(result).toContain("10.1056/NEJMoa2101100");
    expect(result).toContain("12345678");
    expect(result).toContain("\\bibitem{");
  });

  it("works with minimal input (empty agent content, no gaps)", () => {
    const result = generateReport(minimalInput);
    expect(result).toContain("\\section{Gap Analysis}");
    expect(result).toContain("No checklist items.");
    expect(result).toContain("No claims checked.");
    expect(result).toContain("\\begin{thebibliography}{0}");
  });

  it("escapes special characters in query", () => {
    const inputWithSpecialChars: ReportInput = {
      ...minimalInput,
      query: "Drug A & Drug B: 50% efficacy in patients (N=100)",
    };
    const result = generateReport(inputWithSpecialChars);
    expect(result).toContain("\\&");
    expect(result).toContain("\\%");
    expect(result).not.toContain("Drug A & Drug B");
  });
});

// ─── generateMarkdown ─────────────────────────────────────────────────────────

describe("generateMarkdown", () => {
  it("returns a string with YAML frontmatter", () => {
    const md = generateMarkdown(minimalInput);
    expect(md).toMatch(/^---\n/);
    expect(md).toContain("title:");
    expect(md).toContain("date:");
    expect(md).toContain("author:");
    expect(md).toContain("---");
  });

  it("includes query in frontmatter title", () => {
    const md = generateMarkdown(minimalInput);
    expect(md).toContain("Metformin for Alzheimer disease");
  });

  it("includes all major section headings", () => {
    const md = generateMarkdown(fullInput);
    expect(md).toContain("# Executive Summary");
    expect(md).toContain("# PPICO Breakdown");
    expect(md).toContain("# Biological Rationale");
    expect(md).toContain("# Clinical Landscape");
    expect(md).toContain("# Safety Profile");
    expect(md).toContain("# Literature Review");
    expect(md).toContain("# Gap Analysis");
    expect(md).toContain("# Verification Report");
    expect(md).toContain("# Reviewer Decision");
    expect(md).toContain("# Appendices");
  });

  it("includes PPICO data as a markdown table", () => {
    const md = generateMarkdown(fullInput);
    expect(md).toContain("| **Population** |");
    expect(md).toContain("Adults aged 50+ at average risk");
    expect(md).toContain("Aspirin 81mg/day");
  });

  it("includes TPP checklist as a markdown table", () => {
    const md = generateMarkdown(fullInput);
    expect(md).toContain("## TPP Checklist");
    expect(md).toContain("| Category | Status | Notes |");
    expect(md).toContain("Mechanism of Action");
    expect(md).toContain("Long-term Safety");
  });

  it("includes claims table in verification section", () => {
    const md = generateMarkdown(fullInput);
    expect(md).toContain("## Claims Table");
    expect(md).toContain("claim-001");
    expect(md).toContain("claim-002");
    expect(md).toContain("95%");
  });

  it("includes reviewer decision with APPROVED/REJECTED", () => {
    const md = generateMarkdown(fullInput);
    expect(md).toContain("APPROVED");
    expect(md).toContain("Prof. Johnson");

    const rejectedMd = generateMarkdown(minimalInput);
    expect(rejectedMd).toContain("REJECTED");
    expect(rejectedMd).toContain("Dr. Smith");
  });

  it("handles empty agent content gracefully", () => {
    const md = generateMarkdown(minimalInput);
    expect(md).toContain("*No content provided.*");
  });

  it("includes gap analysis risk flags and recommendations", () => {
    const md = generateMarkdown(fullInput);
    expect(md).toContain("GI_BLEEDING");
    expect(md).toContain("Conduct 10-year safety study");
  });
});

// ─── compileReport (real pandoc invocation) ───────────────────────────────────

describe("compileReport", () => {
  it("getReportTempDir creates and returns a temp directory", async () => {
    const dir = await getReportTempDir();
    expect(dir).toContain("entropy-reports");
    expect(existsSync(dir)).toBe(true);
  });

  it("compiles to .tex via pandoc and writes the file", async () => {
    const md = generateMarkdown(minimalInput);
    const result = await compileReport(md, "test-tex-minimal", "latex");

    expect(result.success).toBe(true);
    expect(result.outputPath).toMatch(/\.tex$/);
    expect(existsSync(result.outputPath)).toBe(true);
  });

  it(".tex output contains LaTeX document structure", async () => {
    const md = generateMarkdown(minimalInput);
    const result = await compileReport(md, "test-tex-structure", "latex");

    const { readFile } = await import("node:fs/promises");
    const content = await readFile(result.outputPath, "utf8");

    expect(content).toContain("\\documentclass");
    expect(content).toContain("\\begin{document}");
    expect(content).toContain("Metformin for Alzheimer disease");
  });

  it("compiles to .pdf via pandoc+xelatex and writes the file", async () => {
    const md = generateMarkdown(minimalInput);
    const result = await compileReport(md, "test-pdf-minimal", "pdf");

    expect(result.success).toBe(true);
    expect(result.outputPath).toMatch(/\.pdf$/);
    expect(existsSync(result.outputPath)).toBe(true);
  }, 30_000); // xelatex can be slow

  it("compiled PDF file is non-empty (valid PDF header)", async () => {
    const md = generateMarkdown(minimalInput);
    const result = await compileReport(md, "test-pdf-valid", "pdf");

    const { readFile } = await import("node:fs/promises");
    const buf = await readFile(result.outputPath);

    // All PDFs start with %PDF-
    expect(buf.slice(0, 5).toString("ascii")).toBe("%PDF-");
  }, 30_000);

  it("compiles full realistic input to PDF without error", async () => {
    const md = generateMarkdown(fullInput);
    const result = await compileReport(md, "test-pdf-full", "pdf");

    expect(result.success).toBe(true);
    expect(existsSync(result.outputPath)).toBe(true);
  }, 30_000);
});
