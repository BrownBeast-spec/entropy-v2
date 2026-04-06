import { describe, it, expect } from "vitest";
import { config } from "dotenv";
import { summariseFromGraph } from "../agents/synthesis-agent.js";
import type {
  GraphNode,
  GraphEdge,
} from "@entropy/api/src/schemas/graph-schema";

// Load environment variables
config({ path: "../../.env" });

describe("Synthesis Agent (Deep Reasoning)", () => {
  const mockNodes: GraphNode[] = [
    {
      id: "protein-123",
      label: "CDK4/6 (Cyclin-dependent kinase 4/6)",
      type: "protein",
      source: "STRING",
      metadata: {
        function: "Cell cycle regulator",
        pathway: "G1/S transition",
      },
    },
    {
      id: "drug-456",
      label: "Palbociclib",
      type: "drug",
      source: "OpenFDA",
      metadata: {
        mechanism: "CDK4/6 inhibitor",
        indication: "HR+ HER2- breast cancer",
        approval: "2015 FDA approved",
      },
    },
    {
      id: "disease-789",
      label: "Breast Cancer (HR+/HER2-)",
      type: "disease",
      source: "Open Targets",
      metadata: {
        prevalence: "Most common breast cancer subtype",
        characteristics: "Hormone receptor positive, HER2 negative",
      },
    },
    {
      id: "trial-101",
      label: "PALOMA-2 Trial (NCT01740427)",
      type: "trial",
      source: "ClinicalTrials.gov",
      metadata: {
        phase: "Phase 3",
        status: "Completed",
        result: "Significant PFS improvement",
      },
    },
  ];

  const mockEdges: GraphEdge[] = [
    {
      id: "edge-1",
      source: "drug-456",
      target: "protein-123",
      type: "binding",
      confidence: 0.95,
      metadata: {},
      inferredBy: "LLM",
      reasoning: "Palbociclib is a selective CDK4/6 inhibitor",
    },
    {
      id: "edge-2",
      source: "drug-456",
      target: "disease-789",
      type: "association",
      confidence: 0.92,
      metadata: {},
      inferredBy: "LLM",
      reasoning: "FDA approved for HR+ HER2- breast cancer",
    },
    {
      id: "edge-3",
      source: "trial-101",
      target: "drug-456",
      type: "association",
      confidence: 0.98,
      metadata: {},
      inferredBy: "LLM",
      reasoning: "PALOMA-2 evaluated palbociclib efficacy",
    },
  ];

  it("should generate synthesis with multi-step reasoning (graph analysis → patterns → sections)", async () => {
    const result = await summariseFromGraph({
      graphSnapshot: { nodes: mockNodes, edges: mockEdges },
      personaMode: "Researcher",
      reportSections: ["Overview"],
    });

    expect(result.sections).toHaveLength(1);
    expect(result.sections[0].title).toBe("Overview");
    expect(result.sections[0].content.length).toBeGreaterThan(100); // Non-trivial content
    expect(result.sections[0].citations.length).toBeGreaterThan(0);
  }, 60000); // 60s timeout for multi-step LLM calls

  it("should include citations in [nodeId] format", async () => {
    const result = await summariseFromGraph({
      graphSnapshot: { nodes: mockNodes, edges: mockEdges },
      personaMode: "Researcher",
      reportSections: ["Clinical Evidence"],
    });

    expect(result.sections).toHaveLength(1);
    const section = result.sections[0];

    // Should contain citation markers
    expect(section.content).toMatch(/\[[a-zA-Z0-9_-]+\]/);

    // Citations should reference actual nodes
    section.citations.forEach((citation) => {
      const node = mockNodes.find((n) => n.id === citation.nodeId);
      expect(node).toBeDefined();
      expect(citation.label).toBe(node!.label);
      expect(citation.source).toBe(node!.source);
    });
  }, 60000);

  it("should support streaming callbacks for real-time updates", async () => {
    const chunks: string[] = [];
    const reasoningChunks: string[] = [];
    const sectionStarts: string[] = [];
    const sectionsCompleted: string[] = [];

    await summariseFromGraph(
      {
        graphSnapshot: { nodes: mockNodes, edges: mockEdges },
        personaMode: "Researcher",
        reportSections: ["Overview"],
      },
      {
        onSectionStart: (title) => sectionStarts.push(title),
        onSectionChunk: (title, chunk) => chunks.push(chunk),
        onReasoningChunk: (title, reasoning) => reasoningChunks.push(reasoning),
        onSectionComplete: (section) => sectionsCompleted.push(section.title),
      },
    );

    expect(sectionStarts).toContain("Overview");
    expect(sectionsCompleted).toContain("Overview");
    expect(chunks.length).toBeGreaterThan(0);
    // Reasoning chunks may or may not be present depending on NVIDIA NIM output
  }, 60000);

  it("should adapt to Researcher vs Strategist mode", async () => {
    // Researcher mode
    const researcherResult = await summariseFromGraph({
      graphSnapshot: { nodes: mockNodes, edges: mockEdges },
      personaMode: "Researcher",
      reportSections: ["Mechanism of Action"],
    });

    expect(researcherResult.sections[0].title).toBe("Mechanism of Action");
    // Should focus on scientific mechanisms
    const researcherContent =
      researcherResult.sections[0].content.toLowerCase();
    expect(
      researcherContent.includes("mechanism") ||
        researcherContent.includes("pathway") ||
        researcherContent.includes("protein"),
    ).toBe(true);

    // Strategist mode (with company/patent data if available)
    const strategistResult = await summariseFromGraph({
      graphSnapshot: { nodes: mockNodes, edges: mockEdges },
      personaMode: "Strategist",
      reportSections: ["Competitive Landscape Overview"],
    });

    expect(strategistResult.sections[0].title).toBe(
      "Competitive Landscape Overview",
    );
    // Should focus on competitive/strategic insights
    expect(strategistResult.sections[0].content.length).toBeGreaterThan(50);
  }, 90000);

  it("should filter nodes with India Lens enabled", async () => {
    const indiaNodes: GraphNode[] = [
      { ...mockNodes[0], indiaRelevant: true },
      { ...mockNodes[1], indiaRelevant: false },
      { ...mockNodes[2], indiaRelevant: true },
      { ...mockNodes[3], indiaRelevant: false },
    ];

    const result = await summariseFromGraph({
      graphSnapshot: { nodes: indiaNodes, edges: mockEdges },
      personaMode: "Researcher",
      reportSections: ["Overview"],
      indiaLens: true,
    });

    // Should only cite India-relevant nodes
    const citedNodeIds = result.sections[0].citations.map((c) => c.nodeId);
    citedNodeIds.forEach((nodeId) => {
      const node = indiaNodes.find((n) => n.id === nodeId);
      if (node) {
        expect(node.indiaRelevant).toBe(true);
      }
    });
  }, 60000);

  it("should use default sections when reportSections is empty", async () => {
    // Researcher default
    const researcherResult = await summariseFromGraph({
      graphSnapshot: { nodes: mockNodes, edges: mockEdges },
      personaMode: "Researcher",
      reportSections: [],
    });

    expect(researcherResult.sections.length).toBeGreaterThan(0);
    const researcherTitles = researcherResult.sections.map((s) => s.title);
    expect(researcherTitles).toContain("Overview");

    // Strategist default
    const strategistResult = await summariseFromGraph({
      graphSnapshot: { nodes: mockNodes, edges: mockEdges },
      personaMode: "Strategist",
      reportSections: [],
    });

    expect(strategistResult.sections.length).toBeGreaterThan(0);
    const strategistTitles = strategistResult.sections.map((s) => s.title);
    expect(strategistTitles).toContain("Competitive Landscape Overview");
  }, 120000); // 2 min for multiple sections

  it("should include reasoning trace when available (NVIDIA NIM specific)", async () => {
    const result = await summariseFromGraph({
      graphSnapshot: { nodes: mockNodes, edges: mockEdges },
      personaMode: "Researcher",
      reportSections: ["Overview"],
    });

    const section = result.sections[0];
    // reasoningTrace is optional but if present, should be a string
    if (section.reasoningTrace) {
      expect(typeof section.reasoningTrace).toBe("string");
      expect(section.reasoningTrace.length).toBeGreaterThan(0);
    }
  }, 60000);

  it("should handle empty graph gracefully", async () => {
    const result = await summariseFromGraph({
      graphSnapshot: { nodes: [], edges: [] },
      personaMode: "Researcher",
      reportSections: ["Overview"],
    });

    expect(result.sections).toHaveLength(1);
    expect(result.sections[0].title).toBe("Overview");
    // Should generate content even with empty graph
    expect(result.sections[0].content).toBeDefined();
  }, 60000);
});
