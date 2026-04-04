import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import KnowledgeGraphPanel from "./KnowledgeGraphPanel";

const cyInstances: Array<{ stop: ReturnType<typeof vi.fn>; destroy: ReturnType<typeof vi.fn> }> = [];

vi.mock("cytoscape", () => {
  const cytoscapeMock = vi.fn(() => {
    const stop = vi.fn();
    const destroy = vi.fn();
    const nodesApi = {
      removeClass: vi.fn().mockReturnThis(),
      addClass: vi.fn().mockReturnThis(),
      filter: vi.fn(() => ({
        removeClass: vi.fn().mockReturnThis(),
        addClass: vi.fn().mockReturnThis(),
        length: 0,
      })),
    };

    const instance = {
      stop,
      destroy,
      on: vi.fn(),
      nodes: vi.fn(() => nodesApi),
      getElementById: vi.fn(() => ({
        removeClass: vi.fn().mockReturnThis(),
        addClass: vi.fn().mockReturnThis(),
      })),
      animate: vi.fn(),
      zoom: vi.fn(() => 1),
      fit: vi.fn(),
    };

    cyInstances.push({ stop, destroy });
    return instance;
  });

  return {
    default: cytoscapeMock,
  };
});

describe("KnowledgeGraphPanel lifecycle cleanup", () => {
  beforeEach(() => {
    cyInstances.length = 0;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("stops active cytoscape instance before destroy on rerender and unmount", () => {
    const { rerender, unmount } = render(
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

    expect(cyInstances).toHaveLength(1);

    rerender(
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
          {
            id: "n2",
            label: "PPARG",
            type: "protein",
            source: "Open Targets",
            metadata: {},
            addedByQuery: "q1",
          },
        ]}
        edges={[]}
      />,
    );

    expect(cyInstances[0].stop).toHaveBeenCalledTimes(1);
    expect(cyInstances[0].destroy).toHaveBeenCalledTimes(1);

    unmount();

    expect(cyInstances[1].stop).toHaveBeenCalledTimes(1);
    expect(cyInstances[1].destroy).toHaveBeenCalledTimes(1);
  });

  it("destroys active cytoscape instance when switching away from graph view", () => {
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

    expect(cyInstances).toHaveLength(1);

    fireEvent.click(screen.getByRole("button", { name: "Timeline" }));

    expect(cyInstances[0].stop).toHaveBeenCalledTimes(1);
    expect(cyInstances[0].destroy).toHaveBeenCalledTimes(1);
    expect(screen.getByText(/Timeline View/i)).toBeInTheDocument();
  });

  it("stops instance.stop() is called before destroy to cancel any pending animations", () => {
    const { unmount } = render(
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

    expect(cyInstances).toHaveLength(1);
    const instance = cyInstances[0];

    unmount();

    // Verify stop is called before destroy to cancel RAF loops
    const stopCallOrder = instance.stop.mock.invocationCallOrder[0];
    const destroyCallOrder = instance.destroy.mock.invocationCallOrder[0];
    
    expect(stopCallOrder).toBeLessThan(destroyCallOrder);
  });
});
