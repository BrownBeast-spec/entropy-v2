import { describe, it, expect } from "vitest";
import {
  GapAnalysisSchema,
  EvidenceItemSchema,
  GapItemSchema,
  ContradictionSchema,
  RiskFlagSchema,
} from "../schemas/gap-analysis.js";
import { DEFAULT_TPP_CHECKLIST } from "../lib/tpp-checklist.js";

describe("GapAnalysisSchema", () => {
  it("validates a complete gap analysis object", () => {
    const gapAnalysis = {
      summary: "Evidence supports rationale but key gaps remain.",
      tppChecklist: [
        {
          category: "Mechanism of Action / Biological Rationale",
          status: "complete",
          notes: "Strong pathway evidence from biologist.",
        },
      ],
      presentEvidence: [
        {
          category: "Mechanism of Action / Biological Rationale",
          description: "AMPK activation supports neuroprotection.",
          sources: ["biologist:ref1"],
          strength: "strong",
        },
      ],
      missingEvidence: [
        {
          category: "Chronic Toxicity Data",
          description: "Long-term toxicity in target population absent.",
          severity: "major",
          recommendation: "Run chronic toxicity studies in model systems.",
        },
      ],
      contradictions: [
        {
          description: "Efficacy signal conflicts with safety risk.",
          sourceA: { agentId: "biologist", claim: "Strong efficacy signal." },
          sourceB: { agentId: "hawk-safety", claim: "Severe risk noted." },
          severity: "major",
          resolution: "Investigate dose-dependent safety window.",
        },
      ],
      riskFlags: [
        {
          flag: "missing-chronic-tox",
          description: "No chronic toxicity data available.",
          severity: "major",
          relatedGaps: ["Chronic Toxicity Data"],
        },
      ],
      overallReadiness: "conditional",
      recommendations: ["Prioritize chronic toxicity assessment."],
    };

    const parsed = GapAnalysisSchema.parse(gapAnalysis);
    expect(parsed.summary).toBe(gapAnalysis.summary);
    expect(parsed.presentEvidence[0].strength).toBe("strong");
  });

  it("rejects invalid readiness value", () => {
    const invalid = {
      summary: "Invalid readiness",
      tppChecklist: [],
      presentEvidence: [],
      missingEvidence: [],
      contradictions: [],
      riskFlags: [],
      overallReadiness: "unknown",
      recommendations: [],
    };

    const result = GapAnalysisSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });
});

describe("Gap analysis sub-schemas", () => {
  it("validates evidence item schema", () => {
    const parsed = EvidenceItemSchema.parse({
      category: "Clinical Efficacy (clinical trial data)",
      description: "Phase 2 signal observed.",
      sources: ["clinical-scout:NCT123"],
      strength: "moderate",
    });

    expect(parsed.strength).toBe("moderate");
  });

  it("validates gap item schema", () => {
    const parsed = GapItemSchema.parse({
      category: "Regulatory Pathway / Precedent",
      description: "No regulatory precedent identified.",
      severity: "minor",
      recommendation: "Review comparable approvals.",
    });

    expect(parsed.severity).toBe("minor");
  });

  it("validates contradiction schema", () => {
    const parsed = ContradictionSchema.parse({
      description: "Conflicting efficacy signals.",
      sourceA: { agentId: "clinical-scout", claim: "Positive signal." },
      sourceB: { agentId: "librarian", claim: "Null results." },
      severity: "major",
    });

    expect(parsed.sourceA.agentId).toBe("clinical-scout");
  });

  it("validates risk flag schema", () => {
    const parsed = RiskFlagSchema.parse({
      flag: "regulatory-off-label",
      description: "Potential off-label regulatory risk.",
      severity: "minor",
    });

    expect(parsed.flag).toBe("regulatory-off-label");
  });
});

describe("DEFAULT_TPP_CHECKLIST", () => {
  it("includes expected categories", () => {
    expect(DEFAULT_TPP_CHECKLIST).toContain(
      "Mechanism of Action / Biological Rationale",
    );
    expect(DEFAULT_TPP_CHECKLIST).toContain("Chronic Toxicity Data");
    expect(DEFAULT_TPP_CHECKLIST).toContain(
      "Clinical Efficacy (clinical trial data)",
    );
  });
});
