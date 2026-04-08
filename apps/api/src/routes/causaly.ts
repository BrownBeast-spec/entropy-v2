import { Hono } from "hono";
import { z } from "zod";
import {
  getBiologyTools,
  getClinicalTrialsTools,
  getPatentsTools,
  getPubChemTools,
} from "@entropy/mastra-app/src/lib/mcp-client.js";
import { evaluateCompleteness } from "@entropy/mastra-app/src/index.js";
import { summariseFromGraph } from "@entropy/mastra-app/src/index.js";
import { suggestFollowups } from "@entropy/mastra-app/src/index.js";
import { errorResponse } from "../middleware/error-handler.js";

const causaly = new Hono();

const GraphSnapshotSchema = z.object({
  nodeIds: z.array(z.string()).default([]),
  edgeSummary: z.array(z.record(z.unknown())).default([]),
});

const AugmentRequestSchema = z.object({
  query: z.string().trim().min(1),
  graphSnapshot: GraphSnapshotSchema,
  personaMode: z.enum(["Researcher", "Strategist"]),
  indiaLens: z.boolean(),
  workspaceId: z.string().trim().min(1),
});

const SynthesiseRequestSchema = z.object({
  graphSnapshot: z.object({
    nodes: z.array(z.record(z.unknown())).default([]),
    edges: z.array(z.record(z.unknown())).default([]),
  }),
  personaMode: z.enum(["Researcher", "Strategist"]),
  reportSections: z.array(z.string().trim().min(1)).default([]),
});

const SuggestionQuerySchema = z.object({
  graphSnapshot: z.string().trim().min(2),
  personaMode: z.enum(["Researcher", "Strategist"]),
});

const DossierSectionSchema = z.object({
  title: z.string().trim().min(1),
  content: z.string(),
  citations: z
    .array(
      z.object({
        id: z.string().trim().min(1),
        nodeId: z.string().trim().min(1),
        source: z.string().trim().min(1),
        label: z.string().trim().min(1),
      }),
    )
    .default([]),
});

const DossierRequestSchema = z.object({
  workspaceId: z.string().trim().min(1),
  query: z.string().trim().min(1),
  personaMode: z.enum(["Researcher", "Strategist"]),
  reportSections: z.array(DossierSectionSchema).min(1),
});

type GraphNode = {
  id: string;
  type: string;
  label: string;
  data: Record<string, unknown>;
  provenance: Array<{
    source: string;
    query: string;
    timestamp: string;
  }>;
};

type GraphEdge = {
  id: string;
  source: string;
  target: string;
  type: string;
  confidence?: number;
  evidenceTypes?: string[];
  provenance?: Array<{
    source: string;
    query: string;
    timestamp: string;
  }>;
};

type ToolCall = {
  payload: Record<string, unknown> | null;
  error?: string;
};

type ToolMap = Record<string, unknown>;

type AugmentResult = {
  newNodes: GraphNode[];
  newEdges: GraphEdge[];
  completenessScore: number;
  iterationsRun: number;
  failedSources: string[];
};

type DossierSection = z.infer<typeof DossierSectionSchema>;

const MAX_ITERATIONS = 3;
const COMPLETENESS_THRESHOLD = 85;
const CACHE_TTL_MS = 60 * 60 * 1000;
const isTestEnv =
  process.env.VITEST === "true" || process.env.NODE_ENV === "test";
const augmentCache = new Map<string, { at: number; value: AugmentResult }>();

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function asRecordArray(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)) return [];
  return value.filter(isRecord);
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function asNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : undefined;
}

function parseToolPayload(result: unknown): Record<string, unknown> | null {
  if (!isRecord(result)) return null;
  const content = result.content;
  if (!Array.isArray(content)) return null;

  for (const item of content) {
    if (!isRecord(item)) continue;
    const text = item.text;
    if (typeof text !== "string") continue;
    try {
      const parsed = JSON.parse(text);
      return isRecord(parsed) ? parsed : { value: parsed };
    } catch {
      return { raw: text };
    }
  }

  return null;
}

