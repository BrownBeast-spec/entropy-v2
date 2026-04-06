import { createWorkflow, createStep } from "@mastra/core/workflows";
import { z } from "zod";
import {
  GraphNodeSchema,
  GraphEdgeSchema,
  NodeTypeSchema,
} from "@entropy/api/src/schemas/graph-schema.js";
import { getGraphRepository } from "@entropy/api/src/lib/graph-repository.js";
import { scoreHelpfulness } from "../agents/helpfulness-agent.js";
import { findEdgeCandidates } from "../lib/edge-heuristics.js";
import { inferEdgesFromCandidates } from "../agents/edge-constructor-agent.js";
import { summariseFromGraph } from "../agents/synthesis-agent.js";
import { randomUUID } from "crypto";

// Define SynthesisResultSchema here since it's not exported from synthesis-agent
const CitationSchema = z.object({
  source: z.string().trim().min(1),
  label: z.string().trim().min(1),
  nodeId: z.string().trim().min(1),
});

const SectionSchema = z.object({
  title: z.string().trim().min(1),
  content: z.string().trim().min(1),
  citations: z.array(CitationSchema).default([]),
  reasoningTrace: z.string().optional(),
});

const SynthesisResultSchema = z.object({
  sections: z.array(SectionSchema).default([]),
});

// Input schema
const GraphSynthesisPipelineInputSchema = z.object({
  workspaceId: z.string(),
  queryText: z.string(),
  mode: z.enum(["Researcher", "Strategist"]),
  indiaLens: z.boolean().default(false),
  searchTypes: z.array(NodeTypeSchema).default([]),
  reportSections: z.array(z.string()).default([]),
  searchResults: z.array(z.unknown()).optional(), // Pre-fetched results
});

// Output schema
const GraphSynthesisPipelineOutputSchema = z.object({
  queryId: z.string(),
  addedNodesCount: z.number(),
  addedEdgesCount: z.number(),
  synthesis: SynthesisResultSchema,
});

// Step 1: Score helpfulness (reuse existing agent)
const helpfulnessStep = createStep({
  id: "score-helpfulness",
  inputSchema: GraphSynthesisPipelineInputSchema,
  outputSchema: z.object({
    scoredResults: z.array(z.unknown()),
    // Pass through pipeline context
    workspaceId: z.string(),
    queryText: z.string(),
    mode: z.enum(["Researcher", "Strategist"]),
    indiaLens: z.boolean(),
    reportSections: z.array(z.string()),
  }),
  execute: async ({ inputData }) => {
    if (!inputData.searchResults || inputData.searchResults.length === 0) {
      throw new Error("No search results provided");
    }

    // Get workspace graph for context
    const repo = getGraphRepository();
    const { nodes: existingNodes, edges } = await repo.getWorkspaceGraph(
      inputData.workspaceId,
    );

    const nodeTypes = Object.fromEntries(
      existingNodes.map((n) => [n.id, n.type]),
    );

    const existingConcepts = existingNodes.flatMap((n) =>
      Object.values(n.metadata)
        .filter((v): v is string => typeof v === "string")
        .flatMap((v) => v.toLowerCase().split(/\s+/)),
    );

    // Score each result using the correct HelpfulnessInput interface
    const scoredResults = await Promise.all(
      inputData.searchResults.map(async (result: any) => {
        const helpfulnessOutput = await scoreHelpfulness({
          result: {
            entityId: result.id || `temp-${Math.random()}`,
            entityType: result.type || "paper",
            label: result.title || result.name || "Unnamed",
            source: result.source || "Unknown",
            metadata: result,
          },
          graphSnapshot: {
            nodeIds: existingNodes.map((n) => n.id),
            nodeTypes,
            existingConcepts,
            edgeSummary: edges.map((e) => ({
              source: e.source,
              target: e.target,
              type: e.type,
            })),
          },
          queryContext: inputData.queryText,
        });
        return { ...result, helpfulnessScore: helpfulnessOutput.score };
      }),
    );

    return {
      scoredResults,
      // Pass through context
      workspaceId: inputData.workspaceId,
      queryText: inputData.queryText,
      mode: inputData.mode,
      indiaLens: inputData.indiaLens,
      reportSections: inputData.reportSections,
    };
  },
});

