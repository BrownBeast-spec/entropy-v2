import { z } from "zod";

export const NodeTypeSchema = z.enum([
  "disease",
  "gene",
  "protein",
  "drug",
  "compound",
  "patent",
  "trial",
  "company",
  "paper",
]);

export const DataSourceSchema = z.enum([
  "Open Targets",
  "STRING",
  "PubMed",
  "PatentsView",
  "OpenFDA",
  "ClinicalTrials.gov",
  "Europe PMC",
  "UniProt",
  "PubChem",
]);

export const EdgeTypeSchema = z.enum([
  "association",
  "interaction",
  "binding",
  "ownership",
  "sponsorship",
  "inferred_relationship", // NEW for LLM-inferred edges
]);

export const GraphNodeSchema = z.object({
  id: z.string(),
  label: z.string(),
  type: NodeTypeSchema,
  source: DataSourceSchema,
  metadata: z.record(z.unknown()),
  evidenceScore: z.number().optional(),
  addedByQuery: z.string().optional(), // Query ID
  indiaRelevant: z.boolean().optional(),
});

export const GraphEdgeSchema = z.object({
  id: z.string(),
  source: z.string(), // Node ID
  target: z.string(), // Node ID
  type: EdgeTypeSchema,
  confidence: z.number().optional(),
  metadata: z.record(z.unknown()),
  inferredBy: z.enum(["LLM", "heuristic", "manual"]).optional(),
  reasoning: z.string().optional(), // LLM reasoning trace
});

export const WorkspaceSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  mode: z.enum(["Researcher", "Strategist"]).optional(),
  indiaLens: z.boolean().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const QuerySchema = z.object({
  id: z.string(),
  workspaceId: z.string(),
  text: z.string(),
  mode: z.enum(["Researcher", "Strategist"]),
  indiaLens: z.boolean(),
  submittedAt: z.date(),
  status: z.enum(["pending", "running", "complete", "failed"]),
  completenessScore: z.number().optional(),
  iterations: z.number().optional(),
});

// Export TypeScript types
export type GraphNode = z.infer<typeof GraphNodeSchema>;
export type GraphEdge = z.infer<typeof GraphEdgeSchema>;
export type Workspace = z.infer<typeof WorkspaceSchema>;
export type Query = z.infer<typeof QuerySchema>;
export type NodeType = z.infer<typeof NodeTypeSchema>;
export type EdgeType = z.infer<typeof EdgeTypeSchema>;
export type DataSource = z.infer<typeof DataSourceSchema>;
