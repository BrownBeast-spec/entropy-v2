import { describe, expect, it } from "vitest";
import { selectMetricsForReport } from "./reportMetrics";
import type { Workspace } from "@/types/workspace";

describe("selectMetricsForReport", () => {
  it("should return disease metrics for disease-focused workspace", () => {
    const workspace: Partial<Workspace> = {
      mode: "Researcher",
      nodes: [
        {
          id: "1",
          type: "disease",
          label: "NASH",
          source: "Open Targets",
          metadata: {},
          addedByQuery: "q1",
        },
        {
          id: "2",
          type: "protein",
          label: "AMPK",
          source: "STRING",
          metadata: { druggable: true },
          addedByQuery: "q1",
        },
      ],
      edges: [],
    };

    const metrics = selectMetricsForReport(
      workspace as Workspace,
      "NASH treatment targets",
    );

    expect(metrics).toHaveLength(4);
    expect(metrics.map((m) => m.label)).toContain("Druggable Targets");
  });

  it("should return strategist metrics when mode is Strategist", () => {
    const workspace: Partial<Workspace> = {
      mode: "Strategist",
      nodes: [
        {
          id: "1",
          type: "patent",
          label: "Patent 1",
          source: "PatentsView",
          metadata: {},
          addedByQuery: "q1",
        },
        {
          id: "2",
          type: "company",
          label: "Company A",
          source: "PatentsView",
          metadata: {},
          addedByQuery: "q1",
        },
      ],
      edges: [],
    };

    const metrics = selectMetricsForReport(workspace as Workspace, "test");

    expect(metrics).toHaveLength(4);
    expect(metrics.map((m) => m.label)).toContain("Patent Count");
    expect(metrics.map((m) => m.label)).toContain("Competing Companies");
  });

  it("should return fallback metrics when type unclear", () => {
    const workspace: Partial<Workspace> = {
      mode: "Researcher",
      nodes: [
        {
          id: "1",
          type: "protein",
          label: "Protein 1",
          source: "STRING",
          metadata: {},
          addedByQuery: "q1",
        },
      ],
      edges: [],
    };

    const metrics = selectMetricsForReport(workspace as Workspace, "misc");

    expect(metrics).toHaveLength(4);
    expect(metrics.map((m) => m.label)).toContain("Total Nodes");
  });
});
