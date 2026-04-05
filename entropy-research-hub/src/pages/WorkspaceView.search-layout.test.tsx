import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import WorkspaceView from "./WorkspaceView";
import type { Workspace } from "@/types/workspace";

const mockGenerateSynthesis = vi.fn();
const mockUpdateWorkspace = vi.fn();
const mockSetCurrentWorkspace = vi.fn();

vi.mock("@/lib/api/synthesis", () => ({
  generateSynthesis: (...args: unknown[]) => mockGenerateSynthesis(...args),
}));

const baseWorkspace: Workspace = {
  id: "ws_1",
  name: "Workspace Alpha",
  description: "desc",
  mode: "Researcher" as const,
  indiaLens: false,
  createdAt: new Date("2026-04-01T00:00:00Z"),
  updatedAt: new Date("2026-04-01T00:00:00Z"),
  nodes: [],
  edges: [],
  queries: [],
  savedItems: [],
};

vi.mock("@/contexts/WorkspaceContext", () => ({
  useWorkspace: () => ({
    currentWorkspace: baseWorkspace,
    setCurrentWorkspace: mockSetCurrentWorkspace,
    workspaces: [baseWorkspace],
  }),
  useWorkspaceActions: () => ({
    updateWorkspace: mockUpdateWorkspace,
    removeNode: vi.fn(),
    toggleSavedItem: vi.fn(),
  }),
}));

vi.mock("@/components/workspace/KnowledgeGraphPanel", () => ({
  default: () => <div data-testid="kg-panel" />,
}));

vi.mock("@/components/workspace/EntityDetailDrawer", () => ({
  default: () => null,
}));

describe("WorkspaceView search layout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    baseWorkspace.nodes = [];
    baseWorkspace.edges = [];
    baseWorkspace.queries = [];
    baseWorkspace.report = undefined;
  });

  const renderView = () =>
    render(
      <MemoryRouter initialEntries={["/workspaces/ws_1"]}>
        <Routes>
          <Route path="/workspaces/:id" element={<WorkspaceView />} />
        </Routes>
      </MemoryRouter>,
    );

  it("removes in-page query input and submit actions", () => {
    renderView();

    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Submit Query/i }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/Suggested Next Questions/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Query History/i)).not.toBeInTheDocument();
  });

  it("shows empty graph guidance that points to right-panel search", () => {
    renderView();

    expect(
      screen.getByText(/use Search in the right panel to build your graph/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Load Demo Data/i }),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/Use Search on the right sidebar/i),
    ).not.toBeInTheDocument();
  });

  it("keeps graph and report in a vertical resizable stack", () => {
    const { container } = renderView();

    expect(
      container.querySelector('[data-panel-group-direction="vertical"]'),
    ).toBeInTheDocument();
  });

  it("regenerates synthesis and stores report with graph node count", async () => {
    baseWorkspace.nodes = [
      {
        id: "N1",
        label: "TP53",
        type: "protein",
        source: "Open Targets",
        metadata: {},
        addedByQuery: "q1",
      },
    ];
    baseWorkspace.edges = [];
    baseWorkspace.report = {
      workspaceId: "ws_1",
      sections: [
        { title: "Overview", content: "Old", citations: [] },
      ],
      generatedAt: new Date("2026-04-01T00:00:00Z"),
      wordCount: 1,
      graphNodeCountAtGeneration: 0,
    };

    mockGenerateSynthesis.mockResolvedValue({
      sections: [
        {
          title: "Overview",
          content: "Updated synthesis section",
          citations: [],
        },
      ],
    });

    renderView();

    fireEvent.click(screen.getByRole("button", { name: /Regenerate/i }));

    await waitFor(() => {
      expect(mockGenerateSynthesis).toHaveBeenCalledWith(
        expect.objectContaining({
          graphSnapshot: expect.objectContaining({ nodes: baseWorkspace.nodes }),
          personaMode: "Researcher",
        }),
      );
      expect(mockUpdateWorkspace).toHaveBeenCalledWith(
        expect.objectContaining({
          report: expect.objectContaining({
            sections: expect.arrayContaining([
              expect.objectContaining({ title: "Overview" }),
            ]),
            graphNodeCountAtGeneration: 1,
          }),
        }),
      );
    });
  });

  it("shows regeneration error notice when synthesis API fails", async () => {
    baseWorkspace.nodes = [
      {
        id: "N1",
        label: "TP53",
        type: "protein",
        source: "Open Targets",
        metadata: {},
        addedByQuery: "q1",
      },
    ];
    baseWorkspace.report = {
      workspaceId: "ws_1",
      sections: [{ title: "Overview", content: "Old", citations: [] }],
      generatedAt: new Date("2026-04-01T00:00:00Z"),
      wordCount: 1,
      graphNodeCountAtGeneration: 1,
    };

    mockGenerateSynthesis.mockRejectedValue(new Error("network down"));

    renderView();

    fireEvent.click(screen.getByRole("button", { name: /Regenerate/i }));

    await waitFor(() => {
      expect(
        screen.getByText(/Could not regenerate report\. Try again\./i),
      ).toBeInTheDocument();
    });
  });
});
