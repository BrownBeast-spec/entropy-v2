import { Hono } from "hono";
import { z } from "zod";
import { getGraphRepository } from "../lib/graph-repository.js";
import { GraphNodeSchema } from "../schemas/graph-schema.js";
import { findEdgeCandidates } from "@entropy/mastra-app/src/lib/edge-heuristics.js";
import { inferEdgesFromCandidates } from "@entropy/mastra-app/src/agents/edge-constructor-agent.js";
import { errorResponse } from "../middleware/error-handler.js";

const workspace = new Hono();

// Request schemas
const CreateWorkspaceSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  mode: z.enum(["Researcher", "Strategist"]).optional(),
  indiaLens: z.boolean().optional(),
});

const AddNodesRequestSchema = z.object({
  nodes: z.array(GraphNodeSchema.omit({ id: true })),
  queryId: z.string().optional(),
  inferEdges: z.boolean().default(true), // Enable edge inference by default
});

const CreateQuerySchema = z.object({
  text: z.string().trim().min(1),
  mode: z.enum(["Researcher", "Strategist"]),
  indiaLens: z.boolean().default(false),
  status: z.enum(["pending", "running", "complete", "failed"]).default("pending"),
  completenessScore: z.number().optional(),
  iterations: z.number().optional(),
});

const UpdateNodeSchema = z
  .object({
    label: z.string().optional(),
    type: z.enum([
      "disease",
      "gene",
      "protein",
      "drug",
      "compound",
      "patent",
      "trial",
      "company",
      "paper",
    ]).optional(),
    source: z.enum([
      "Open Targets",
      "STRING",
      "PubMed",
      "PatentsView",
      "OpenFDA",
      "ClinicalTrials.gov",
      "Europe PMC",
    ]).optional(),
    metadata: z.record(z.unknown()).optional(),
    evidenceScore: z.number().optional(),
    indiaRelevant: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided for update",
  });


/**
 * POST /api/workspace/create
 * Create a new workspace
 */
workspace.post("/create", async (c) => {
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return errorResponse(c, 400, "BAD_REQUEST", "Invalid JSON body");
  }

  const parsed = CreateWorkspaceSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(c, 400, "VALIDATION_ERROR", "Invalid request", {
      issues: parsed.error.issues,
    });
  }

  const repo = getGraphRepository();
  const workspace = await repo.createWorkspace(parsed.data);

  return c.json(workspace, 201);
});

/**
 * GET /api/workspace/:id
 * Get workspace metadata
 */
workspace.get("/:id", async (c) => {
  const workspaceId = c.req.param("id");

  const repo = getGraphRepository();
  const workspace = await repo.getWorkspace(workspaceId);

  if (!workspace) {
    return errorResponse(c, 404, "NOT_FOUND", "Workspace not found");
  }

  return c.json(workspace);
});

/**
 * POST /api/workspace/:id/queries
 * Create a new query for a workspace
 */
workspace.post("/:id/queries", async (c) => {
  const workspaceId = c.req.param("id");

  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return errorResponse(c, 400, "BAD_REQUEST", "Invalid JSON body");
  }

  const parsed = CreateQuerySchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(c, 400, "VALIDATION_ERROR", "Invalid request", {
      issues: parsed.error.issues,
    });
  }

  const repo = getGraphRepository();
  const workspace = await repo.getWorkspace(workspaceId);
  if (!workspace) {
    return errorResponse(c, 404, "NOT_FOUND", "Workspace not found");
  }

  const query = await repo.createQuery({
    workspaceId,
    text: parsed.data.text,
    mode: parsed.data.mode,
    indiaLens: parsed.data.indiaLens,
    status: parsed.data.status,
    completenessScore: parsed.data.completenessScore,
    iterations: parsed.data.iterations,
  });

  return c.json(query, 201);
});

/**
 * GET /api/workspace/:id/queries
 * List queries for a workspace
 */
workspace.get("/:id/queries", async (c) => {
  const workspaceId = c.req.param("id");

  const repo = getGraphRepository();
  const workspace = await repo.getWorkspace(workspaceId);
  if (!workspace) {
    return errorResponse(c, 404, "NOT_FOUND", "Workspace not found");
  }

  const queries = await repo.getQueriesByWorkspace(workspaceId);
  return c.json({ queries });
});

