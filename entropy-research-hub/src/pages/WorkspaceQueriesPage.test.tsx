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
  mockSearchWorkspace,
  mockExecuteWorkflow,
} = vi.hoisted(() => ({
  mockNavigate: vi.fn(),
  mockUpdateWorkspace: vi.fn(),
  mockSetCurrentWorkspace: vi.fn(),
  mockCreateQuery: vi.fn(),
  mockGetWorkspaceQueries: vi.fn(),
  mockSearchWorkspace: vi.fn(),
  mockExecuteWorkflow: vi.fn(),
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

vi.mock("@/lib/api/search", () => ({
  searchWorkspace: mockSearchWorkspace,
}));

vi.mock("@/lib/api/workflow", () => ({
  executeWorkflow: mockExecuteWorkflow,
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

  it("shows syncing state while refreshing query list after create", async () => {
    renderPage();

    mockCreateQuery.mockResolvedValueOnce({
      success: true,
      data: {
        id: "query_backend_sync",
        workspaceId: "ws_1",
        text: "sync me",
        mode: "Researcher",
        indiaLens: false,
        submittedAt: "2026-04-03T00:00:00.000Z",
        status: "pending",
        contributedNodes: [],
        contributedEdges: [],
      },
    });

    let resolveRefresh:
      | ((value: {
          success: boolean;
          data: {
            queries: Array<{
              id: string;
              workspaceId: string;
              text: string;
              mode: "Researcher" | "Strategist";
              indiaLens: boolean;
              submittedAt: string;
              status: "pending" | "running" | "complete" | "failed";
              contributedNodes: string[];
              contributedEdges: string[];
            }>;
          };
        }) => void)
      | null = null;

    mockGetWorkspaceQueries.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveRefresh = resolve;
        }),
    );

    fireEvent.change(screen.getByPlaceholderText(/enter your research question/i), {
      target: { value: "sync me" },
    });
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /run query/i })).not.toBeDisabled();
    });

    fireEvent.click(screen.getByRole("button", { name: /run query/i }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /syncing/i })).toBeDisabled();
    });

    resolveRefresh?.({
      success: true,
      data: {
        queries: [
          {
            id: "query_backend_sync",
            workspaceId: "ws_1",
            text: "sync me",
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

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/workspaces/ws_1/queries/query_backend_sync");
    });

    expect(screen.queryByRole("button", { name: /syncing/i })).not.toBeInTheDocument();
  });

  it("navigates when existing query row is clicked", () => {
    renderPage();

    fireEvent.click(screen.getByText("First query"));

    expect(mockNavigate).toHaveBeenCalledWith("/workspaces/ws_1/queries/q_1");
  });

  describe("automatic workflow execution", () => {
    beforeEach(() => {
      mockSearchWorkspace.mockResolvedValue({
        results: [
          {
            id: "sr_1",
            entityId: "ent_1",
            entityType: "Publication",
            label: "AMPK in NASH",
            source: "pubmed",
            metadata: { pmid: "12345" },
            helpfulness: {
              score: 0.9,
              explanation: "Highly relevant",
              gapsFilled: ["mechanism"],
            },
          },
        ],
        executionTime: 1200,
        searchedSources: ["pubmed"],
      });

      mockExecuteWorkflow.mockResolvedValue({
        queryId: "query_backend_1",
        addedNodesCount: 5,
        addedEdgesCount: 3,
        synthesis: {
          sections: [
            {
              title: "Background",
              content: "AMPK research overview",
              citations: [],
            },
          ],
        },
      });
    });

    it("triggers workflow after successful query creation", async () => {
      renderPage();

      fireEvent.change(screen.getByPlaceholderText(/enter your research question/i), {
        target: { value: "AMPK for NASH" },
      });
      await waitFor(() => {
        expect(screen.getByRole("button", { name: /run query/i })).not.toBeDisabled();
      });
      fireEvent.click(screen.getByRole("button", { name: /run query/i }));

      // Wait for query creation
      await waitFor(() => {
        expect(mockCreateQuery).toHaveBeenCalled();
      });

      // Should call search with correct parameters
      await waitFor(() => {
        expect(mockSearchWorkspace).toHaveBeenCalledWith({
          query: "AMPK for NASH",
          workspaceId: "ws_1",
          personaMode: "Researcher",
          indiaLens: false,
          graphSnapshot: {
            nodeIds: [],
            edgeSummary: [],
          },
        });
      });

      // Should execute workflow with search results
      await waitFor(() => {
        expect(mockExecuteWorkflow).toHaveBeenCalledWith({
          workspaceId: "ws_1",
          queryText: "AMPK for NASH",
          mode: "Researcher",
          indiaLens: false,
          searchTypes: ["Publication", "ClinicalTrial", "Company"],
          reportSections: ["Background", "Key Findings", "Evidence Quality"],
          searchResults: [
            {
              id: "sr_1",
              entityId: "ent_1",
              entityType: "Publication",
              label: "AMPK in NASH",
              source: "pubmed",
              metadata: { pmid: "12345" },
              helpfulness: {
                score: 0.9,
                explanation: "Highly relevant",
                gapsFilled: ["mechanism"],
              },
            },
          ],
        });
      });

      // Should navigate to query view
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith("/workspaces/ws_1/queries/query_backend_1");
      });
    });

    it("shows researching state during workflow execution", async () => {
      renderPage();

      // Delay workflow execution to observe state
      let resolveWorkflow:
        | ((value: {
            queryId: string;
            addedNodesCount: number;
            addedEdgesCount: number;
            synthesis: { sections: Array<{ title: string; content: string; citations: unknown[] }> };
          }) => void)
        | null = null;

      mockExecuteWorkflow.mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveWorkflow = resolve;
          }),
      );

      fireEvent.change(screen.getByPlaceholderText(/enter your research question/i), {
        target: { value: "test query" },
      });
      await waitFor(() => {
        expect(screen.getByRole("button", { name: /run query/i })).not.toBeDisabled();
      });
      fireEvent.click(screen.getByRole("button", { name: /run query/i }));

      // Should show "Researching..." while workflow runs
      await waitFor(() => {
        expect(screen.getByRole("button", { name: /researching/i })).toBeDisabled();
      });

      // Resolve workflow
      resolveWorkflow?.({
        queryId: "query_backend_1",
        addedNodesCount: 2,
        addedEdgesCount: 1,
        synthesis: {
          sections: [{ title: "Test", content: "Test content", citations: [] }],
        },
      });

      // Button state should return to normal after navigation
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalled();
      });
    });

    it("handles workflow execution failure gracefully and still navigates", async () => {
      renderPage();

      mockExecuteWorkflow.mockRejectedValueOnce(
        new Error("Workflow execution failed: Neo4j connection timeout"),
      );

      fireEvent.change(screen.getByPlaceholderText(/enter your research question/i), {
        target: { value: "error case" },
      });
      await waitFor(() => {
        expect(screen.getByRole("button", { name: /run query/i })).not.toBeDisabled();
      });
      fireEvent.click(screen.getByRole("button", { name: /run query/i }));

      // Workflow should be attempted
      await waitFor(() => {
        expect(mockExecuteWorkflow).toHaveBeenCalled();
      });

      // Should still navigate even if workflow fails
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith("/workspaces/ws_1/queries/query_backend_1");
      });

      // Error should be logged but not block navigation
      // (In real implementation, we might show a toast notification)
    });

    it("handles search failure and continues without workflow", async () => {
      renderPage();

      mockSearchWorkspace.mockRejectedValueOnce(new Error("Search service unavailable"));

      fireEvent.change(screen.getByPlaceholderText(/enter your research question/i), {
        target: { value: "search fails" },
      });
      await waitFor(() => {
        expect(screen.getByRole("button", { name: /run query/i })).not.toBeDisabled();
      });
      fireEvent.click(screen.getByRole("button", { name: /run query/i }));

      // Search should be attempted
      await waitFor(() => {
        expect(mockSearchWorkspace).toHaveBeenCalled();
      });

      // Workflow should NOT be called if search fails
      expect(mockExecuteWorkflow).not.toHaveBeenCalled();

      // Should still navigate to query view
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith("/workspaces/ws_1/queries/query_backend_1");
      });
    });

    it("passes strategist mode to workflow correctly", async () => {
      renderPage();

      mockCreateQuery.mockResolvedValueOnce({
        success: true,
        data: {
          id: "query_backend_strat",
          workspaceId: "ws_1",
          text: "strategic query",
          mode: "Strategist",
          indiaLens: false,
          submittedAt: new Date("2026-04-03T00:00:00Z"),
          status: "pending",
          contributedNodes: [],
          contributedEdges: [],
        },
      });

      fireEvent.click(screen.getByRole("button", { name: /strategist/i }));
      fireEvent.change(screen.getByPlaceholderText(/enter your research question/i), {
        target: { value: "strategic query" },
      });
      await waitFor(() => {
        expect(screen.getByRole("button", { name: /run query/i })).not.toBeDisabled();
      });
      fireEvent.click(screen.getByRole("button", { name: /run query/i }));

      await waitFor(() => {
        expect(mockExecuteWorkflow).toHaveBeenCalledWith(
          expect.objectContaining({
            mode: "Strategist",
            queryText: "strategic query",
          }),
        );
      });
    });

    it("updates query with report after workflow completes", async () => {
      renderPage();

      fireEvent.change(screen.getByPlaceholderText(/enter your research question/i), {
        target: { value: "test query" },
      });
      await waitFor(() => {
        expect(screen.getByRole("button", { name: /run query/i })).not.toBeDisabled();
      });
      fireEvent.click(screen.getByRole("button", { name: /run query/i }));

      await waitFor(() => {
        expect(mockExecuteWorkflow).toHaveBeenCalled();
      });

      // Should update workspace with query that has a report
      await waitFor(() => {
        expect(mockUpdateWorkspace).toHaveBeenCalled();
      });

      const updateCalls = mockUpdateWorkspace.mock.calls;
      const lastUpdate = updateCalls[updateCalls.length - 1][0];
      const updatedQuery = lastUpdate.queries.find((q: { id: string }) => q.id === "query_backend_1");

      expect(updatedQuery).toBeDefined();
      expect(updatedQuery.report).toBeDefined();
      expect(updatedQuery.report.sections).toHaveLength(1);
      expect(updatedQuery.report.sections[0].title).toBe("Background");
      expect(updatedQuery.report.sections[0].content).toBe("AMPK research overview");
    });
  });
});
