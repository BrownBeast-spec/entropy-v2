import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import WorkspaceQueriesPage from "./WorkspaceQueriesPage";

const mockNavigate = vi.fn();
const mockUpdateWorkspace = vi.fn();
const mockSetCurrentWorkspace = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock("@/contexts/WorkspaceContext", () => ({
  useWorkspace: () => ({
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
    updateWorkspace: mockUpdateWorkspace,
  }),
}));

describe("WorkspaceQueriesPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdateWorkspace.mockResolvedValue(undefined);
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

  it("creates a researcher query and persists workspace before navigating", async () => {
    renderPage();

    fireEvent.click(screen.getByRole("button", { name: /new researcher query/i }));

    await waitFor(() => {
      expect(mockUpdateWorkspace).toHaveBeenCalled();
    });

    const updatedWorkspace = mockUpdateWorkspace.mock.calls[0][0];
    expect(updatedWorkspace).toMatchObject({
      id: "ws_1",
      activeQueryId: expect.stringMatching(/^query_/),
    });
    expect(updatedWorkspace.queries).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          workspaceId: "ws_1",
          mode: "Researcher",
        }),
      ]),
    );
    expect(mockSetCurrentWorkspace).toHaveBeenCalledWith(updatedWorkspace);
    expect(mockNavigate).toHaveBeenCalledWith(
      `/workspaces/ws_1/queries/${updatedWorkspace.activeQueryId}`,
    );
  });

  it("creates a strategist query from query-list page", async () => {
    renderPage();

    fireEvent.click(screen.getByRole("button", { name: /new strategist query/i }));

    await waitFor(() => {
      expect(mockUpdateWorkspace).toHaveBeenCalled();
    });

    const updatedWorkspace = mockUpdateWorkspace.mock.calls[0][0];
    const newestQuery = updatedWorkspace.queries[updatedWorkspace.queries.length - 1];
    expect(newestQuery.mode).toBe("Strategist");
  });

  it("renders bolder query-mode cards", () => {
    renderPage();

    expect(screen.getByText(/query sessions/i)).toBeInTheDocument();
    expect(screen.getByText("Research")).toBeInTheDocument();
    expect(screen.getByText("Strategy")).toBeInTheDocument();
  });

  it("navigates when existing query row is clicked", () => {
    renderPage();

    fireEvent.click(screen.getByText("First query"));

    expect(mockNavigate).toHaveBeenCalledWith("/workspaces/ws_1/queries/q_1");
  });
});
