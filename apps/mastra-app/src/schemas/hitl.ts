import { z } from "zod";
import { VerificationReportSchema } from "./verification-report.js";

export const HitlResumeSchema = z.object({
  /** true = approve and generate PDF, false = reject or request changes */
  approved: z.boolean(),
  /** true = send back for refinement with suggestions (approved must be false) */
  requestChanges: z.boolean().optional(),
  reviewer: z.string(),
  /** Reviewer feedback / required edits for the "request changes" loop */
  suggestions: z.string().optional(),
});

export const HitlOutputSchema = z.object({
  approved: z.boolean(),
  reviewer: z.string(),
  suggestions: z.string(),
  verificationReport: VerificationReportSchema,
  /** Absolute path to the HTML preview file generated before suspension */
  htmlPreviewPath: z.string(),
  /** How many review iterations happened (starts at 1) */
  iterationCount: z.number(),
});

export type HitlResume = z.infer<typeof HitlResumeSchema>;
export type HitlOutput = z.infer<typeof HitlOutputSchema>;
