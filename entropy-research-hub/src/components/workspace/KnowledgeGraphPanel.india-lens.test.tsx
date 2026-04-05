import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import KnowledgeGraphPanel from "./KnowledgeGraphPanel";

describe("KnowledgeGraphPanel India Lens UI", () => {
  it("shows India-related source count in provenance summary when enriched nodes are present", () => {
    render(
      <KnowledgeGraphPanel
        indiaLens
        nodes={[
          {
            id: "drug_1",
            label: "Metformin",
            type: "drug",
            source: "OpenFDA",
            metadata: {
              indiaContext: {
                isCDSCO: true,
                isNPPA: true,
                nppaPriceCapInr: 16.2,
              },
            },
            addedByQuery: "q1",
            indiaRelevant: true,
          },
          {
            id: "pat_1",
            label: "Formulation patent",
            type: "patent",
            source: "PatentsView",
            metadata: {
              indiaContext: {
                isIndianPatent: true,
              },
            },
            addedByQuery: "q1",
            indiaRelevant: true,
          },
        ]}
        edges={[]}
      />,
    );

    expect(screen.getByText(/Graph contains/i)).toBeInTheDocument();
    expect(screen.getByText(/2 nodes/i)).toBeInTheDocument();
    expect(screen.getByText(/2 sources/i)).toBeInTheDocument();
    expect(screen.getByText(/India Lens active/i)).toBeInTheDocument();
    expect(screen.getByText(/2 India-relevant nodes/i)).toBeInTheDocument();
    expect(
      screen.getByLabelText(/India Lens disclosure/i),
    ).toHaveAttribute(
      "title",
      "India signals are inferred from public data using heuristic matching — verify before citing",
    );
  });
});
