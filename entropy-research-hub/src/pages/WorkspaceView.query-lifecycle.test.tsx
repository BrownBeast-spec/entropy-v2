import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import WorkspaceView from "./WorkspaceView";

const mockAugmentWorkspace = vi.fn();
const mockFetchSuggestions = vi.fn();
const mockGenerateSynthesis = vi.fn();
const mockAddNode = vi.fn();
const mockAddEdge = vi.fn();
const mockAddQuery = vi.fn();
const mockUpdateQuery = vi.fn();
const mockUpdateWorkspace = vi.fn();
const mockRemoveNode = vi.fn();
const mockToggleSavedItem = vi.fn();
const mockSetCurrentWorkspace = vi.fn();
const mockKgPanel = vi.fn();

vi.mock("@/lib/api/augmentation", () => ({
  augmentWorkspace: (...args: unknown[]) => mockAugmentWorkspace(...args),
}));

vi.mock("@/lib/api/suggestions", () => ({
  fetchFollowupSuggestions: (...args: unknown[]) =>
    mockFetchSuggestions(...args),
}));

vi.mock("@/lib/api/synthesis", () => ({
  generateSynthesis: (...args: unknown[]) => mockGenerateSynthesis(...args),
}));

const baseWorkspace = {
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
    addNode: mockAddNode,
    addEdge: mockAddEdge,
    addQuery: mockAddQuery,
    updateQuery: mockUpdateQuery,
    updateWorkspace: mockUpdateWorkspace,
    removeNode: mockRemoveNode,
    toggleSavedItem: mockToggleSavedItem,
    getGraphSnapshot: vi.fn(() => ({ nodeIds: [], edgeSummary: [] })),
  }),
}));

