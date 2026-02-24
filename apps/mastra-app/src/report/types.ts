import { z } from "zod";
import { VerificationReportSchema } from "../schemas/verification-report.js";
import { EvidenceSchema } from "../schemas/evidence.js";
import { GapAnalysisSchema } from "../schemas/gap-analysis.js";

export const ReportInputSchema = z.object({
  query: z.string(),
  evidence: EvidenceSchema,
  gapAnalysis: GapAnalysisSchema,
  verificationReport: VerificationReportSchema,
  reviewerDecision: z.object({
    approved: z.boolean(),
    reviewer: z.string(),
    notes: z.string(),
  }),
  metadata: z.object({
    sessionId: z.string().optional(),
    timestamp: z.string(),
    llmProviders: z.record(z.string()).optional(),
  }),
});

export type ReportInput = z.infer<typeof ReportInputSchema>;
