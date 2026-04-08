import { Agent } from "@mastra/core/agent";
import { z } from "zod";
import { getModelForAgent } from "../lib/llm.js";
import { getNvidiaRateLimiter } from "../lib/rate-limiter.js";

type GraphNode = {
  id: string;
  label: string;
  type: string;
  source: string;
  metadata: Record<string, unknown>;
  indiaRelevant?: boolean;
};

type GraphEdge = {
  id: string;
  source: string;
  target: string;
  type: string;
  confidence?: number;
};

// Keep existing schemas
const CitationSchema = z.object({
  source: z.string().trim().min(1),
  label: z.string().trim().min(1),
  nodeId: z.string().trim().min(1),
});

const SectionSchema = z.object({
  title: z.string().trim().min(1),
  content: z.string().trim().min(1),
  citations: z.array(CitationSchema).default([]),
  reasoningTrace: z.string().optional(), // NEW: NVIDIA NIM reasoning_content
});

const SynthesisResultSchema = z.object({
  sections: z.array(SectionSchema).default([]),
});

export type SynthesisCitation = z.infer<typeof CitationSchema>;
export type SynthesisSection = z.infer<typeof SectionSchema>;
export type SynthesisResult = z.infer<typeof SynthesisResultSchema>;

type SynthesisInput = {
  graphSnapshot: {
    nodes: GraphNode[];
    edges: GraphEdge[];
  };
  personaMode: "Researcher" | "Strategist";
  reportSections: string[];
  indiaLens?: boolean;
};

// Graph analysis schemas
const GraphInsightsSchema = z.object({
  centralNodes: z.array(
    z.object({
      nodeId: z.string(),
      importance: z.number(),
      reasoning: z.string(),
    }),
  ),
  nodeClusters: z.array(
    z.object({
      theme: z.string(),
      nodeIds: z.array(z.string()),
      edgeTypes: z.array(z.string()),
    }),
  ),
  keyPatterns: z.array(
    z.object({
      pattern: z.string(),
      evidence: z.array(z.string()), // Node IDs
    }),
  ),
  gaps: z.array(z.string()),
});

const PatternAnalysisSchema = z.object({
  mechanisticPathways: z.array(
    z.object({
      pathway: z.string(),
      nodes: z.array(z.string()),
      confidence: z.number(),
    }),
  ),
  clinicalImplications: z.array(
    z.object({
      implication: z.string(),
      supportingNodes: z.array(z.string()),
    }),
  ),
  competitiveLandscape: z
    .array(
      z.object({
        insight: z.string(),
        companies: z.array(z.string()),
        patents: z.array(z.string()),
      }),
    )
    .optional(),
});

type GraphInsights = z.infer<typeof GraphInsightsSchema>;
type PatternAnalysis = z.infer<typeof PatternAnalysisSchema>;

// Agent for graph analysis (lazy initialization)
function getGraphAnalysisAgent(): Agent<any, any, any, any> {
  return new Agent({
    id: "graph-analyzer",
    name: "Graph Analyzer",
    instructions: `You are a knowledge graph analyst. Analyze the provided graph structure and extract key insights.

Identify:
1. Central nodes (highest degree/importance) - explain why they're central
2. Node clusters (groups of related entities) - describe the theme
3. Key patterns (recurring relationship types, pathways)
4. Gaps (missing connections, underexplored areas)

Focus on actionable insights, not just statistics.`,
    model: getModelForAgent("evidence-summarizer"),
  });
}

// Agent for pattern identification (lazy initialization)
function getPatternAnalysisAgent(): Agent<any, any, any, any> {
  return new Agent({
    id: "pattern-analyzer",
    name: "Pattern Analyzer",
    instructions: `You are a scientific pattern recognition expert. Based on graph analysis, identify meaningful patterns.

For Researcher mode:
- Mechanistic pathways (disease → gene → protein → drug)
- Clinical implications from trials and evidence
- Literature-supported connections

For Strategist mode:
- Competitive landscape (company patents, trial sponsorship)
- Market positioning and IP clusters
- Strategic gaps and opportunities

Provide specific node IDs as evidence for each pattern.`,
    model: getModelForAgent("evidence-summarizer"),
  });
}

