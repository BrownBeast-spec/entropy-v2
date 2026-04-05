import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import KnowledgeGraphPanel from "./KnowledgeGraphPanel";

describe("KnowledgeGraphPanel", () => {
  let rectSpy: ReturnType<typeof vi.spyOn>;
  let clientWidthSpy: ReturnType<typeof vi.spyOn>;
  let clientHeightSpy: ReturnType<typeof vi.spyOn>;
  let offsetWidthSpy: ReturnType<typeof vi.spyOn>;
  let offsetHeightSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    rectSpy = vi
      .spyOn(HTMLElement.prototype, "getBoundingClientRect")
      .mockReturnValue({
        x: 0,
        y: 0,
        top: 0,
        left: 0,
        right: 1024,
        bottom: 768,
        width: 1024,
        height: 768,
        toJSON: () => ({}),
      } as DOMRect);

    clientWidthSpy = vi
      .spyOn(HTMLElement.prototype, "clientWidth", "get")
      .mockReturnValue(1024);
    clientHeightSpy = vi
      .spyOn(HTMLElement.prototype, "clientHeight", "get")
      .mockReturnValue(768);
    offsetWidthSpy = vi
      .spyOn(HTMLElement.prototype, "offsetWidth", "get")
      .mockReturnValue(1024);
    offsetHeightSpy = vi
      .spyOn(HTMLElement.prototype, "offsetHeight", "get")
      .mockReturnValue(768);
  });

  afterEach(() => {
    rectSpy.mockRestore();
    clientWidthSpy.mockRestore();
    clientHeightSpy.mockRestore();
    offsetWidthSpy.mockRestore();
    offsetHeightSpy.mockRestore();
  });

  it("renders with real cytoscape when graph data is present", () => {
    render(
      <KnowledgeGraphPanel
        nodes={[
          {
            id: "n1",
            label: "TNF",
            type: "protein",
            source: "Open Targets",
            metadata: {},
            addedByQuery: "q1",
          },
        ]}
        edges={[]}
      />,
    );

    expect(screen.getByPlaceholderText("Search nodes...")).toBeInTheDocument();
    expect(screen.getByText(/Graph contains/)).toBeInTheDocument();
    expect(screen.getByText("1 nodes")).toBeInTheDocument();
    expect(screen.getByText("0 edges")).toBeInTheDocument();
  });
});
