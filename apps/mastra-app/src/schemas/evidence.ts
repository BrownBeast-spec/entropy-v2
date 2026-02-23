import { z } from "zod";

export const AgentEvidenceSchema = z.object({
  agentId: z.string(),
  status: z.enum(["success", "failure"]),
  content: z.string(),
  error: z.string().optional(),
  timestamp: z.string(),
});

export const EvidenceSchema = z.object({
  query: z.string(),
  ppicoBreakdown: z.object({
    population: z.string(),
    intervention: z.string(),
    comparison: z.string(),
    outcome: z.string(),
  }),
  plannerRationale: z.string(),
  agents: z.object({
    biologist: AgentEvidenceSchema,
    clinicalScout: AgentEvidenceSchema,
    hawk: AgentEvidenceSchema,
    librarian: AgentEvidenceSchema,
  }),
  completedAt: z.string(),
});

export type Evidence = z.infer<typeof EvidenceSchema>;
export type AgentEvidence = z.infer<typeof AgentEvidenceSchema>;
