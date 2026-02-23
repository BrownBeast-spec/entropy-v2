import { z } from "zod";

export const SubTaskSchema = z.object({
  id: z.string().describe("Unique sub-task identifier, e.g. 'bio-1'"),
  targetAgent: z.enum([
    "biologist",
    "clinical-scout",
    "hawk-safety",
    "librarian",
  ]),
  query: z.string().describe("Specific query/instruction for the target agent"),
  priority: z.enum(["high", "medium", "low"]),
  dependsOn: z
    .array(z.string())
    .default([])
    .describe("IDs of sub-tasks this depends on"),
});

export const PlannerOutputSchema = z.object({
  originalQuery: z.string(),
  ppicoBreakdown: z.object({
    population: z.string().describe("Target patient population"),
    intervention: z.string().describe("The drug being repurposed"),
    comparison: z.string().describe("Standard of care or comparator"),
    outcome: z.string().describe("Expected therapeutic outcome"),
  }),
  subTasks: z.array(SubTaskSchema).min(1),
  rationale: z
    .string()
    .describe("Brief explanation of why these sub-tasks were chosen"),
});

export type PlannerOutput = z.infer<typeof PlannerOutputSchema>;
export type SubTask = z.infer<typeof SubTaskSchema>;