/**
 * POST /api/workspace/:id/nodes
 * Add nodes to workspace with automatic edge inference
 */
workspace.post("/:id/nodes", async (c) => {
  const workspaceId = c.req.param("id");

  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return errorResponse(c, 400, "BAD_REQUEST", "Invalid JSON body");
  }

  const parsed = AddNodesRequestSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(c, 400, "VALIDATION_ERROR", "Invalid request", {
      issues: parsed.error.issues,
    });
  }

  const repo = getGraphRepository();

  // 1. Add nodes to Neo4j
  const addedNodes = await repo.addNodesToWorkspace(
    workspaceId,
    parsed.data.nodes,
    parsed.data.queryId,
  );

  let addedEdges: any[] = [];

  // 2. Infer edges if requested
  if (parsed.data.inferEdges) {
    try {
      const { nodes: existingNodes } =
        await repo.getWorkspaceGraph(workspaceId);

      // Heuristic candidate selection
      const candidates = findEdgeCandidates(addedNodes, existingNodes, 20);

      if (candidates.length > 0) {
        // LLM edge inference
        const workspace = await repo.getWorkspace(workspaceId);
        const inferredEdges = await inferEdgesFromCandidates(
          candidates,
          [...existingNodes, ...addedNodes],
          {
            workspaceMode: workspace?.mode || "Researcher",
          },
        );

        // Store edges in Neo4j
        if (inferredEdges.length > 0) {
          addedEdges = await repo.addEdges(
            workspaceId,
            inferredEdges.map((e) => ({
              source: e.sourceId,
              target: e.targetId,
              type: e.type,
              confidence: e.confidence,
              metadata: {},
              inferredBy: "LLM" as const,
              reasoning: e.reasoning,
            })),
          );
        }
      }
    } catch (error) {
      console.error("[add-nodes] Edge inference failed:", error);
      // Continue without edges (don't fail the whole request)
    }
  }

  return c.json({
    addedNodes,
    addedEdges,
  });
});

/**
 * GET /api/workspace/:id/graph
 * Get complete graph for a workspace
 */
workspace.get("/:id/graph", async (c) => {
  const workspaceId = c.req.param("id");

  const repo = getGraphRepository();
  const graph = await repo.getWorkspaceGraph(workspaceId);

  return c.json(graph);
});

/**
 * DELETE /api/workspace/:id/nodes/:nodeId
 * Remove a node from workspace (and its edges)
 */
workspace.delete("/:id/nodes/:nodeId", async (c) => {
  const workspaceId = c.req.param("id");
  const nodeId = c.req.param("nodeId");

  const repo = getGraphRepository();
  
  // Check if workspace exists
  const workspace = await repo.getWorkspace(workspaceId);
  if (!workspace) {
    return errorResponse(c, 404, "NOT_FOUND", "Workspace not found");
  }

  const result = await repo.deleteNode(workspaceId, nodeId);

  if (!result.success) {
    return errorResponse(c, 404, "NOT_FOUND", "Node not found in workspace");
  }

  return c.json({ success: true });
});

/**
 * PATCH /api/workspace/:id/nodes/:nodeId
 * Update node properties (partial update)
 */
workspace.patch("/:id/nodes/:nodeId", async (c) => {
  const workspaceId = c.req.param("id");
  const nodeId = c.req.param("nodeId");

  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return errorResponse(c, 400, "BAD_REQUEST", "Invalid JSON body");
  }

  const parsed = UpdateNodeSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(c, 400, "VALIDATION_ERROR", "Invalid request", {
      issues: parsed.error.issues,
    });
  }

  const repo = getGraphRepository();
  
  // Check if workspace exists
  const workspace = await repo.getWorkspace(workspaceId);
  if (!workspace) {
    return errorResponse(c, 404, "NOT_FOUND", "Workspace not found");
  }

  const updatedNode = await repo.updateNode(workspaceId, nodeId, parsed.data);

  if (!updatedNode) {
    return errorResponse(c, 404, "NOT_FOUND", "Node not found in workspace");
  }

  return c.json(updatedNode);
});

export default workspace;