// Agent for section synthesis (lazy initialization)
function getSectionSynthesisAgent(): Agent<any, any, any, any> {
  return new Agent({
    id: "section-synthesizer",
    name: "Section Synthesizer",
    instructions: `You are a scientific writer creating high-quality report sections.

CRITICAL RULES - YOU MUST FOLLOW THESE EXACTLY:
1. Use ONLY information from provided graph nodes and edges
2. MANDATORY: Cite EVERY single claim with node IDs in [nodeId] format - NO EXCEPTIONS
3. Every sentence that makes a factual claim MUST have at least one citation in [nodeId] format
4. Write clear, concise, professional prose
5. For Researcher mode: focus on scientific mechanisms and evidence
6. For Strategist mode: focus on competitive intelligence and opportunities
7. If India Lens is enabled: prioritize India-relevant nodes and highlight India-specific insights

CITATION FORMAT EXAMPLES:
- "CDK4/6 is a key cell cycle regulator [protein-123]."
- "Palbociclib inhibits CDK4/6 [drug-456] and is approved for HR+ breast cancer [disease-789]."
- "The PALOMA-2 trial [trial-101] demonstrated significant progression-free survival benefit [trial-101]."

EVERY paragraph must contain multiple citations. If you write a sentence without a citation, you are doing it wrong.`,
    model: getModelForAgent("evidence-summarizer"),
  });
}

// Step 1: Analyze graph structure
async function analyzeGraph(
  nodes: GraphNode[],
  edges: GraphEdge[],
): Promise<GraphInsights> {
  const rateLimiter = getNvidiaRateLimiter();

  const prompt = `Analyze this knowledge graph:

Nodes: ${nodes.length}
${nodes
  .slice(0, 20)
  .map((n) => `- ${n.id}: ${n.label} (${n.type}, ${n.source})`)
  .join("\n")}
${nodes.length > 20 ? `... and ${nodes.length - 20} more` : ""}

Edges: ${edges.length}
${edges
  .slice(0, 20)
  .map(
    (e) =>
      `- ${e.source} → ${e.target} (${e.type}, confidence: ${e.confidence || "N/A"})`,
  )
  .join("\n")}
${edges.length > 20 ? `... and ${edges.length - 20} more` : ""}

Provide graph insights in JSON format.`;

  const estimatedTokens = Math.ceil(prompt.length / 4) + 1000;
  await rateLimiter.acquire(estimatedTokens);

  try {
    const agent = getGraphAnalysisAgent();
    const result = await agent.generate([{ role: "user", content: prompt }], {
      structuredOutput: { schema: GraphInsightsSchema },
    });
    rateLimiter.release(estimatedTokens);
    return result.object as GraphInsights;
  } catch (error) {
    rateLimiter.release(estimatedTokens);
    throw error;
  }
}

// Step 2: Identify patterns
async function identifyPatterns(
  insights: GraphInsights,
  nodes: GraphNode[],
  edges: GraphEdge[],
  mode: "Researcher" | "Strategist",
): Promise<PatternAnalysis> {
  const rateLimiter = getNvidiaRateLimiter();

  const prompt = `Mode: ${mode}

Graph insights:
${JSON.stringify(insights, null, 2)}

Available nodes:
${nodes.map((n) => `${n.id}: ${n.label} (${n.type})`).join("\n")}

Identify meaningful patterns based on the mode. Return JSON format.`;

  const estimatedTokens = Math.ceil(prompt.length / 4) + 1000;
  await rateLimiter.acquire(estimatedTokens);

  try {
    const agent = getPatternAnalysisAgent();
    const result = await agent.generate([{ role: "user", content: prompt }], {
      structuredOutput: { schema: PatternAnalysisSchema },
    });
    rateLimiter.release(estimatedTokens);
    return result.object as PatternAnalysis;
  } catch (error) {
    rateLimiter.release(estimatedTokens);
    throw error;
  }
}

