import { describe, expect, it } from "vitest";
import { processIndiaLens } from "./indiaLens";
import { GraphNode } from "@/types/workspace";

function node(partial: Partial<GraphNode>): GraphNode {
  return {
    id: "n1",
    label: "Metformin",
    type: "drug",
    source: "OpenFDA",
    metadata: {},
    addedByQuery: "q1",
    ...partial,
  };
}

describe("processIndiaLens", () => {
  it("marks Indian patent assignee using company suffix matching", () => {
    const result = processIndiaLens([
      node({
        id: "p1",
        type: "patent",
        label: "Formulation patent",
        metadata: { assignee: "Sun Pharma Pvt Ltd" },
      }),
    ]);

    expect(result[0].metadata.indiaContext).toMatchObject({
      isIndianPatent: true,
    });
    expect(result[0].indiaRelevant).toBe(true);
  });

  it("matches CDSCO approvals case-insensitively by drug label", () => {
    const result = processIndiaLens([
      node({ id: "d1", label: "metFormin", type: "drug" }),
    ]);

    expect(result[0].metadata.indiaContext).toMatchObject({
      isCDSCO: true,
    });
    expect(result[0].indiaRelevant).toBe(true);
  });

  it("returns NPPA price cap when drug exists in NPPA reference list", () => {
    const result = processIndiaLens([
      node({ id: "d2", label: "Metformin", type: "drug" }),
    ]);

    expect(result[0].metadata.indiaContext).toMatchObject({
      isNPPA: true,
      nppaPriceCapInr: 16.2,
    });
  });

  it("is idempotent when processing already-enriched nodes", () => {
    const input = [
      node({ id: "d3", label: "Metformin", type: "drug" }),
      node({ id: "p2", type: "patent", metadata: { assignee: "Lupin Ltd" } }),
    ];

    const once = processIndiaLens(input);
    const twice = processIndiaLens(once);

    expect(twice).toEqual(once);
  });
});
