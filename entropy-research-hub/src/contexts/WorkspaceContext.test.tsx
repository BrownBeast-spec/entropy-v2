import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, waitFor } from "@testing-library/react";
import { ReactNode, useEffect } from "react";
import { WorkspaceProvider, useWorkspace, useWorkspaceActions } from "./WorkspaceContext";

vi.mock("@/lib/storage/workspaceStoreV2", () => ({
  workspaceStoreV2: {
    getAll: vi.fn(),
    getById: vi.fn(),
    createWorkspace: vi.fn(),
    saveWorkspace: vi.fn(),
    deleteWorkspace: vi.fn(),
    clear: vi.fn(),
  },
}));

vi.mock("@/lib/storage/workspaceStorage", () => ({
  workspaceStorage: {
    getAll: vi.fn(),
    getById: vi.fn(),
    save: vi.fn(),
    delete: vi.fn(),
    clear: vi.fn(),
  },
}));

vi.mock("@/lib/api/workspace", () => ({
  createWorkspace: vi.fn(),
  getWorkspace: vi.fn(),
  getWorkspaceGraph: vi.fn(),
  getWorkspaceQueries: vi.fn(),
}));

import { workspaceStoreV2 } from "@/lib/storage/workspaceStoreV2";
import { workspaceStorage } from "@/lib/storage/workspaceStorage";
import * as workspaceApi from "@/lib/api/workspace";
const mockStoreV2 = workspaceStoreV2 as unknown as {
  getAll: ReturnType<typeof vi.fn>;
  getById: ReturnType<typeof vi.fn>;
  createWorkspace: ReturnType<typeof vi.fn>;
  saveWorkspace: ReturnType<typeof vi.fn>;
  deleteWorkspace: ReturnType<typeof vi.fn>;
  clear: ReturnType<typeof vi.fn>;
};

const mockLegacyStorage = workspaceStorage as unknown as {
  getAll: ReturnType<typeof vi.fn>;
  getById: ReturnType<typeof vi.fn>;
  save: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
  clear: ReturnType<typeof vi.fn>;
};

const mockWorkspaceApi = workspaceApi as unknown as {
  createWorkspace: ReturnType<typeof vi.fn>;
  getWorkspace: ReturnType<typeof vi.fn>;
  getWorkspaceGraph: ReturnType<typeof vi.fn>;
  getWorkspaceQueries: ReturnType<typeof vi.fn>;
};

function Harness({
  onReady,
}: {
  onReady: (ctx: {
    actions: ReturnType<typeof useWorkspaceActions>;
    state: ReturnType<typeof useWorkspace>;
  }) => void;
}) {
  const actions = useWorkspaceActions();
  const state = useWorkspace();

  useEffect(() => {
    onReady({ actions, state });
  }, [actions, state, onReady]);

  return null;
}

function renderWithProvider(child: ReactNode) {
  return render(<WorkspaceProvider>{child}</WorkspaceProvider>);
}

