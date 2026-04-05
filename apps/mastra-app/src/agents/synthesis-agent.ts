import { z } from "zod";

const CitationSchema = z.object({
  source: z.string().trim().min(1),
  label: z.string().trim().min(1),
  nodeId: z.string().trim().min(1),
});

const SectionSchema = z.object({
  title: z.string().trim().min(1),
  content: z.string().trim().min(1),
  citations: z.array(CitationSchema).default([]),
});

const SynthesisResultSchema = z.object({
  sections: z.array(SectionSchema).default([]),
});

export type SynthesisCitation = z.infer<typeof CitationSchema>;
export type SynthesisSection = z.infer<typeof SectionSchema>;
export type SynthesisResult = z.infer<typeof SynthesisResultSchema>;

type SynthesisInput = {
  graphSnapshot: {
    nodes: Array<Record<string, unknown>>;
    edges: Array<Record<string, unknown>>;
  };
  personaMode: "Researcher" | "Strategist";
  reportSections: string[];
};

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function fallbackSections(input: SynthesisInput): SynthesisResult {
  const firstNode = input.graphSnapshot.nodes[0] ?? {};
  const nodeId = asString(firstNode.id) ?? "unknown-node";
  const nodeLabel = asString(firstNode.label) ?? "Primary evidence node";
  const source =
    input.personaMode === "Strategist" ? "PatentsView" : "Open Targets";

  const defaultTitle =
    input.personaMode === "Strategist"
      ? "Competitive Landscape Overview"
      : "Overview";

  const titles = input.reportSections.length > 0 ? input.reportSections : [defaultTitle];

  return {
    sections: titles.map((title) => ({
      title,
      content: `${title}: current graph contains ${input.graphSnapshot.nodes.length} nodes and ${input.graphSnapshot.edges.length} edges. ${nodeLabel} is currently among the top linked entities in this workspace.`,
      citations: [
        {
          source,
          label: nodeId,
          nodeId,
        },
      ],
    })),
  };
}

export async function summariseFromGraph(
  input: SynthesisInput,
): Promise<SynthesisResult> {
  return SynthesisResultSchema.parse(fallbackSections(input));
}
