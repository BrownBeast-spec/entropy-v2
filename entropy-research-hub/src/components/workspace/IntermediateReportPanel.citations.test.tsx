import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import IntermediateReportPanel from "./IntermediateReportPanel";

vi.mock("@/contexts/WorkspaceContext", () => ({
  useWorkspace: () => ({
    currentWorkspace: {
      id: "ws_1",
      name: "Workspace",
      nodes: [
        {
          id: "result_3",
          label: "Fallback Node 3",
          type: "paper",
          source: "PubMed",
          metadata: {},
          addedByQuery: "q1",
        },
      ],
      edges: [],
      queries: [],
      savedItems: [],
    },
  }),
}));

describe("IntermediateReportPanel inline citations", () => {
  it("renders mapped inline citation controls and removes bottom citation list", () => {
    const onCitationClick = vi.fn();

    render(
      <IntermediateReportPanel
        report={{
          workspaceId: "ws_1",
          generatedAt: new Date("2026-04-06T00:00:00Z"),
          wordCount: 20,
          graphNodeCountAtGeneration: 3,
          sections: [
            {
              title: "Background",
              content:
                "Metformin evidence [result_1]. Follow-up signal [result_2, result_3].",
              citations: [
                {
                  id: "c1",
                  nodeId: "result_1",
                  source: "Europe PMC",
                  label: "A very long evidence title that should truncate",
                },
                {
                  id: "c2",
                  nodeId: "result_2",
                  source: "PubMed",
                  label: "Another long citation label for truncation",
                },
              ],
            },
          ],
        }}
        onCitationClick={onCitationClick}
      />,
    );

    expect(screen.queryByText(/\[result_\d+/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/^Citations$/i)).not.toBeInTheDocument();

    const citationButtons = screen.getAllByRole("button", {
      name: /open citation:/i,
    });
    expect(citationButtons).toHaveLength(3);
    expect(citationButtons[0]).toHaveClass("max-w-[220px]");
    expect(citationButtons[0]).toHaveClass("mr-1");
    expect(citationButtons[0]).toHaveClass("mb-1");

    const firstButtonLabel = citationButtons[0].textContent ?? "";
    expect(firstButtonLabel.length).toBeLessThanOrEqual(28);
    expect(firstButtonLabel).toContain("...");

    fireEvent.click(citationButtons[0]);
    expect(onCitationClick).toHaveBeenCalledWith("result_1");

    fireEvent.click(citationButtons[2]);
    expect(onCitationClick).toHaveBeenCalledWith("result_3");
  });

  it("uses full report width and does not keep narrow max width container", () => {
    render(
      <IntermediateReportPanel
        report={{
          workspaceId: "ws_1",
          generatedAt: new Date("2026-04-06T00:00:00Z"),
          wordCount: 8,
          graphNodeCountAtGeneration: 1,
          sections: [
            {
              title: "Overview",
              content: "Some text [result_3].",
              citations: [
                {
                  id: "c3",
                  nodeId: "result_3",
                  source: "PubMed",
                  label: "Node 3",
                },
              ],
            },
          ],
        }}
      />,
    );

    expect(document.querySelector(".max-w-3xl")).toBeNull();
  });

  it("uses a single scroll container so header and overview stats scroll with content", () => {
    render(
      <IntermediateReportPanel
        report={{
          workspaceId: "ws_1",
          generatedAt: new Date("2026-04-06T00:00:00Z"),
          wordCount: 18,
          graphNodeCountAtGeneration: 1,
          sections: [
            {
              title: "Overview",
              content: "Scrollable content [result_3].",
              citations: [
                {
                  id: "c3",
                  nodeId: "result_3",
                  source: "PubMed",
                  label: "Node 3",
                },
              ],
            },
          ],
        }}
      />,
    );

    const header = screen.getByText("Intermediate Report");
    const metricLabel = screen.getByText("Total Nodes");
    const scrollContainer = header.closest(".overflow-y-auto");

    expect(scrollContainer).not.toBeNull();
    expect(scrollContainer).toContainElement(metricLabel);
  });

  it("maps edge-style citation brackets to known ids and keeps unknown tokens as text", () => {
    const onCitationClick = vi.fn();

    render(
      <IntermediateReportPanel
        report={{
          workspaceId: "ws_1",
          generatedAt: new Date("2026-04-06T00:00:00Z"),
          wordCount: 12,
          graphNodeCountAtGeneration: 2,
          sections: [
            {
              title: "Evidence",
              content:
                "Connectivity [result_1 -> result_2]. Keep unknown token [not_a_node].",
              citations: [
                {
                  id: "c1",
                  nodeId: "result_1",
                  source: "PubMed",
                  label: "Node One",
                },
                {
                  id: "c2",
                  nodeId: "result_2",
                  source: "PubMed",
                  label: "Node Two",
                },
              ],
            },
          ],
        }}
        onCitationClick={onCitationClick}
      />,
    );

    const citationButtons = screen.getAllByRole("button", {
      name: /open citation:/i,
    });
    expect(citationButtons).toHaveLength(2);

    expect(screen.getByText("[not_a_node]", { exact: false })).toBeInTheDocument();

    fireEvent.click(citationButtons[1]);
    expect(onCitationClick).toHaveBeenCalledWith("result_2");
  });
});
