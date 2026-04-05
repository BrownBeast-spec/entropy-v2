import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import WorkspaceQueryView from "./WorkspaceQueryView";

const mockSetCurrentWorkspace = vi.fn();
const mockUseWorkspace = vi.fn();

vi.mock("./WorkspaceView", () => ({
  default: () => <div data-testid="workspace-view">Workspace View</div>,
}));

vi.mock("@/contexts/WorkspaceContext", () => ({
  useWorkspace: () => mockUseWorkspace(),
}));

describe("WorkspaceQueryView onboarding", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockUseWorkspace.mockReturnValue({
      currentWorkspace: null,
      setCurrentWorkspace: mockSetCurrentWorkspace,
      workspaces: [
        {
          id: "ws_1",
          name: "Workspace Alpha",
          createdAt: new Date("2026-04-01T00:00:00Z"),
          updatedAt: new Date("2026-04-02T00:00:00Z"),
          nodes: [],
          edges: [],
          queries: [
            {
              id: "q_seed",
              workspaceId: "ws_1",
              text: "New query",
              mode: "Researcher",
              indiaLens: false,
              submittedAt: new Date("2026-04-02T00:00:00Z"),
              status: "pending",
              contributedNodes: [],
              contributedEdges: [],
            },
          ],
          activeQueryId: "q_seed",
          savedItems: [],
        },
      ],
    });
  });

  const renderView = () =>
    render(
      <MemoryRouter initialEntries={["/workspaces/ws_1/queries/q_seed"]}>
        <Routes>
          <Route
            path="/workspaces/:workspaceId/queries/:queryId"
            element={<WorkspaceQueryView />}
          />
        </Routes>
      </MemoryRouter>,
    );

  it("shows onboarding copy when query is new and graph has no evidence", () => {
    renderView();

    expect(screen.getByText(/ready to run your first query/i)).toBeInTheDocument();
    expect(screen.getByText(/enter your query/i)).toBeInTheDocument();
    expect(screen.getByText(/fetch from sources/i)).toBeInTheDocument();
    expect(screen.getByText(/add evidence to graph/i)).toBeInTheDocument();
  });

  it("hides onboarding copy once query has contributed evidence", () => {
    mockUseWorkspace.mockReturnValueOnce({
      currentWorkspace: null,
      setCurrentWorkspace: mockSetCurrentWorkspace,
      workspaces: [
        {
          id: "ws_1",
          name: "Workspace Alpha",
          createdAt: new Date("2026-04-01T00:00:00Z"),
          updatedAt: new Date("2026-04-02T00:00:00Z"),
          nodes: [
            {
              id: "N1",
              label: "AMPK",
              type: "protein",
              source: "STRING",
              metadata: {},
              addedByQuery: "q_seed",
            },
          ],
          edges: [],
          queries: [
            {
              id: "q_seed",
              workspaceId: "ws_1",
              text: "AMPK in NASH",
              mode: "Researcher",
              indiaLens: false,
              submittedAt: new Date("2026-04-02T00:00:00Z"),
              status: "complete",
              contributedNodes: ["N1"],
              contributedEdges: [],
            },
          ],
          activeQueryId: "q_seed",
          savedItems: [],
        },
      ],
    });

    renderView();

    expect(screen.queryByText(/ready to run your first query/i)).not.toBeInTheDocument();
  });
});
