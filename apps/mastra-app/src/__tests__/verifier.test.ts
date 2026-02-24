import { describe, it, expect } from "vitest";
import {
  VerificationReportSchema,
  VerifiedClaimSchema,
} from "../schemas/verification-report.js";

describe("VerificationReportSchema", () => {
  it("validates a complete verification report", () => {
    const report = {
      summary: "Verification complete. 3 claims checked.",
      totalClaimsChecked: 3,
      confirmedCount: 2,
      flaggedCount: 1,
      unverifiableCount: 0,
      claims: [
        {
          claimId: "claim-1",
          originalClaim: "Metformin activates AMPK pathway.",
          sourceAgent: "biologist",
          verificationStatus: "confirmed",
          confidence: 0.95,
          evidence: "Open Targets confirms AMPK activation mechanism.",
        },
        {
          claimId: "claim-2",
          originalClaim: "Phase 2 trial NCT12345 shows efficacy.",
          sourceAgent: "clinical-scout",
          verificationStatus: "confirmed",
          confidence: 0.88,
          evidence: "ClinicalTrials.gov confirms trial with positive results.",
        },
        {
          claimId: "claim-3",
          originalClaim: "No hepatotoxicity reports in FDA database.",
          sourceAgent: "hawk-safety",
          verificationStatus: "flagged",
          confidence: 0.3,
          evidence: "OpenFDA shows 12 hepatotoxicity reports.",
          discrepancy:
            "Claim states no reports but FDA database shows 12 events.",
        },
      ],
      overallIntegrity: "medium",
      recommendations: ["Investigate hepatotoxicity reports further."],
    };

    const parsed = VerificationReportSchema.parse(report);
    expect(parsed.totalClaimsChecked).toBe(3);
    expect(parsed.claims).toHaveLength(3);
    expect(parsed.claims[2].verificationStatus).toBe("flagged");
  });

  it("rejects invalid integrity value", () => {
    const invalid = {
      summary: "Test",
      totalClaimsChecked: 0,
      confirmedCount: 0,
      flaggedCount: 0,
      unverifiableCount: 0,
      claims: [],
      overallIntegrity: "unknown",
      recommendations: [],
    };

    const result = VerificationReportSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it("rejects confidence score out of range", () => {
    const claim = {
      claimId: "c1",
      originalClaim: "Test claim",
      sourceAgent: "biologist",
      verificationStatus: "confirmed",
      confidence: 1.5,
      evidence: "Test evidence",
    };

    const result = VerifiedClaimSchema.safeParse(claim);
    expect(result.success).toBe(false);
  });

  it("validates claim with discrepancy field", () => {
    const claim = {
      claimId: "c1",
      originalClaim: "Claim text",
      sourceAgent: "hawk-safety",
      verificationStatus: "flagged",
      confidence: 0.2,
      evidence: "Contradicting evidence",
      discrepancy: "Data does not match claim",
    };

    const parsed = VerifiedClaimSchema.parse(claim);
    expect(parsed.discrepancy).toBe("Data does not match claim");
  });
});

describe("Verifier Agent", () => {
  it("is defined with correct ID", async () => {
    const { verifierAgent } = await import("../agents/verifier.js");
    expect(verifierAgent.id).toBe("verifier");
    expect(verifierAgent.name).toBe("Verifier Agent");
  });

  it("is registered with Mastra", async () => {
    const { mastra } = await import("../mastra/index.js");
    const agent = mastra.getAgent("verifierAgent");
    expect(agent).toBeDefined();
  });
});
