import { Hono } from "hono";
import { z } from "zod";
import { mastra } from "@entropy/mastra-app/src/mastra/index.js";
import { errorResponse } from "../middleware/error-handler.js";
import { NodeTypeSchema } from "../schemas/graph-schema.js";

const workflow = new Hono();

const SynthesizeWorkflowRequestSchema = z
  .object({
    workspaceId: z.string(),
    queryText: z.string(),
    mode: z.enum(["Researcher", "Strategist"]),
    indiaLens: z.boolean().default(false),
    searchTypes: z.array(NodeTypeSchema).default([]),
    reportSections: z.array(z.string()).default([]),
    performSearch: z.boolean().default(false),
    searchResults: z.array(z.unknown()).optional(),
  })
  .refine(
    (data) => {
      // If performSearch is false, searchResults must be provided and non-empty
      if (data.performSearch === false) {
        return data.searchResults && data.searchResults.length > 0;
      }
      return true;
    },
    {
      message: "searchResults must be provided and non-empty when performSearch is false",
    },
  );

workflow.post("/synthesize", async (c) => {
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return errorResponse(c, 400, "BAD_REQUEST", "Invalid JSON body");
  }

  const parsed = SynthesizeWorkflowRequestSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(c, 400, "VALIDATION_ERROR", "Invalid request", {
      issues: parsed.error.issues,
    });
  }

  const input = parsed.data;

  try {
    // Get the workflow from Mastra
    const workflow = mastra.getWorkflow("graphSynthesisPipeline");
    
    // Create a new run
    const run = await workflow.createRun();

    // Execute the graph synthesis pipeline workflow
    const result = await run.start({
      inputData: {
        workspaceId: input.workspaceId,
        queryText: input.queryText,
        mode: input.mode,
        indiaLens: input.indiaLens,
        searchTypes: input.searchTypes,
        reportSections: input.reportSections,
        searchResults: input.searchResults || [],
      },
    });

    if (result.status !== "success") {
      throw new Error(
        `Workflow failed with status: ${result.status}. Error: ${JSON.stringify(result)}`,
      );
    }

    return c.json({
      queryId: result.result.queryId,
      addedNodesCount: result.result.addedNodesCount,
      addedEdgesCount: result.result.addedEdgesCount,
      synthesis: result.result.synthesis,
    });
  } catch (error) {
    console.error("Workflow execution error:", error);
    return errorResponse(
      c,
      500,
      "WORKFLOW_ERROR",
      error instanceof Error ? error.message : "Workflow execution failed",
      {
        details: error instanceof Error ? error.stack : String(error),
      },
    );
  }
});

// Get workflow status (for long-running workflows)
workflow.get("/status/:executionId", async (c) => {
  const executionId = c.req.param("executionId");

  // TODO: Implement execution tracking in Mastra

  return c.json({
    executionId,
    status: "unknown",
    message: "Execution tracking not yet implemented",
  });
});

export default workflow;
