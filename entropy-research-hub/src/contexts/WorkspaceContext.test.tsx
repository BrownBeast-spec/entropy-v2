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
  },
}));

import { workspaceStoreV2 } from "@/lib/storage/workspaceStoreV2";
const mockStoreV2 = workspaceStoreV2 as unknown as {
  getAll: ReturnType<typeof vi.fn>;
  getById: ReturnType<typeof vi.fn>;
  createWorkspace: ReturnType<typeof vi.fn>;
  saveWorkspace: ReturnType<typeof vi.fn>;
  deleteWorkspace: ReturnType<typeof vi.fn>;
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

  it("createWorkspace delegates to workspaceStoreV2 and returns created value", async () => {
    const onReady = vi.fn();
    renderWithProvider(<Harness onReady={onReady} />);

    await waitFor(() => {
      expect(onReady).toHaveBeenCalled();
    });

    const latest = onReady.mock.calls[onReady.mock.calls.length - 1][0];
    const created = await act(async () =>
      latest.actions.createWorkspace("WS", "desc", "Strategist"),
    );

    expect(mockStoreV2.createWorkspace).toHaveBeenCalledWith(
      "WS",
      "desc",
      "Strategist",
    );
    expect(created.id).toBe("ws_1");
  });
});
