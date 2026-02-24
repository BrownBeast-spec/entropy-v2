import { z } from "zod";
import { VerificationReportSchema } from "./verification-report.js";

export const HitlResumeSchema = z.object({
  approved: z.boolean(),
  reviewer: z.string(),
  notes: z.string().optional(),
});

export const HitlOutputSchema = z.object({
  approved: z.boolean(),
  reviewer: z.string(),
  notes: z.string(),
  verificationReport: VerificationReportSchema,
});

export type HitlResume = z.infer<typeof HitlResumeSchema>;
export type HitlOutput = z.infer<typeof HitlOutputSchema>;