async function callTool(
  tools: ToolMap,
  toolName: string,
  input: Record<string, unknown>,
): Promise<ToolCall> {
  const maybeTool = tools[toolName];
  if (!isRecord(maybeTool) || typeof maybeTool.execute !== "function") {
    return { payload: null, error: `Tool '${toolName}' not available` };
  }

  try {
    const raw = await maybeTool.execute(input);
    const payload = parseToolPayload(raw);
    if (!payload) {
      return { payload: null, error: `Tool '${toolName}' returned no payload` };
    }
    if (typeof payload.error === "string" && payload.error.length > 0) {
      return { payload, error: payload.error };
    }
    return { payload };
  } catch (error) {
    return {
      payload: null,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

function normalizeMissingType(
  missing: string,
): "target" | "trial" | "compound" | "patent" | null {
  const value = missing.toLowerCase();
  if (
    value.includes("target") ||
    value.includes("protein") ||
    value.includes("gene")
  ) {
    return "target";
  }
  if (value.includes("trial")) return "trial";
  if (value.includes("compound") || value.includes("drug")) return "compound";
  if (value.includes("patent")) return "patent";
  return null;
}

function dedupeNodes(nodes: GraphNode[]): GraphNode[] {
  const byId = new Map<string, GraphNode>();
  for (const node of nodes) {
    const existing = byId.get(node.id);
    if (!existing) {
      byId.set(node.id, node);
      continue;
    }

    const mergedProvenance = [...existing.provenance, ...node.provenance];

    byId.set(node.id, {
      ...existing,
      data: { ...existing.data, ...node.data },
      provenance: mergedProvenance,
    });
  }
  return Array.from(byId.values());
}

function parseSnapshotFromQuery(raw: string): {
  nodeIds: string[];
  edgeSummary: Array<Record<string, unknown>>;
} {
  try {
    const parsed = JSON.parse(raw);
    if (!isRecord(parsed)) {
      return { nodeIds: [], edgeSummary: [] };
    }

    const nodeIds = Array.isArray(parsed.nodeIds)
      ? parsed.nodeIds.filter((id): id is string => typeof id === "string")
      : [];

    const edgeSummary = Array.isArray(parsed.edgeSummary)
      ? parsed.edgeSummary.filter((entry): entry is Record<string, unknown> =>
          isRecord(entry),
        )
      : [];

    return { nodeIds, edgeSummary };
  } catch {
    return { nodeIds: [], edgeSummary: [] };
  }
}

function provenance(source: string, query: string) {
  return [{ source, query, timestamp: new Date().toISOString() }];
}

function escapeLatex(value: string): string {
  return value
    .replaceAll("\\", "\\textbackslash{}")
    .replaceAll("&", "\\&")
    .replaceAll("%", "\\%")
    .replaceAll("$", "\\$")
    .replaceAll("#", "\\#")
    .replaceAll("_", "\\_")
    .replaceAll("{", "\\{")
    .replaceAll("}", "\\}")
    .replaceAll("~", "\\textasciitilde{}")
    .replaceAll("^", "\\textasciicircum{}");
}

function renderDossierLatex(
  input: z.infer<typeof DossierRequestSchema>,
): string {
  const sections = input.reportSections
    .map((section: DossierSection) => {
      const citations = section.citations
        .map(
          (citation) =>
            `\\item ${escapeLatex(citation.source)}: ${escapeLatex(citation.label)}`,
        )
        .join("\n");

      const citationBlock = citations.length
        ? `\n\\textbf{Citations}\n\\begin{itemize}\n${citations}\n\\end{itemize}`
        : "";

      return `\\section*{${escapeLatex(section.title)}}\n${escapeLatex(section.content)}${citationBlock}`;
    })
    .join("\n\n");

  return `\\documentclass[12pt,a4paper]{article}
\\usepackage[utf8]{inputenc}
\\usepackage[T1]{fontenc}
\\usepackage{geometry}
\\geometry{margin=2.5cm}

\\begin{document}

\\section*{Dossier Metadata}
\\textbf{Workspace}: ${escapeLatex(input.workspaceId)}\\\\
\\textbf{Persona}: ${escapeLatex(input.personaMode)}\\\\
\\textbf{Query}: ${escapeLatex(input.query)}

${sections}

\\end{document}
`;
}

async function fetchTargetNodes(query: string): Promise<ToolCall> {
  const tools = await getBiologyTools();
  return callTool(tools, "validate_target", { geneSymbol: query });
}

async function fetchTrialNodes(query: string): Promise<ToolCall> {
  const tools = await getClinicalTrialsTools();
  return callTool(tools, "search_studies", { term: query, limit: 6 });
}

async function fetchCompoundNodes(query: string): Promise<ToolCall> {
  const tools = await getPubChemTools();
  return callTool(tools, "search_compounds", { compoundName: query, limit: 6 });
}

async function fetchPatentNodes(query: string): Promise<ToolCall> {
  const tools = await getPatentsTools();
  return callTool(tools, "search_patents_by_drug", {
    drugName: query,
    limit: 6,
  });
}

function toTargetNodes(
  payload: Record<string, unknown>,
  query: string,
): GraphNode[] {
  const targetId = asString(payload.target_id);
  const symbol = asString(payload.gene_symbol);
  if (!targetId || !symbol) return [];

  return [
    {
      id: targetId,
      type: "target",
      label: symbol,
      data: {
        associationScore: asNumber(payload.association_score),
        ...payload,
      },
      provenance: provenance("Open Targets", query),
    },
  ];
}

function toTrialNodes(
  payload: Record<string, unknown>,
  query: string,
): GraphNode[] {
  const studies = asRecordArray(payload.studies).slice(0, 6);
  const nodes: GraphNode[] = [];
  for (const trial of studies) {
    const id = asString(trial.nct_id);
    const title = asString(trial.title);
    if (!id || !title) continue;
    nodes.push({
      id,
      type: "trial",
      label: title,
      data: {
        status: asString(trial.status),
        phase: trial.phase,
        ...trial,
      },
      provenance: provenance("ClinicalTrials.gov", query),
    });
  }
  return nodes;
}

function toCompoundNodes(
  payload: Record<string, unknown>,
  query: string,
): GraphNode[] {
  const compounds = asRecordArray(payload.compounds).slice(0, 6);
  const nodes: GraphNode[] = [];
  for (const compound of compounds) {
    const cid = asNumber(compound.cid);
    if (!cid) continue;
    nodes.push({
      id: String(cid),
      type: "compound",
      label: asString(compound.iupac_name) ?? `CID ${cid}`,
      data: { ...compound },
      provenance: provenance("PubChem", query),
    });
  }
  return nodes;
}

function toPatentNodes(
  payload: Record<string, unknown>,
  query: string,
): GraphNode[] {
  const patents = asRecordArray(payload.patents).slice(0, 6);
  const nodes: GraphNode[] = [];
  for (const patent of patents) {
    const patentNumber = asString(patent.patent_number);
    const title = asString(patent.title);
    if (!patentNumber || !title) continue;
    nodes.push({
      id: patentNumber,
      type: "patent",
      label: title,
      data: { ...patent },
      provenance: provenance("PatentsView", query),
    });
  }
  return nodes;
}

function buildCacheKey(input: z.infer<typeof AugmentRequestSchema>): string {
  return JSON.stringify({
    query: input.query,
    graphSnapshot: input.graphSnapshot,
    personaMode: input.personaMode,
    indiaLens: input.indiaLens,
  });
}

causaly.post("/augment", async (c) => {
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return errorResponse(c, 400, "BAD_REQUEST", "Invalid JSON body");
  }

  const parsed = AugmentRequestSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(c, 400, "VALIDATION_ERROR", "Invalid request body", {
      issues: parsed.error.issues,
    });
  }

  const input = parsed.data;
  const cacheKey = buildCacheKey(input);
  if (!isTestEnv) {
    const cached = augmentCache.get(cacheKey);
    if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
      return c.json(cached.value);
    }
  }

  const failedSources = new Set<string>();
  const newNodes: GraphNode[] = [];
  const newEdges: GraphEdge[] = [];
  let completenessScore = 0;
  let iterationsRun = 0;

  for (let iteration = 1; iteration <= MAX_ITERATIONS; iteration += 1) {
    iterationsRun = iteration;

    const accumulatedNodeIds = [
      ...input.graphSnapshot.nodeIds,
      ...newNodes.map((node) => node.id),
    ];

    const completeness = await evaluateCompleteness({
      query: input.query,
      graphSnapshot: {
        nodeIds: accumulatedNodeIds,
        edgeSummary: input.graphSnapshot.edgeSummary,
      },
      personaMode: input.personaMode,
    });

    completenessScore = completeness.score;

    if (completeness.score >= COMPLETENESS_THRESHOLD) {
      break;
    }

    const targetTypes = new Set(
      completeness.missingNodes
        .map((missing: string) => normalizeMissingType(missing))
        .filter(
          (
            value: ReturnType<typeof normalizeMissingType>,
          ): value is NonNullable<ReturnType<typeof normalizeMissingType>> =>
            value !== null,
        ),
    );

    if (targetTypes.has("target")) {
      const result = await fetchTargetNodes(input.query);
      if (result.error || !result.payload) {
        failedSources.add("biology");
      } else {
        newNodes.push(...toTargetNodes(result.payload, input.query));
      }
    }

    if (targetTypes.has("trial")) {
      const result = await fetchTrialNodes(input.query);
      if (result.error || !result.payload) {
        failedSources.add("clinical");
      } else {
        newNodes.push(...toTrialNodes(result.payload, input.query));
      }
    }

    if (targetTypes.has("compound")) {
      const result = await fetchCompoundNodes(input.query);
      if (result.error || !result.payload) {
        failedSources.add("pubchem");
      } else {
        newNodes.push(...toCompoundNodes(result.payload, input.query));
      }
    }

    if (targetTypes.has("patent")) {
      const result = await fetchPatentNodes(input.query);
      if (result.error || !result.payload) {
        failedSources.add("patents");
      } else {
        newNodes.push(...toPatentNodes(result.payload, input.query));
      }
    }
  }

  const payload: AugmentResult = {
    newNodes: dedupeNodes(newNodes),
    newEdges,
    completenessScore,
    iterationsRun,
    failedSources: Array.from(failedSources),
  };

  if (!isTestEnv) {
    augmentCache.set(cacheKey, { at: Date.now(), value: payload });
  }

  return c.json(payload);
});

