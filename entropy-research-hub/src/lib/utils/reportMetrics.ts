import type { Workspace } from "@/types/workspace";
import {
  FileText,
  Target,
  Beaker,
  AlertTriangle,
  type LucideIcon,
} from "lucide-react";

export interface Metric {
  label: string;
  value: number | string;
  unit?: string;
  icon: LucideIcon;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
}

export function selectMetricsForReport(
  workspace: Workspace,
  latestQuery: string,
): Metric[] {
  const { mode, nodes, edges } = workspace;

  const diseaseCount = nodes.filter((n) => n.type === "disease").length;
  const drugCount = nodes.filter(
    (n) => n.type === "drug" || n.type === "compound",
  ).length;

  const isDiseaseQuery =
    diseaseCount > 0 || /disease|syndrome|nash|cancer|diabetes/i.test(latestQuery);
  const isDrugQuery =
    drugCount > 0 || /drug|compound|molecule|metformin/i.test(latestQuery);

  if (mode === "Strategist") {
    return [
      {
        label: "Patent Count",
        value: nodes.filter((n) => n.type === "patent").length,
        icon: FileText,
      },
      {
        label: "Competing Companies",
        value: nodes.filter((n) => n.type === "company").length,
        icon: Target,
      },
      {
        label: "India-Relevant",
        value:
          nodes.length > 0
            ? `${Math.round(
                (nodes.filter((n) => n.indiaRelevant).length / nodes.length) * 100,
              )}%`
            : "0%",
        icon: Beaker,
      },
      {
        label: "Clinical Trials",
        value: nodes.filter((n) => n.type === "trial").length,
        icon: AlertTriangle,
      },
    ];
  }

  if (isDiseaseQuery) {
    return [
      {
        label: "Affected Pathways",
        value: countUniquePathways(nodes),
        icon: Target,
      },
      {
        label: "Druggable Targets",
        value: nodes.filter((n) => n.type === "protein" && n.metadata?.druggable)
          .length,
        icon: Beaker,
      },
      {
        label: "Clinical Trials",
        value: nodes.filter((n) => n.type === "trial").length,
        icon: FileText,
      },
      {
        label: "Safety Signals",
        value: nodes.filter((n) => n.source === "OpenFDA").length,
        icon: AlertTriangle,
      },
    ];
  }

  if (isDrugQuery) {
    return [
      {
        label: "Known Mechanisms",
        value: countUniqueMechanisms(nodes),
        icon: Beaker,
      },
      {
        label: "Target Proteins",
        value: nodes.filter((n) => n.type === "protein").length,
        icon: Target,
      },
      {
        label: "Disease Indications",
        value: nodes.filter((n) => n.type === "disease").length,
        icon: AlertTriangle,
      },
      {
        label: "Trial Evidence",
        value: nodes.filter((n) => n.type === "trial").length,
        icon: FileText,
      },
    ];
  }

  return [
    {
      label: "Total Nodes",
      value: nodes.length,
      icon: Target,
    },
    {
      label: "Unique Sources",
      value: new Set(nodes.map((n) => n.source)).size,
      icon: FileText,
    },
    {
      label: "Graph Density",
      value: nodes.length > 0 ? (edges.length / nodes.length).toFixed(2) : "0",
      icon: Beaker,
    },
    {
      label: "Latest Coverage",
      value: `${Math.min(nodes.length * 5, 100)}%`,
      icon: AlertTriangle,
    },
  ];
}

function countUniquePathways(nodes: Workspace["nodes"]): number {
  const pathways = new Set<string>();
  nodes.forEach((node) => {
    if (Array.isArray(node.metadata?.pathways)) {
      node.metadata.pathways.forEach((p: string) => pathways.add(p));
    }
  });
  return pathways.size;
}

function countUniqueMechanisms(nodes: Workspace["nodes"]): number {
  const mechanisms = new Set<string>();
  nodes.forEach((node) => {
    if (Array.isArray(node.metadata?.mechanisms)) {
      node.metadata.mechanisms.forEach((m: string) => mechanisms.add(m));
    }
  });
  return mechanisms.size;
}