// Step 3: Synthesize section with streaming support
async function synthesizeSection(
  sectionTitle: string,
  nodes: GraphNode[],
  edges: GraphEdge[],
  patterns: PatternAnalysis,
  mode: "Researcher" | "Strategist",
  indiaLens: boolean,
  onChunk?: (chunk: string) => void, // Streaming callback
  onReasoningChunk?: (reasoning: string) => void, // Reasoning trace callback
): Promise<SynthesisSection> {
  const rateLimiter = getNvidiaRateLimiter();

  // Filter nodes if India Lens enabled
  const relevantNodes = indiaLens
    ? nodes.filter((n) => n.indiaRelevant === true)
    : nodes;

  const prompt = `Write a "${sectionTitle}" section for a ${mode} report.
${indiaLens ? "INDIA LENS ENABLED: Prioritize India-relevant insights and data.\n" : ""}

Available evidence:

Nodes (${relevantNodes.length}):
${relevantNodes
  .slice(0, 50)
  .map(
    (n) =>
      `[${n.id}] ${n.label} (${n.type}, ${n.source})${n.indiaRelevant ? " [INDIA-RELEVANT]" : ""}`,
  )
  .join("\n")}

Patterns identified:
${JSON.stringify(patterns, null, 2)}

Write 2-4 paragraphs. Cite node IDs in [nodeId] format for EVERY claim.`;

  const estimatedTokens = Math.ceil(prompt.length / 4) + 2000;
  await rateLimiter.acquire(estimatedTokens);

  try {
    const agent = getSectionSynthesisAgent();

    // Generate content (non-streaming - real streaming would require AI SDK directly)
    const result = await agent.generate([{ role: "user", content: prompt }]);

    const content = result.text || "";

    // Simulate streaming by sending chunks if callback is provided
    if (onChunk && content) {
      // Split into chunks for callback
      const chunkSize = 50;
      for (let i = 0; i < content.length; i += chunkSize) {
        onChunk(content.slice(i, i + chunkSize));
      }
    }

    rateLimiter.release(estimatedTokens);

    // Extract citations from content
    const citations = extractCitations(content, relevantNodes);

    return {
      title: sectionTitle,
      content,
      citations,
      reasoningTrace: undefined, // Reasoning trace would require AI SDK streaming
    };
  } catch (error) {
    rateLimiter.release(estimatedTokens);
    throw error;
  }
}

// Extract [nodeId] citations from text
function extractCitations(
  content: string,
  nodes: GraphNode[],
): SynthesisCitation[] {
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const citationRegex = /\[([a-zA-Z0-9_-]+)\]/g;
  const matches = [...content.matchAll(citationRegex)];

  const citations: SynthesisCitation[] = [];
  const seen = new Set<string>();

  for (const match of matches) {
    const nodeId = match[1];
    if (seen.has(nodeId)) continue;

    const node = nodeMap.get(nodeId);
    if (node) {
      citations.push({
        nodeId: node.id,
        source: node.source,
        label: node.label,
      });
      seen.add(nodeId);
    }
  }

  return citations;
}

// Main synthesis function (replaces fallbackSections)
export async function summariseFromGraph(
  input: SynthesisInput,
  callbacks?: {
    onSectionStart?: (sectionTitle: string) => void;
    onSectionChunk?: (sectionTitle: string, chunk: string) => void;
    onReasoningChunk?: (sectionTitle: string, reasoning: string) => void;
    onSectionComplete?: (section: SynthesisSection) => void;
  },
): Promise<SynthesisResult> {
  const {
    graphSnapshot,
    personaMode,
    reportSections,
    indiaLens = false,
  } = input;

  // Handle empty graph gracefully
  if (graphSnapshot.nodes.length === 0) {
    const defaultTitle =
      personaMode === "Strategist"
        ? "Competitive Landscape Overview"
        : "Overview";
    const titles = reportSections.length > 0 ? reportSections : [defaultTitle];

    return {
      sections: titles.map((title) => ({
        title,
        content:
          "No data available in the current graph. Please add nodes to generate insights.",
        citations: [],
      })),
    };
  }

  // Step 1: Analyze graph (30s)
  const insights = await analyzeGraph(graphSnapshot.nodes, graphSnapshot.edges);

  // Step 2: Identify patterns (20s)
  const patterns = await identifyPatterns(
    insights,
    graphSnapshot.nodes,
    graphSnapshot.edges,
    personaMode,
  );

  // Step 3: Synthesize sections with streaming (30s per section)
  const sections: SynthesisSection[] = [];

  const sectionTitles =
    reportSections.length > 0
      ? reportSections
      : getDefaultSections(personaMode);

  for (const title of sectionTitles) {
    if (callbacks?.onSectionStart) {
      callbacks.onSectionStart(title);
    }

    const section = await synthesizeSection(
      title,
      graphSnapshot.nodes,
      graphSnapshot.edges,
      patterns,
      personaMode,
      indiaLens,
      (chunk) => callbacks?.onSectionChunk?.(title, chunk),
      (reasoning) => callbacks?.onReasoningChunk?.(title, reasoning),
    );

    sections.push(section);

    if (callbacks?.onSectionComplete) {
      callbacks.onSectionComplete(section);
    }
  }

  return { sections };
}

function getDefaultSections(mode: "Researcher" | "Strategist"): string[] {
  if (mode === "Researcher") {
    return [
      "Overview",
      "Mechanism of Action",
      "Clinical Evidence",
      "Safety Profile",
      "Literature Summary",
    ];
  } else {
    return [
      "Competitive Landscape Overview",
      "Patent Portfolio Analysis",
      "Clinical Trial Landscape",
      "Market Positioning",
      "Strategic Gaps",
    ];
  }
}