causaly.post("/synthesise", async (c) => {
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return errorResponse(c, 400, "BAD_REQUEST", "Invalid JSON body");
  }

  const parsed = SynthesiseRequestSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(c, 400, "VALIDATION_ERROR", "Invalid request body", {
      issues: parsed.error.issues,
    });
  }

  const normalizedNodes = parsed.data.graphSnapshot.nodes.map((node, index) => {
    const n = isRecord(node) ? node : {};
    const metadata = isRecord(n.metadata)
      ? n.metadata
      : (Object.fromEntries(
          Object.entries(n).filter(
            ([key]) =>
              !["id", "label", "type", "source", "metadata"].includes(key),
          ),
        ) as Record<string, unknown>);

    return {
      id: asString(n.id) ?? `node_${index + 1}`,
      label: asString(n.label) ?? asString(n.name) ?? `Node ${index + 1}`,
      type: asString(n.type) ?? "unknown",
      source: asString(n.source) ?? "Unknown",
      metadata,
      indiaRelevant: Boolean(n.indiaRelevant),
    };
  });

  const normalizedEdges = parsed.data.graphSnapshot.edges.map((edge, index) => {
    const e = isRecord(edge) ? edge : {};
    return {
      id: asString(e.id) ?? `edge_${index + 1}`,
      source: asString(e.source) ?? "unknown_source",
      target: asString(e.target) ?? "unknown_target",
      type: asString(e.type) ?? "inferred_relationship",
      confidence: asNumber(e.confidence),
    };
  });

  const result = await summariseFromGraph({
    graphSnapshot: {
      nodes: normalizedNodes,
      edges: normalizedEdges,
    },
    personaMode: parsed.data.personaMode,
    reportSections: parsed.data.reportSections,
  });

  return c.json(result);
});

