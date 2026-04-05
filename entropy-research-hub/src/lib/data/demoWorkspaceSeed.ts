import { Workspace } from "@/types/workspace";
import { demoNodes, demoEdges } from "@/lib/data/demoGraphData";
import { demoReport } from "@/lib/data/demoReportData";

const DEMO_WORKSPACE_ID = "ws_demo_metformin_nash";
const DEMO_TIMESTAMP = new Date("2026-04-01T00:00:00.000Z");

export function createDemoWorkspaceSeed(): Workspace {
  const nodes = demoNodes.map((node) => ({
    ...node,
    metadata: { ...node.metadata },
  }));

  const edges = demoEdges.map((edge) => ({
    ...edge,
    metadata: { ...edge.metadata },
  }));

  const report = {
    ...demoReport,
    workspaceId: DEMO_WORKSPACE_ID,
    generatedAt: new Date(DEMO_TIMESTAMP),
    sections: demoReport.sections.map((section) => ({
      ...section,
      citations: section.citations.map((citation) => ({ ...citation })),
    })),
  };

  return {
    id: DEMO_WORKSPACE_ID,
    name: "Metformin NASH Demo Workspace",
    description: "Preloaded graph and report for product rehearsals.",
    mode: "Researcher",
    indiaLens: true,
    createdAt: new Date(DEMO_TIMESTAMP),
    updatedAt: new Date(DEMO_TIMESTAMP),
    nodes,
    edges,
    queries: [
      {
        id: "demo_query_1",
        workspaceId: DEMO_WORKSPACE_ID,
        text: "Map metformin evidence, targets, and trial activity in NASH",
        mode: "Researcher",
        indiaLens: true,
        submittedAt: new Date(DEMO_TIMESTAMP),
        status: "complete",
        contributedNodes: nodes
          .filter((node) => node.addedByQuery === "demo_query_1")
          .map((node) => node.id),
        contributedEdges: edges.map((edge) => edge.id),
      },
    ],
    savedItems: [],
    report,
  };
}
