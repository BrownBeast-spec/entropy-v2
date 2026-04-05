import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import WorkspaceView from "./WorkspaceView";
import WorkspaceQueriesPage from "./WorkspaceQueriesPage";

const mockSetCurrentWorkspace = vi.fn();

vi.mock("@/contexts/WorkspaceContext", () => ({
  useWorkspace: () => ({
    currentWorkspace: {
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
      savedItems: [],
    },
    setCurrentWorkspace: mockSetCurrentWorkspace,
    workspaces: [
      {
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
        savedItems: [],
      },
    ],
  }),
  useWorkspaceActions: () => ({
    addNode: vi.fn(),
    addEdge: vi.fn(),
    addQuery: vi.fn(),
    updateWorkspace: vi.fn(),
    removeNode: vi.fn(),
    toggleSavedItem: vi.fn(),
    getGraphSnapshot: vi.fn(() => ({ nodeIds: [], edgeSummary: [] })),
  }),
}));

vi.mock("@/components/workspace/KnowledgeGraphPanel", () => ({
  default: () => <div data-testid="kg-panel" />, 
}));
vi.mock("@/components/workspace/IntermediateReportPanel", () => ({
  default: () => <div data-testid="report-panel" />,
}));
vi.mock("@/components/workspace/ResearchProgressOverlay", () => ({
  default: () => <div data-testid="progress-overlay" />,
}));
vi.mock("@/components/workspace/EntityDetailDrawer", () => ({
  default: () => null,
}));

describe("WorkspaceView route behavior", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("reads workspace id from /workspaces/:id and syncs current workspace", () => {
    render(
      <MemoryRouter initialEntries={["/workspaces/ws_1"]}>
        <Routes>
          <Route path="/workspaces/:id" element={<WorkspaceView />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(mockSetCurrentWorkspace).toHaveBeenCalled();
    expect(screen.getByText("Workspace Alpha")).toBeInTheDocument();
  });

  it("routes workspace root to query list page", () => {
    render(
      <MemoryRouter initialEntries={["/workspaces/ws_1"]}>
        <Routes>
          <Route path="/workspaces/:workspaceId" element={<WorkspaceQueriesPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText(/start a new run by choosing a lens below/i)).toBeInTheDocument();
  });
});
