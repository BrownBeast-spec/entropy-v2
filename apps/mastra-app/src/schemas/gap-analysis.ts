import { z } from "zod";

export const EvidenceItemSchema = z.object({
  category: z
    .string()
    .describe("TPP checklist category this evidence belongs to"),
  description: z.string().describe("Summary of the evidence found"),
  sources: z
    .array(z.string())
    .describe("Agent IDs and citations that provided this evidence"),
  strength: z
    .enum(["strong", "moderate", "weak"])
    .describe("Strength of evidence"),
});

export const GapItemSchema = z.object({
  category: z.string().describe("TPP checklist category with missing evidence"),
  description: z.string().describe("What evidence is missing"),
  severity: z
    .enum(["critical", "major", "minor"])
    .describe("How important this gap is"),
  recommendation: z.string().describe("Suggested action to fill this gap"),
});

export const ContradictionSchema = z.object({
  description: z.string().describe("Summary of the contradiction"),
  sourceA: z.object({
    agentId: z.string(),
    claim: z.string(),
  }),
  sourceB: z.object({
    agentId: z.string(),
    claim: z.string(),
  }),
  severity: z.enum(["critical", "major", "minor"]),
  resolution: z
    .string()
    .optional()
    .describe("Suggested resolution or further investigation"),
});

export const RiskFlagSchema = z.object({
  flag: z.string().describe("Short identifier for the risk flag"),
  description: z.string().describe("Detailed description of the risk"),
  severity: z.enum(["critical", "major", "minor"]),
  relatedGaps: z
    .array(z.string())
    .optional()
    .describe("Related gap categories"),
});

export const GapAnalysisSchema = z.object({
  summary: z.string().describe("Executive summary of the gap analysis"),
  tppChecklist: z
    .array(
      z.object({
        category: z.string(),
        status: z.enum(["complete", "partial", "missing"]),
        notes: z.string(),
      }),
    )
    .describe("Status of each TPP checklist item"),
  presentEvidence: z.array(EvidenceItemSchema),
  missingEvidence: z.array(GapItemSchema),
  contradictions: z.array(ContradictionSchema),
  riskFlags: z.array(RiskFlagSchema),
  overallReadiness: z
    .enum(["ready", "conditional", "not-ready"])
    .describe(
      "Overall readiness assessment for the drug repurposing hypothesis",
    ),
  recommendations: z
    .array(z.string())
    .describe("Prioritized list of next steps"),
});

export type GapAnalysis = z.infer<typeof GapAnalysisSchema>;
