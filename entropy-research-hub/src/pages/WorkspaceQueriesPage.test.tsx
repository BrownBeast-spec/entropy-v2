import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import WorkspaceQueriesPage from "./WorkspaceQueriesPage";

const mockNavigate = vi.fn();
const mockAddQuery = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock("@/contexts/WorkspaceContext", () => ({
  useWorkspace: () => ({
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
            id: "q_1",
            workspaceId: "ws_1",
            text: "First query",
            mode: "Researcher",
            indiaLens: false,
            submittedAt: new Date("2026-04-02T00:00:00Z"),
            status: "complete",
            contributedNodes: ["N1"],
            contributedEdges: [],
          },
        ],
        activeQueryId: "q_1",
        savedItems: [],
      },
    ],
  }),
  useWorkspaceActions: () => ({
    addQuery: mockAddQuery,
  }),
}));

describe("WorkspaceQueriesPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderPage = () =>
    render(
      <MemoryRouter initialEntries={["/workspaces/ws_1"]}>
        <Routes>
          <Route path="/workspaces/:workspaceId" element={<WorkspaceQueriesPage />} />
        </Routes>
      </MemoryRouter>,
    );

  it("renders query sessions for selected workspace", () => {
    renderPage();

    expect(screen.getByText("Workspace Alpha")).toBeInTheDocument();
    expect(screen.getByText("First query")).toBeInTheDocument();
  });

  it("creates a researcher query and navigates to query view", () => {
    renderPage();

    fireEvent.click(screen.getByRole("button", { name: /new researcher query/i }));

    expect(mockAddQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        workspaceId: "ws_1",
        mode: "Researcher",
        text: "New query",
      }),
    );
    expect(mockNavigate).toHaveBeenCalledWith(
      expect.stringMatching(/^\/workspaces\/ws_1\/queries\/query_/),
    );
  });

  it("navigates when existing query row is clicked", () => {
    renderPage();

    fireEvent.click(screen.getByText("First query"));

    expect(mockNavigate).toHaveBeenCalledWith("/workspaces/ws_1/queries/q_1");
  });
});
