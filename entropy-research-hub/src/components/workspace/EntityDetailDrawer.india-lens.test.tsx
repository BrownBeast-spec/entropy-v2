import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import EntityDetailDrawer from "./EntityDetailDrawer";

describe("EntityDetailDrawer India Lens", () => {
  it("renders India-specific evidence for drug nodes", () => {
    render(
      <EntityDetailDrawer
        node={{
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
        }}
        isOpen
        onClose={vi.fn()}
        onPin={vi.fn()}
        onRemove={vi.fn()}
        onFindConnections={vi.fn()}
      />,
    );

    expect(screen.getByText(/India Lens Signals/i)).toBeInTheDocument();
    expect(screen.getByText(/CDSCO Approved/i)).toBeInTheDocument();
    expect(screen.getByText(/NPPA Price Cap/i)).toBeInTheDocument();
    expect(screen.getByText(/INR 16.2/i)).toBeInTheDocument();
  });

  it("renders Indian assignee signal for patent nodes", () => {
    render(
      <EntityDetailDrawer
        node={{
          id: "pat_1",
          label: "Formulation Patent",
          type: "patent",
          source: "PatentsView",
          metadata: {
            assignee: "Sun Pharma Pvt Ltd",
            indiaContext: {
              isIndianPatent: true,
            },
          },
          addedByQuery: "q1",
          indiaRelevant: true,
        }}
        isOpen
        onClose={vi.fn()}
        onPin={vi.fn()}
        onRemove={vi.fn()}
        onFindConnections={vi.fn()}
      />,
    );

    expect(screen.getByText(/India Lens Signals/i)).toBeInTheDocument();
    expect(screen.getByText(/Indian Assignee/i)).toBeInTheDocument();
  });
});