vi.mock("@/components/workspace/KnowledgeGraphPanel", () => ({
  default: (props: unknown) => {
    mockKgPanel(props);
    return <div data-testid="kg-panel" />;
  },
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

describe("WorkspaceView query lifecycle", () => {
  let nowSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    baseWorkspace.mode = "Researcher";
    baseWorkspace.indiaLens = false;
    baseWorkspace.nodes = [];
    baseWorkspace.edges = [];
    baseWorkspace.queries = [];

    mockAddNode.mockImplementation((node) => {
      baseWorkspace.nodes = [...baseWorkspace.nodes, node];
    });
    mockAddEdge.mockImplementation((edge) => {
      baseWorkspace.edges = [...baseWorkspace.edges, edge];
    });

    mockFetchSuggestions.mockResolvedValue([
      "What Indian trials are active for this mechanism?",
      "Which safety signals are emerging?",
      "What competitor assets are nearby?",
    ]);
    mockGenerateSynthesis.mockResolvedValue({
      sections: [
        {
          title: "Overview",
          content: "Metformin shows relevant evidence.",
          citations: [
            { id: "c1", nodeId: "N1", source: "Open Targets", label: "OT:N1" },
          ],
        },
      ],
    });
    let tick = 1000;
    nowSpy = vi.spyOn(Date, "now").mockImplementation(() => {
      tick += 1;
      return tick;
    });
  });

  afterEach(() => {
    nowSpy.mockRestore();
  });

  it("updates query to complete with contributions and metrics on successful augment", async () => {
    mockAugmentWorkspace.mockResolvedValue({
      newNodes: [{ id: "N1", label: "Node 1", type: "protein", data: {} }],
      newEdges: [
        {
          id: "E1",
          source: "N1",
          target: "N2",
          type: "association",
          confidence: 0.75,
        },
      ],
      completenessScore: 86,
      iterationsRun: 2,
      failedSources: [],
    });

    render(
      <MemoryRouter initialEntries={["/workspaces/ws_1"]}>
        <Routes>
          <Route path="/workspaces/:id" element={<WorkspaceView />} />
        </Routes>
      </MemoryRouter>,
    );

    const input = screen.getByRole("textbox");

    await act(async () => {
      fireEvent.change(input, {
        target: { value: "Repurpose metformin for NASH" },
      });
      fireEvent.click(screen.getByRole("button", { name: /Submit Query/i }));
    });

    await waitFor(() => {
      expect(mockAddQuery).toHaveBeenCalled();
      expect(mockAugmentWorkspace).toHaveBeenCalled();
      expect(mockUpdateQuery).toHaveBeenCalled();
      expect(mockFetchSuggestions).toHaveBeenCalled();
      expect(mockGenerateSynthesis).toHaveBeenCalled();
      expect(mockUpdateWorkspace).toHaveBeenCalled();
    });

    const completeUpdate = mockUpdateQuery.mock.calls
      .map((call) => call[0])
      .find((q) => q.status === "complete");

    expect(completeUpdate).toBeDefined();
    expect(completeUpdate.contributedNodes).toContain("N1");
    expect(completeUpdate.contributedEdges).toContain("E1");
    expect(completeUpdate.completenessScore).toBe(86);
    expect(completeUpdate.iterations).toBe(2);
    expect(
      screen.getByRole("button", {
        name: /What Indian trials are active for this mechanism\?/i,
      }),
    ).toBeInTheDocument();

    const reportWorkspaceUpdate = mockUpdateWorkspace.mock.calls
      .map((call) => call[0])
      .find((ws) => ws?.report?.sections?.[0]?.title === "Overview");

    expect(reportWorkspaceUpdate).toBeDefined();
    expect(reportWorkspaceUpdate.report.sections).toHaveLength(1);
  });

  it("marks query failed and shows offline fallback notice when augment request throws", async () => {
    mockAugmentWorkspace.mockRejectedValue(new Error("network down"));

    render(
      <MemoryRouter initialEntries={["/workspaces/ws_1"]}>
        <Routes>
          <Route path="/workspaces/:id" element={<WorkspaceView />} />
        </Routes>
      </MemoryRouter>,
    );

    const input = screen.getByRole("textbox");

    await act(async () => {
      fireEvent.change(input, {
        target: { value: "Repurpose metformin for NASH" },
      });
      fireEvent.click(screen.getByRole("button", { name: /Submit Query/i }));
    });

    await waitFor(() => {
      expect(mockUpdateQuery).toHaveBeenCalled();
    });

    const failedUpdate = mockUpdateQuery.mock.calls
      .map((call) => call[0])
      .find((q) => q.status === "failed");

    expect(failedUpdate).toBeDefined();
    expect(
      screen.getByText(/Offline.*showing cached data/i),
    ).toBeInTheDocument();
  });

  it("uses the same generated edge ids for graph updates and query contribution metadata", async () => {
    mockAugmentWorkspace.mockResolvedValue({
      newNodes: [],
      newEdges: [
        {
          source: "N1",
          target: "N2",
          type: "association",
          confidence: 0.6,
        },
      ],
      completenessScore: 72,
      iterationsRun: 1,
      failedSources: [],
    });

    render(
      <MemoryRouter initialEntries={["/workspaces/ws_1"]}>
        <Routes>
          <Route path="/workspaces/:id" element={<WorkspaceView />} />
        </Routes>
      </MemoryRouter>,
    );

    const input = screen.getByRole("textbox");

    await act(async () => {
      fireEvent.change(input, {
        target: { value: "Find causal links between N1 and N2" },
      });
      fireEvent.click(screen.getByRole("button", { name: /Submit Query/i }));
    });

    await waitFor(() => {
      expect(mockUpdateQuery).toHaveBeenCalled();
      expect(mockAddEdge).toHaveBeenCalled();
    });

    const completeUpdate = mockUpdateQuery.mock.calls
      .map((call) => call[0])
      .find((q) => q.status === "complete");

    expect(completeUpdate).toBeDefined();
    expect(completeUpdate.contributedEdges).toHaveLength(1);

    const augmentEdgeCall = mockAddEdge.mock.calls
      .map((call) => call[0])
      .find((edge) => edge.source === "N1" && edge.target === "N2");

    expect(augmentEdgeCall).toBeDefined();
    expect(completeUpdate.contributedEdges[0]).toBe(augmentEdgeCall.id);
  });

  it("enriches added nodes with India Lens metadata when indiaLens is enabled", async () => {
    baseWorkspace.indiaLens = true;
    mockAugmentWorkspace.mockResolvedValue({
      newNodes: [{ id: "D1", label: "Metformin", type: "drug", data: {} }],
      newEdges: [],
      completenessScore: 80,
      iterationsRun: 1,
      failedSources: [],
    });

    render(
      <MemoryRouter initialEntries={["/workspaces/ws_1"]}>
        <Routes>
          <Route path="/workspaces/:id" element={<WorkspaceView />} />
        </Routes>
      </MemoryRouter>,
    );

    const input = screen.getByRole("textbox");
    await act(async () => {
      fireEvent.change(input, {
        target: { value: "metformin opportunity in india" },
      });
      fireEvent.click(screen.getByRole("button", { name: /Submit Query/i }));
    });

    await waitFor(() => {
      expect(mockAddNode).toHaveBeenCalled();
    });

    const added = mockAddNode.mock.calls[0][0];
    expect(added.indiaRelevant).toBe(true);
    expect(added.metadata.indiaContext.isCDSCO).toBe(true);

    baseWorkspace.indiaLens = false;
  });

  it("clicking a suggestion chip submits it as a query", async () => {
    mockAugmentWorkspace.mockResolvedValue({
      newNodes: [],
      newEdges: [],
      completenessScore: 60,
      iterationsRun: 1,
      failedSources: [],
    });

    render(
      <MemoryRouter initialEntries={["/workspaces/ws_1"]}>
        <Routes>
          <Route path="/workspaces/:id" element={<WorkspaceView />} />
        </Routes>
      </MemoryRouter>,
    );

    const suggestion =
      "What are the safety signals for long-term metformin use in hepatic impairment?";

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: suggestion }));
    });

    await waitFor(() => {
      expect(mockAugmentWorkspace).toHaveBeenCalledWith(
        expect.objectContaining({ query: suggestion }),
      );
      expect(mockAddQuery).toHaveBeenCalled();
    });
  });

  it("submits cumulative graph snapshot on follow-up query", async () => {
    mockAugmentWorkspace
      .mockResolvedValueOnce({
        newNodes: [{ id: "N1", label: "Node 1", type: "protein", data: {} }],
        newEdges: [],
        completenessScore: 70,
        iterationsRun: 1,
        failedSources: [],
      })
      .mockResolvedValueOnce({
        newNodes: [{ id: "N2", label: "Node 2", type: "protein", data: {} }],
        newEdges: [],
        completenessScore: 78,
        iterationsRun: 1,
        failedSources: [],
      });

    render(
      <MemoryRouter initialEntries={["/workspaces/ws_1"]}>
        <Routes>
          <Route path="/workspaces/:id" element={<WorkspaceView />} />
        </Routes>
      </MemoryRouter>,
    );

    const input = screen.getByRole("textbox");

    await act(async () => {
      fireEvent.change(input, { target: { value: "first query" } });
      fireEvent.click(screen.getByRole("button", { name: /Submit Query/i }));
    });

    await waitFor(() => {
      expect(mockAugmentWorkspace).toHaveBeenCalledTimes(1);
    });

    await act(async () => {
      fireEvent.change(input, { target: { value: "second query" } });
      fireEvent.click(screen.getByRole("button", { name: /Submit Query/i }));
    });

    await waitFor(() => {
      expect(mockAugmentWorkspace).toHaveBeenCalledTimes(2);
    });

    const secondCallPayload = mockAugmentWorkspace.mock.calls[1][0];
    expect(secondCallPayload.graphSnapshot.nodeIds).toContain("N1");
  });

  it("shows query history status/date metadata and still highlights contributed nodes on click", async () => {
    const submittedAt = new Date("2026-04-02T10:15:00.000Z");
    baseWorkspace.nodes = [
      {
        id: "N1",
        label: "Node 1",
        type: "protein",
        source: "Open Targets",
        metadata: {},
        addedByQuery: "query_a",
      },
    ];
    baseWorkspace.queries = [
      {
        id: "query_a",
        workspaceId: baseWorkspace.id,
        text: "first query",
        mode: "Researcher",
        indiaLens: false,
        submittedAt,
        status: "complete",
        contributedNodes: ["N1"],
        contributedEdges: [],
      },
    ];

    render(
      <MemoryRouter initialEntries={["/workspaces/ws_1"]}>
        <Routes>
          <Route path="/workspaces/:id" element={<WorkspaceView />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText(/Status: complete/i)).toBeInTheDocument();
    expect(screen.getByText(/Submitted:/i)).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /first query/i }));
    });

    const lastKgProps = mockKgPanel.mock.calls.at(-1)?.[0] as {
      highlightedNodes?: string[];
    };
    expect(lastKgProps.highlightedNodes).toEqual(["N1"]);
  });

  it("does not auto-seed demo graph after successful augment with empty delta", async () => {
    mockAugmentWorkspace.mockResolvedValue({
      newNodes: [],
      newEdges: [],
      completenessScore: 92,
      iterationsRun: 1,
      failedSources: [],
    });

    render(
      <MemoryRouter initialEntries={["/workspaces/ws_1"]}>
        <Routes>
          <Route path="/workspaces/:id" element={<WorkspaceView />} />
        </Routes>
      </MemoryRouter>,
    );

    const input = screen.getByRole("textbox");

    await act(async () => {
      fireEvent.change(input, {
        target: { value: "no-delta query" },
      });
      fireEvent.click(screen.getByRole("button", { name: /Submit Query/i }));
    });

    await waitFor(() => {
      expect(mockUpdateQuery).toHaveBeenCalledWith(
        expect.objectContaining({ status: "complete" }),
      );
    });

    const addedNodeIds = mockAddNode.mock.calls.map((call) => call[0]?.id);
    expect(addedNodeIds).not.toContain("disease_nash");
    expect(addedNodeIds).not.toContain("drug_metformin");
  });

  it("persists India Lens toggle and passes enabled state to graph panel", async () => {
    baseWorkspace.nodes = [
      {
        id: "D1",
        label: "Metformin",
        type: "drug",
        source: "OpenFDA",
        metadata: { indiaContext: { isCDSCO: true } },
        addedByQuery: "query_1",
        indiaRelevant: true,
      },
    ];

    render(
      <MemoryRouter initialEntries={["/workspaces/ws_1"]}>
        <Routes>
          <Route path="/workspaces/:id" element={<WorkspaceView />} />
        </Routes>
      </MemoryRouter>,
    );

    await act(async () => {
      fireEvent.click(screen.getByRole("checkbox", { name: /India Lens/i }));
    });

    expect(mockUpdateWorkspace).toHaveBeenCalledWith(
      expect.objectContaining({ indiaLens: true }),
    );
  });

  it("shows provenance summary even when graph is empty", () => {
    render(
      <MemoryRouter initialEntries={["/workspaces/ws_1"]}>
        <Routes>
          <Route path="/workspaces/:id" element={<WorkspaceView />} />
        </Routes>
      </MemoryRouter>,
    );

    const provenanceSummary = screen.getByTestId("workspace-provenance-summary");
    expect(provenanceSummary).toHaveTextContent("Graph contains");
    expect(provenanceSummary).toHaveTextContent("0 nodes");
    expect(provenanceSummary).toHaveTextContent("0 edges");
    expect(provenanceSummary).toHaveTextContent("0 sources");
  });
});
