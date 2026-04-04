import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import WorkspaceView from "./WorkspaceView";

const mockAugmentWorkspace = vi.fn();
const mockFetchSuggestions = vi.fn();
const mockAddNode = vi.fn();
const mockAddEdge = vi.fn();
const mockAddQuery = vi.fn();
const mockUpdateQuery = vi.fn();
const mockUpdateWorkspace = vi.fn();
const mockRemoveNode = vi.fn();
const mockToggleSavedItem = vi.fn();
const mockSetCurrentWorkspace = vi.fn();

vi.mock("@/lib/api/augmentation", () => ({
  augmentWorkspace: (...args: unknown[]) => mockAugmentWorkspace(...args),
}));

vi.mock("@/lib/api/suggestions", () => ({
  fetchFollowupSuggestions: (...args: unknown[]) => mockFetchSuggestions(...args),
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

describe("WorkspaceView query lifecycle", () => {
  let nowSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetchSuggestions.mockResolvedValue([
      "What Indian trials are active for this mechanism?",
      "Which safety signals are emerging?",
      "What competitor assets are nearby?",
    ]);
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
  });

  it("marks query failed when augment request throws", async () => {
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
});