// Step 2: Add nodes to graph
const addNodesToGraphStep = createStep({
  id: "add-nodes",
  inputSchema: z.object({
    scoredResults: z.array(z.unknown()),
    workspaceId: z.string(),
    queryText: z.string(),
    mode: z.enum(["Researcher", "Strategist"]),
    indiaLens: z.boolean(),
    reportSections: z.array(z.string()),
  }),
  outputSchema: z.object({
    queryId: z.string(),
    addedNodes: z.array(GraphNodeSchema),
    workspaceId: z.string(),
  }),
  execute: async ({ inputData }) => {
    const repo = getGraphRepository();

    // Create query record
    const queryId = randomUUID();
    await repo.createQuery({
      workspaceId: inputData.workspaceId,
      text: inputData.queryText,
      mode: inputData.mode,
      indiaLens: inputData.indiaLens,
      status: "running",
    });

    // Transform search results to GraphNode format
    const nodes = inputData.scoredResults
      .filter((r: any) => (r.helpfulnessScore || 0) > 0.5) // Filter by score
      .slice(0, 10) // Limit to top 10
      .map((r: any) => ({
        label: r.title || r.name || "Unnamed",
        type: r.type || "paper",
        source: r.source || "PubMed",
        metadata: r,
        evidenceScore: r.helpfulnessScore,
        indiaRelevant: inputData.indiaLens
          ? r.indiaRelevant || false
          : undefined,
      }));

    // Add to Neo4j
    const addedNodes = await repo.addNodesToWorkspace(
      inputData.workspaceId,
      nodes,
      queryId,
    );

    return { queryId, addedNodes, workspaceId: inputData.workspaceId };
  },
});

// Step 3: Construct edges
const constructEdgesStep = createStep({
  id: "construct-edges",
  inputSchema: z.object({
    queryId: z.string(),
    addedNodes: z.array(GraphNodeSchema),
    workspaceId: z.string(),
  }),
  outputSchema: z.object({
    addedEdges: z.array(GraphEdgeSchema),
    workspaceId: z.string(),
  }),
  execute: async ({ inputData, getStepResult }) => {
    // Get mode from the helpfulness step output
    const helpfulnessOutput = getStepResult<{
      mode: "Researcher" | "Strategist";
    }>("score-helpfulness");

    const repo = getGraphRepository();

    // Get existing nodes
    const { nodes: existingNodes } = await repo.getWorkspaceGraph(
      inputData.workspaceId,
    );

    // Find candidates
    const candidates = findEdgeCandidates(
      inputData.addedNodes,
      existingNodes,
      20,
    );

    if (candidates.length === 0) {
      return { addedEdges: [], workspaceId: inputData.workspaceId };
    }

    // Infer edges with LLM
    const inferredEdges = await inferEdgesFromCandidates(
      candidates,
      [...existingNodes, ...inputData.addedNodes],
      {
        workspaceMode: helpfulnessOutput.mode,
      },
    );

    // Store in Neo4j
    const addedEdges = await repo.addEdges(
      inputData.workspaceId,
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

    return { addedEdges, workspaceId: inputData.workspaceId };
  },
});

// Step 4: Synthesize report
const synthesizeStep = createStep({
  id: "synthesize",
  inputSchema: z.object({
    addedEdges: z.array(GraphEdgeSchema),
    workspaceId: z.string(),
  }),
  outputSchema: SynthesisResultSchema,
  execute: async ({ inputData, getStepResult }) => {
    // Get mode and other context from helpfulness step
    const helpfulnessOutput = getStepResult<{
      mode: "Researcher" | "Strategist";
      indiaLens: boolean;
      reportSections: string[];
    }>("score-helpfulness");

    const repo = getGraphRepository();

    // Get full workspace graph
    const { nodes, edges } = await repo.getWorkspaceGraph(
      inputData.workspaceId,
    );

    // Synthesize with deep reasoning
    const synthesis = await summariseFromGraph({
      graphSnapshot: { nodes, edges },
      personaMode: helpfulnessOutput.mode,
      reportSections: helpfulnessOutput.reportSections,
      indiaLens: helpfulnessOutput.indiaLens,
    });

    return synthesis;
  },
});

// Compose workflow
export const graphSynthesisPipeline = createWorkflow({
  id: "graph-synthesis-pipeline",
  inputSchema: GraphSynthesisPipelineInputSchema,
  outputSchema: GraphSynthesisPipelineOutputSchema,
})
  .then(helpfulnessStep)
  .then(addNodesToGraphStep)
  .then(constructEdgesStep)
  .then(synthesizeStep)
  .map(async ({ getStepResult }) => {
    const addNodesResult = getStepResult<{
      queryId: string;
      addedNodes: any[];
    }>("add-nodes");
    const edgesResult = getStepResult<{ addedEdges: any[] }>("construct-edges");
    const synthesis = getStepResult(synthesizeStep.id);

    return {
      queryId: addNodesResult.queryId,
      addedNodesCount: addNodesResult.addedNodes.length,
      addedEdgesCount: edgesResult.addedEdges.length,
      synthesis,
    };
  })
  .commit();
