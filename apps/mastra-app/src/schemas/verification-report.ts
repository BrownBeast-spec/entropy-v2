import { z } from "zod";

export const VerifiedClaimSchema = z.object({
  claimId: z.string().describe("Unique ID for this claim"),
  originalClaim: z.string().describe("The claim text from the dossier"),
  sourceAgent: z.string().describe("Agent ID that made the claim"),
  verificationStatus: z
    .enum(["confirmed", "flagged", "unverifiable"])
    .describe("Result of re-verification"),
  confidence: z.number().min(0).max(1).describe("Confidence score 0-1"),
  evidence: z.string().describe("Evidence supporting or refuting the claim"),
  discrepancy: z
    .string()
    .optional()
    .describe("Description of any discrepancy found"),
});

export const VerificationReportSchema = z.object({
  summary: z.string().describe("Executive summary of verification results"),
  totalClaimsChecked: z.number().describe("Number of claims checked"),
  confirmedCount: z.number().describe("Number of confirmed claims"),
  flaggedCount: z.number().describe("Number of flagged claims"),
  unverifiableCount: z.number().describe("Number of unverifiable claims"),
  claims: z
    .array(VerifiedClaimSchema)
    .describe("Individual claim verification results"),
  overallIntegrity: z
    .enum(["high", "medium", "low"])
    .describe("Overall integrity assessment"),
  recommendations: z
    .array(z.string())
    .describe("Recommended follow-up actions"),
});

export type VerifiedClaim = z.infer<typeof VerifiedClaimSchema>;
export type VerificationReport = z.infer<typeof VerificationReportSchema>;
