import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import WorkspaceView from "./WorkspaceView";
import RightChatPanel from "@/components/layout/RightChatPanel";
import type { Workspace } from "@/types/workspace";

const mockSearchWorkspace = vi.fn();
const mockAddNodesToWorkspace = vi.fn();
const mockSetCurrentWorkspace = vi.fn();

const workspace: Workspace = {
  id: "ws_1",
  name: "Workspace Alpha",
  description: "desc",
  mode: "Researcher",
  indiaLens: false,
  createdAt: new Date("2026-04-01T00:00:00Z"),
  updatedAt: new Date("2026-04-01T00:00:00Z"),
  nodes: [],
  edges: [],
  queries: [],
  activeQueryId: "query_1",
  savedItems: [],
  report: {
    workspaceId: "ws_1",
    sections: [{ title: "Overview", content: "Initial report", citations: [] }],
    generatedAt: new Date("2026-04-01T00:00:00Z"),
    wordCount: 2,
    graphNodeCountAtGeneration: 0,
  },
};

vi.mock("@/lib/api/search", () => ({
  searchWorkspace: (...args: unknown[]) => mockSearchWorkspace(...args),
}));

vi.mock("@/lib/api/addNodes", () => ({
  addNodesToWorkspace: (...args: unknown[]) => mockAddNodesToWorkspace(...args),
}));

vi.mock("@/contexts/WorkspaceContext", () => {
  const addNode = vi.fn((node) => {
    workspace.nodes = [...workspace.nodes, node];
  });

  return {
    useWorkspace: () => ({
      currentWorkspace: workspace,
      setCurrentWorkspace: mockSetCurrentWorkspace,
      workspaces: [workspace],
    }),
    useWorkspaceActions: () => ({
      addNode,
      addEdge: vi.fn(),
      updateWorkspace: vi.fn(),
      removeNode: vi.fn(),
      toggleSavedItem: vi.fn(),
    }),
  };
});

vi.mock("@/components/workspace/KnowledgeGraphPanel", () => ({
  default: () => <div data-testid="kg-panel" />,
}));

vi.mock("@/components/workspace/EntityDetailDrawer", () => ({
  default: () => null,
}));

describe("WorkspaceView integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    workspace.nodes = [];
    workspace.edges = [];
    workspace.queries = [];
    workspace.report = {
      workspaceId: "ws_1",
      sections: [{ title: "Overview", content: "Initial report", citations: [] }],
      generatedAt: new Date("2026-04-01T00:00:00Z"),
      wordCount: 2,
      graphNodeCountAtGeneration: 0,
    };
  });

  it("completes search-select-add workflow and shows report staleness", async () => {
    mockSearchWorkspace.mockResolvedValue({
      results: [
        {
          id: "result_1",
          entityId: "ENSG00001",
          entityType: "protein",
          label: "AMPK",
          source: "STRING",
          metadata: {},
          helpfulness: { score: 85, explanation: "Fills gap", gapsFilled: [] },
        },
      ],
      executionTime: 100,
      searchedSources: ["STRING"],
    });

    mockAddNodesToWorkspace.mockResolvedValue({
      addedNodes: [
        {
          id: "ENSG00001",
          label: "AMPK",
          type: "protein",
          source: "STRING",
          metadata: {},
          addedByQuery: "query_1",
        },
      ],
      addedEdges: [],
      duplicatesSkipped: 0,
    });

    const { rerender } = render(
      <MemoryRouter initialEntries={["/workspaces/ws_1/queries/query_1"]}>
        <Routes>
          <Route
            path="/workspaces/:workspaceId/queries/:queryId"
            element={
              <div className="flex">
                <WorkspaceView />
                <RightChatPanel />
              </div>
            }
          />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByPlaceholderText(/search mcp data sources/i), {
      target: { value: "AMPK targets" },
    });
    fireEvent.click(screen.getByRole("button", { name: /^search$/i }));

    await waitFor(() => {
      expect(screen.getByText("AMPK")).toBeInTheDocument();
    });

    const checkboxes = screen.getAllByRole("checkbox");
    fireEvent.click(checkboxes[checkboxes.length - 1]);
    fireEvent.click(screen.getByRole("button", { name: /add selected to graph/i }));

    await waitFor(() => {
      expect(mockAddNodesToWorkspace).toHaveBeenCalled();
    });

    rerender(
      <MemoryRouter initialEntries={["/workspaces/ws_1/queries/query_1"]}>
        <Routes>
          <Route
            path="/workspaces/:workspaceId/queries/:queryId"
            element={
              <div className="flex">
                <WorkspaceView />
                <RightChatPanel />
              </div>
            }
          />
        </Routes>
      </MemoryRouter>,
    );

    expect(
      await screen.findByText(/new nodes since last report/i),
    ).toBeInTheDocument();
  });
});