causaly.get("/suggestions", async (c) => {
  const parsed = SuggestionQuerySchema.safeParse({
    graphSnapshot: c.req.query("graphSnapshot") ?? "",
    personaMode: c.req.query("personaMode"),
  });

  if (!parsed.success) {
    return errorResponse(c, 400, "VALIDATION_ERROR", "Invalid query params", {
      issues: parsed.error.issues,
    });
  }

  const graphSnapshot = parseSnapshotFromQuery(parsed.data.graphSnapshot);
  const result = await suggestFollowups({
    graphSnapshot,
    personaMode: parsed.data.personaMode,
  });

  return c.json(result);
});

causaly.post("/dossier", async (c) => {
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return errorResponse(c, 400, "BAD_REQUEST", "Invalid JSON body");
  }

  const parsed = DossierRequestSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(c, 400, "VALIDATION_ERROR", "Invalid request body", {
      issues: parsed.error.issues,
    });
  }

  const payload = parsed.data;
  const filename = `dossier-${payload.workspaceId}.tex`;
  const latex = renderDossierLatex(payload);
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      const send = (event: string, data: Record<string, unknown>) => {
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`),
        );
      };

      send("status", {
        stage: "starting",
        message: "Preparing dossier generation",
      });

      send("status", {
        stage: "rendering",
        message: "Rendering LaTeX document",
      });

      send("complete", {
        filename,
        latex,
      });

      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "Access-Control-Allow-Origin": "*",
    },
  });
});

export { causaly };
