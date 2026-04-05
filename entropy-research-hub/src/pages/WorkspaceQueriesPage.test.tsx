import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import WorkspaceQueriesPage from "./WorkspaceQueriesPage";

const {
  mockNavigate,
  mockUpdateWorkspace,
  mockSetCurrentWorkspace,
  mockCreateQuery,
  mockGetWorkspaceQueries,
} = vi.hoisted(() => ({
  mockNavigate: vi.fn(),
  mockUpdateWorkspace: vi.fn(),
  mockSetCurrentWorkspace: vi.fn(),
  mockCreateQuery: vi.fn(),
  mockGetWorkspaceQueries: vi.fn(),
}));

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

vi.mock("@/lib/api/workspace", () => ({
  createQuery: mockCreateQuery,
  getWorkspaceQueries: mockGetWorkspaceQueries,
}));

describe("WorkspaceQueriesPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdateWorkspace.mockResolvedValue(undefined);
    mockCreateQuery.mockResolvedValue({
      success: true,
      data: {
        id: "query_backend_1",
        workspaceId: "ws_1",
        text: "new query from composer",
        mode: "Researcher",
        indiaLens: false,
        submittedAt: new Date("2026-04-03T00:00:00Z"),
        status: "pending",
        contributedNodes: [],
        contributedEdges: [],
      },
    });
    mockGetWorkspaceQueries.mockResolvedValue({
      success: true,
      data: {
        queries: [
          {
            id: "query_backend_1",
            workspaceId: "ws_1",
            text: "new query from composer",
            mode: "Researcher",
            indiaLens: false,
            submittedAt: "2026-04-03T00:00:00.000Z",
            status: "pending",
            contributedNodes: [],
            contributedEdges: [],
          },
        ],
      },
    });
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

  it("creates a researcher query from multiline composer and navigates", async () => {
    renderPage();

    fireEvent.change(screen.getByPlaceholderText(/enter your research question/i), {
      target: { value: "new query from composer" },
    });
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /run query/i })).not.toBeDisabled();
    });
    fireEvent.click(screen.getByRole("button", { name: /run query/i }));

    await waitFor(() => {
      expect(mockCreateQuery).toHaveBeenCalledWith("ws_1", {
        text: "new query from composer",
        mode: "Researcher",
        indiaLens: false,
        status: "pending",
      });
    });
    expect(mockGetWorkspaceQueries).toHaveBeenCalledWith("ws_1");

    expect(mockUpdateWorkspace).toHaveBeenCalled();

    const updatedWorkspace = mockUpdateWorkspace.mock.calls[0][0];
    expect(updatedWorkspace).toMatchObject({
      id: "ws_1",
      activeQueryId: "query_backend_1",
    });
    expect(updatedWorkspace.queries).toHaveLength(1);
    expect(updatedWorkspace.queries).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "query_backend_1",
          workspaceId: "ws_1",
          mode: "Researcher",
          text: "new query from composer",
        }),
      ]),
    );
    expect(mockSetCurrentWorkspace).toHaveBeenCalledWith(updatedWorkspace);
    expect(mockNavigate).toHaveBeenCalledWith(
      `/workspaces/ws_1/queries/${updatedWorkspace.activeQueryId}`,
    );
  });

  it("creates a strategist query from multiline composer mode switch", async () => {
    renderPage();

    mockCreateQuery.mockResolvedValueOnce({
      success: true,
      data: {
        id: "query_backend_2",
        workspaceId: "ws_1",
        text: "strategic framing",
        mode: "Strategist",
        indiaLens: false,
        submittedAt: new Date("2026-04-03T00:00:00Z"),
        status: "pending",
        contributedNodes: [],
        contributedEdges: [],
      },
    });
    mockGetWorkspaceQueries.mockResolvedValueOnce({
      success: true,
      data: {
        queries: [
          {
            id: "query_backend_2",
            workspaceId: "ws_1",
            text: "strategic framing",
            mode: "Strategist",
            indiaLens: false,
            submittedAt: "2026-04-03T00:00:00.000Z",
            status: "pending",
            contributedNodes: [],
            contributedEdges: [],
          },
        ],
      },
    });

    fireEvent.click(screen.getByRole("button", { name: /strategist/i }));
    fireEvent.change(screen.getByPlaceholderText(/enter your research question/i), {
      target: { value: "strategic framing" },
    });
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /run query/i })).not.toBeDisabled();
    });
    fireEvent.click(screen.getByRole("button", { name: /run query/i }));

    await waitFor(() => {
      expect(mockCreateQuery).toHaveBeenCalledWith("ws_1", {
        text: "strategic framing",
        mode: "Strategist",
        indiaLens: false,
        status: "pending",
      });
    });
    expect(mockGetWorkspaceQueries).toHaveBeenCalledWith("ws_1");

    expect(mockUpdateWorkspace).toHaveBeenCalled();

    const updatedWorkspace = mockUpdateWorkspace.mock.calls[0][0];
    const newestQuery = updatedWorkspace.queries[updatedWorkspace.queries.length - 1];
    expect(newestQuery.mode).toBe("Strategist");
    expect(newestQuery.text).toBe("strategic framing");
  });

  it("renders editorial composer and no large create-query cards", () => {
    renderPage();

    expect(screen.getByText(/Query Composer/i)).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: /query prompt/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /new researcher query/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /new strategist query/i })).not.toBeInTheDocument();
  });

  it("requires typed input before enabling run query action", () => {
    renderPage();

    const runButton = screen.getByRole("button", { name: /run query/i });
    expect(runButton).toBeDisabled();

    fireEvent.change(screen.getByPlaceholderText(/enter your research question/i), {
      target: { value: "AMPK for NASH" },
    });

    expect(runButton).not.toBeDisabled();
  });

  it("supports multiline input for query composer", async () => {
    renderPage();

    mockCreateQuery.mockResolvedValueOnce({
      success: true,
      data: {
        id: "query_backend_3",
        workspaceId: "ws_1",
        text: "AMPK for NASH",
        mode: "Researcher",
        indiaLens: false,
        submittedAt: new Date("2026-04-03T00:00:00Z"),
        status: "pending",
        contributedNodes: [],
        contributedEdges: [],
      },
    });
    mockGetWorkspaceQueries.mockResolvedValueOnce({
      success: true,
      data: {
        queries: [
          {
            id: "query_backend_3",
            workspaceId: "ws_1",
            text: "AMPK for NASH",
            mode: "Researcher",
            indiaLens: false,
            submittedAt: "2026-04-03T00:00:00.000Z",
            status: "pending",
            contributedNodes: [],
            contributedEdges: [],
          },
        ],
      },
    });

    fireEvent.change(screen.getByPlaceholderText(/enter your research question/i), {
      target: { value: "AMPK for NASH" },
    });
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /run query/i })).not.toBeDisabled();
    });
    fireEvent.click(screen.getByRole("button", { name: /run query/i }));

    await waitFor(() => {
      expect(mockCreateQuery).toHaveBeenCalledWith("ws_1", {
        text: "AMPK for NASH",
        mode: "Researcher",
        indiaLens: false,
        status: "pending",
      });
    });
    expect(mockGetWorkspaceQueries).toHaveBeenCalledWith("ws_1");

    expect(mockUpdateWorkspace).toHaveBeenCalled();

    const updatedWorkspace = mockUpdateWorkspace.mock.calls[0][0];
    const newestQuery = updatedWorkspace.queries[updatedWorkspace.queries.length - 1];
    expect(newestQuery.text).toBe("AMPK for NASH");
    expect(mockNavigate).toHaveBeenCalledWith(
      "/workspaces/ws_1/queries/query_backend_3",
    );
  });

  it("does not fall back to local query creation when API create fails", async () => {
    renderPage();

    mockCreateQuery.mockRejectedValueOnce(new Error("Workspace API unavailable"));

    fireEvent.change(screen.getByPlaceholderText(/enter your research question/i), {
      target: { value: "retry this" },
    });
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /run query/i })).not.toBeDisabled();
    });
    fireEvent.click(screen.getByRole("button", { name: /run query/i }));

    await waitFor(() => {
      expect(mockCreateQuery).toHaveBeenCalledWith("ws_1", {
        text: "retry this",
        mode: "Researcher",
        indiaLens: false,
        status: "pending",
      });
    });

    expect(mockUpdateWorkspace).not.toHaveBeenCalled();
    expect(mockGetWorkspaceQueries).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(screen.getByText("Workspace API unavailable")).toBeInTheDocument();
  });

  it("falls back to created query when query-list refresh fails", async () => {
    renderPage();

    mockCreateQuery.mockResolvedValueOnce({
      success: true,
      data: {
        id: "query_backend_4",
        workspaceId: "ws_1",
        text: "fallback query",
        mode: "Researcher",
        indiaLens: false,
        submittedAt: "2026-04-03T00:00:00.000Z",
        status: "pending",
        contributedNodes: [],
        contributedEdges: [],
      },
    });
    mockGetWorkspaceQueries.mockRejectedValueOnce(
      new Error("Unable to refresh query list"),
    );

    fireEvent.change(screen.getByPlaceholderText(/enter your research question/i), {
      target: { value: "fallback query" },
    });
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /run query/i })).not.toBeDisabled();
    });
    fireEvent.click(screen.getByRole("button", { name: /run query/i }));

    await waitFor(() => {
      expect(mockGetWorkspaceQueries).toHaveBeenCalledWith("ws_1");
    });

    expect(mockUpdateWorkspace).toHaveBeenCalled();
    const updatedWorkspace = mockUpdateWorkspace.mock.calls[0][0];
    expect(
      updatedWorkspace.queries.some((query: { id: string }) => query.id === "query_backend_4"),
    ).toBe(true);
    expect(updatedWorkspace.activeQueryId).toBe("query_backend_4");
    expect(mockNavigate).toHaveBeenCalledWith("/workspaces/ws_1/queries/query_backend_4");
  });

  it("navigates when existing query row is clicked", () => {
    renderPage();

    fireEvent.click(screen.getByText("First query"));

    expect(mockNavigate).toHaveBeenCalledWith("/workspaces/ws_1/queries/q_1");
  });
});