describe("WorkspaceContext", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const empty = [];
    mockStoreV2.getAll.mockResolvedValue(empty);
    mockStoreV2.getById.mockResolvedValue(null);
    mockStoreV2.createWorkspace.mockResolvedValue({
      id: "ws_1",
      name: "WS",
      description: "",
      mode: "Researcher",
      indiaLens: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      nodes: [],
      edges: [],
      queries: [],
      savedItems: [],
    });
    mockStoreV2.saveWorkspace.mockResolvedValue(undefined);
    mockStoreV2.deleteWorkspace.mockResolvedValue(undefined);
    mockStoreV2.clear.mockResolvedValue(undefined);

    mockLegacyStorage.getAll.mockReturnValue([]);
    mockLegacyStorage.getById.mockReturnValue(null);
    mockLegacyStorage.save.mockReturnValue(undefined);
    mockLegacyStorage.delete.mockReturnValue(undefined);
    mockLegacyStorage.clear.mockReturnValue(undefined);

    mockWorkspaceApi.createWorkspace.mockResolvedValue({
      success: true,
      data: {
        id: "ws_backend_1",
        name: "WS",
        description: "desc",
        mode: "Strategist",
        indiaLens: false,
        createdAt: "2026-04-01T00:00:00.000Z",
      },
    });
    mockWorkspaceApi.getWorkspace.mockResolvedValue({
      success: true,
      data: {
        id: "ws_backend_1",
        name: "WS",
        description: "desc",
        mode: "Strategist",
        indiaLens: false,
        createdAt: "2026-04-01T00:00:00.000Z",
      },
    });
    mockWorkspaceApi.getWorkspaceGraph.mockResolvedValue({
      success: true,
      data: { nodes: [], edges: [] },
    });
    mockWorkspaceApi.getWorkspaceQueries.mockResolvedValue({
      success: true,
      data: { queries: [] },
    });
  });

  it("loads workspaces from workspaceStoreV2 on mount", async () => {
    mockStoreV2.getAll.mockResolvedValueOnce([
      {
        id: "ws_1",
        name: "Loaded WS",
        description: "",
        mode: "Researcher",
        indiaLens: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        nodes: [],
        edges: [],
        queries: [],
        savedItems: [],
      },
    ]);

    let latestState: ReturnType<typeof useWorkspace> | null = null;
    renderWithProvider(
      <Harness
        onReady={({ state }) => {
          latestState = state;
        }}
      />,
    );

    await waitFor(() => {
      expect(mockStoreV2.getAll).toHaveBeenCalled();
      expect(latestState?.workspaces[0]?.name).toBe("Loaded WS");
    });
  });

  it("createWorkspace uses backend API and persists workspace", async () => {
    const onReady = vi.fn();
    renderWithProvider(<Harness onReady={onReady} />);

    await waitFor(() => {
      expect(onReady).toHaveBeenCalled();
    });

    const latest = onReady.mock.calls[onReady.mock.calls.length - 1][0];
    const created = await act(async () =>
      latest.actions.createWorkspace("WS", "desc", "Strategist"),
    );

    expect(mockWorkspaceApi.createWorkspace).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "WS",
        description: "desc",
        mode: "Strategist",
      }),
    );
    expect(mockStoreV2.saveWorkspace).toHaveBeenCalled();
    expect(created.id).toBe("ws_backend_1");
  });

  it("seeds demo workspace when storage is empty", async () => {
    let latestState: ReturnType<typeof useWorkspace> | null = null;
    renderWithProvider(
      <Harness
        onReady={({ state }) => {
          latestState = state;
        }}
      />,
    );

    await waitFor(() => {
      expect(mockStoreV2.saveWorkspace).toHaveBeenCalledTimes(1);
      expect(latestState?.workspaces.length).toBe(1);
    });

    const seededWorkspace = latestState?.workspaces[0];
    expect(seededWorkspace?.id).toBe("ws_demo_metformin_nash");
    expect(seededWorkspace?.name).toBe("Metformin NASH Demo Workspace");
    expect(seededWorkspace?.createdAt.toISOString()).toBe(
      "2026-04-01T00:00:00.000Z",
    );
    expect(seededWorkspace?.updatedAt.toISOString()).toBe(
      "2026-04-01T00:00:00.000Z",
    );
    expect(seededWorkspace?.nodes.length).toBeGreaterThan(0);
    expect(seededWorkspace?.edges.length).toBeGreaterThan(0);
    expect(seededWorkspace?.queries.length).toBeGreaterThan(0);
    expect(seededWorkspace?.queries[0]?.id).toBe("demo_query_1");
    expect(seededWorkspace?.report?.sections.length).toBeGreaterThan(0);
  });

  it("resetToDemoState clears persisted state and restores demo workspace", async () => {
    mockStoreV2.getAll.mockResolvedValueOnce([
      {
        id: "ws_existing",
        name: "Existing Workspace",
        description: "",
        mode: "Researcher",
        indiaLens: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        nodes: [],
        edges: [],
        queries: [],
        savedItems: [],
      },
    ]);

    let latestCtx:
      | {
          actions: ReturnType<typeof useWorkspaceActions>;
          state: ReturnType<typeof useWorkspace>;
        }
      | null = null;

    renderWithProvider(
      <Harness
        onReady={(ctx) => {
          latestCtx = ctx;
        }}
      />,
    );

    await waitFor(() => {
      expect(latestCtx).not.toBeNull();
      expect(latestCtx?.state.workspaces[0]?.id).toBe("ws_existing");
    });

    await act(async () => {
      await latestCtx?.actions.resetToDemoState();
    });

    await waitFor(() => {
      expect(mockStoreV2.clear).toHaveBeenCalledTimes(1);
      expect(mockStoreV2.saveWorkspace).toHaveBeenCalled();
      expect(latestCtx?.state.workspaces.length).toBe(1);
      expect(latestCtx?.state.workspaces[0]?.id).toBe("ws_demo_metformin_nash");
      expect(latestCtx?.state.workspaces[0]?.name).toBe("Metformin NASH Demo Workspace");
      expect(latestCtx?.state.currentWorkspace?.id).toBe("ws_demo_metformin_nash");
    });

    const persistedDemoPayload = mockStoreV2.saveWorkspace.mock.calls[0][0];
    expect(persistedDemoPayload.nodes[0]?.source).toBeTruthy();
    expect(persistedDemoPayload.nodes[0]?.evidenceScore).toBeTruthy();
    expect(persistedDemoPayload.edges[0]?.metadata).toBeTruthy();
    const persistedNodeIds = new Set(
      persistedDemoPayload.nodes.map((node: { id: string }) => node.id),
    );
    expect(
      persistedDemoPayload.edges.every(
        (edge: { source: string; target: string }) =>
          persistedNodeIds.has(edge.source) && persistedNodeIds.has(edge.target),
      ),
    ).toBe(true);
  });

  it("resetToDemoState falls back to legacy storage when v2 reset fails", async () => {
    mockStoreV2.getAll.mockResolvedValueOnce([
      {
        id: "ws_existing",
        name: "Existing Workspace",
        description: "",
        mode: "Researcher",
        indiaLens: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        nodes: [],
        edges: [],
        queries: [],
        savedItems: [],
      },
    ]);
    mockStoreV2.clear.mockRejectedValueOnce(new Error("v2-clear-failed"));

    let latestCtx:
      | {
          actions: ReturnType<typeof useWorkspaceActions>;
          state: ReturnType<typeof useWorkspace>;
        }
      | null = null;

    renderWithProvider(
      <Harness
        onReady={(ctx) => {
          latestCtx = ctx;
        }}
      />,
    );

    await waitFor(() => {
      expect(latestCtx?.state.workspaces[0]?.id).toBe("ws_existing");
    });

    await act(async () => {
      await latestCtx?.actions.resetToDemoState();
    });

    await waitFor(() => {
      expect(mockStoreV2.clear).toHaveBeenCalledTimes(1);
      expect(mockLegacyStorage.clear).toHaveBeenCalledTimes(1);
      expect(mockLegacyStorage.save).toHaveBeenCalledTimes(1);
      expect(latestCtx?.state.currentWorkspace?.id).toBe("ws_demo_metformin_nash");
    });
  });

  it("normalizes activeQueryId and query-level report from legacy workspace shape", async () => {
    const now = new Date("2026-04-01T00:00:00.000Z");
    mockStoreV2.getAll.mockResolvedValueOnce([
      {
        id: "ws_legacy",
        name: "Legacy WS",
        description: "legacy",
        mode: "Strategist",
        indiaLens: true,
        createdAt: now,
        updatedAt: now,
        nodes: [],
        edges: [],
        queries: [
          {
            id: "q_legacy",
            workspaceId: "ws_legacy",
            text: "legacy query",
            mode: "Strategist",
            indiaLens: true,
            submittedAt: now,
            status: "complete",
            contributedNodes: [],
            contributedEdges: [],
          },
        ],
        savedItems: [],
        report: {
          workspaceId: "ws_legacy",
          sections: [{ title: "Overview", content: "legacy report", citations: [] }],
          generatedAt: now,
          wordCount: 2,
        },
      },
    ]);

    let latestState: ReturnType<typeof useWorkspace> | null = null;

    renderWithProvider(
      <Harness
        onReady={({ state }) => {
          latestState = state;
        }}
      />,
    );

    await waitFor(() => {
      expect(latestState?.workspaces[0]?.activeQueryId).toBe("q_legacy");
      expect(latestState?.workspaces[0]?.queries[0]?.report).toBeDefined();
    });
  });

  it("hydrates current workspace graph from backend when selected", async () => {
    const now = new Date("2026-04-01T00:00:00.000Z");

    mockStoreV2.getAll.mockResolvedValueOnce([
      {
        id: "ws_backend_2",
        name: "Backend Workspace",
        description: "from store",
        mode: "Researcher",
        indiaLens: false,
        createdAt: now,
        updatedAt: now,
        nodes: [],
        edges: [],
        queries: [],
        savedItems: [],
      },
    ]);

    mockWorkspaceApi.getWorkspace.mockResolvedValueOnce({
      success: true,
      data: {
        id: "ws_backend_2",
        name: "Backend Workspace",
        description: "from api",
        mode: "Researcher",
        indiaLens: false,
        createdAt: "2026-04-01T00:00:00.000Z",
      },
    });
    mockWorkspaceApi.getWorkspaceGraph.mockResolvedValueOnce({
      success: true,
      data: {
        nodes: [
          {
            id: "node_backend_1",
            label: "Backend Node",
            type: "drug",
            source: "PubMed",
            metadata: {},
            addedByQuery: "query_backend_1",
          },
        ],
        edges: [],
      },
    });
    mockWorkspaceApi.getWorkspaceQueries.mockResolvedValueOnce({
      success: true,
      data: {
        queries: [
          {
            id: "query_backend_1",
            workspaceId: "ws_backend_2",
            text: "Assess backend hydration",
            mode: "Researcher",
            indiaLens: false,
            submittedAt: "2026-04-02T00:00:00.000Z",
            status: "complete",
            contributedNodes: ["node_backend_1"],
            contributedEdges: [],
            completenessScore: 0.82,
            iterations: 2,
          },
        ],
      },
    });

    let latestCtx:
      | {
          actions: ReturnType<typeof useWorkspaceActions>;
          state: ReturnType<typeof useWorkspace>;
        }
      | null = null;

    renderWithProvider(
      <Harness
        onReady={(ctx) => {
          latestCtx = ctx;
        }}
      />,
    );

    await waitFor(() => {
      expect(latestCtx?.state.workspaces[0]?.id).toBe("ws_backend_2");
    });

    act(() => {
      latestCtx?.state.setCurrentWorkspace(latestCtx.state.workspaces[0]);
    });

    await waitFor(() => {
      expect(latestCtx?.state.currentWorkspace?.nodes).toHaveLength(1);
      expect(latestCtx?.state.currentWorkspace?.nodes[0]?.id).toBe("node_backend_1");
      expect(latestCtx?.state.currentWorkspace?.queries).toHaveLength(1);
      expect(latestCtx?.state.currentWorkspace?.queries[0]?.id).toBe("query_backend_1");
      expect(latestCtx?.state.currentWorkspace?.activeQueryId).toBe("query_backend_1");
    });

    expect(mockWorkspaceApi.getWorkspace).toHaveBeenCalledWith("ws_backend_2");
    expect(mockWorkspaceApi.getWorkspaceGraph).toHaveBeenCalledWith("ws_backend_2");
    expect(mockWorkspaceApi.getWorkspaceQueries).toHaveBeenCalledWith("ws_backend_2");
    expect(mockStoreV2.saveWorkspace).toHaveBeenCalled();
  });

  it("falls back to local queries when backend query list fetch fails", async () => {
    const now = new Date("2026-04-01T00:00:00.000Z");

    mockStoreV2.getAll.mockResolvedValueOnce([
      {
        id: "ws_backend_3",
        name: "Workspace With Local Query",
        description: "from store",
        mode: "Researcher",
        indiaLens: false,
        createdAt: now,
        updatedAt: now,
        nodes: [],
        edges: [],
        queries: [
          {
            id: "query_local_1",
            workspaceId: "ws_backend_3",
            text: "local fallback query",
            mode: "Researcher",
            indiaLens: false,
            submittedAt: now,
            status: "pending",
            contributedNodes: [],
            contributedEdges: [],
          },
        ],
        activeQueryId: "query_local_1",
        savedItems: [],
      },
    ]);

    mockWorkspaceApi.getWorkspace.mockResolvedValueOnce({
      success: true,
      data: {
        id: "ws_backend_3",
        name: "Workspace With Local Query",
        description: "from api",
        mode: "Researcher",
        indiaLens: false,
        createdAt: "2026-04-01T00:00:00.000Z",
      },
    });
    mockWorkspaceApi.getWorkspaceGraph.mockResolvedValueOnce({
      success: true,
      data: {
        nodes: [],
        edges: [],
      },
    });
    mockWorkspaceApi.getWorkspaceQueries.mockRejectedValueOnce(
      new Error("Query list unavailable"),
    );

    let latestCtx:
      | {
          actions: ReturnType<typeof useWorkspaceActions>;
          state: ReturnType<typeof useWorkspace>;
        }
      | null = null;

    renderWithProvider(
      <Harness
        onReady={(ctx) => {
          latestCtx = ctx;
        }}
      />,
    );

    await waitFor(() => {
      expect(latestCtx?.state.workspaces[0]?.id).toBe("ws_backend_3");
    });

    act(() => {
      latestCtx?.state.setCurrentWorkspace(latestCtx.state.workspaces[0]);
    });

    await waitFor(() => {
      expect(latestCtx?.state.currentWorkspace?.queries).toHaveLength(1);
      expect(latestCtx?.state.currentWorkspace?.queries[0]?.id).toBe("query_local_1");
      expect(latestCtx?.state.currentWorkspace?.activeQueryId).toBe("query_local_1");
    });

    expect(mockWorkspaceApi.getWorkspace).toHaveBeenCalledWith("ws_backend_3");
    expect(mockWorkspaceApi.getWorkspaceGraph).toHaveBeenCalledWith("ws_backend_3");
    expect(mockWorkspaceApi.getWorkspaceQueries).toHaveBeenCalledWith("ws_backend_3");
  });
});
