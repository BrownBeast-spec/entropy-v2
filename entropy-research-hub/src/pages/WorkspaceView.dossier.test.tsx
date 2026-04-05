import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import WorkspaceView from "./WorkspaceView";

const mockGenerateDossier = vi.fn();

vi.mock("@/lib/api/dossier", () => ({
  generateDossier: (...args: unknown[]) => mockGenerateDossier(...args),
}));

const workspace = {
  id: "ws_1",
  name: "Workspace Alpha",
  description: "desc",
  mode: "Researcher" as const,
  indiaLens: false,
  createdAt: new Date("2026-04-01T00:00:00Z"),
  updatedAt: new Date("2026-04-01T00:00:00Z"),
  nodes: [
    {
      id: "N1",
      label: "TP53",
      type: "protein" as const,
      source: "Open Targets" as const,
      metadata: {},
      addedByQuery: "q1",
    },
  ],
  edges: [],
  queries: [
    {
      id: "q1",
      workspaceId: "ws_1",
      text: "Repurpose metformin for NASH in Indian population",
      mode: "Researcher" as const,
      indiaLens: false,
      submittedAt: new Date("2026-04-01T00:00:00Z"),
      status: "complete" as const,
      contributedNodes: ["N1"],
      contributedEdges: [],
    },
  ],
  savedItems: [],
  report: {
    workspaceId: "ws_1",
    sections: [
      {
        title: "Overview",
        content: "Metformin shows evidence",
        citations: [
          {
            id: "c1",
            nodeId: "N1",
            source: "Open Targets",
            label: "OT:N1",
          },
        ],
      },
    ],
    generatedAt: new Date("2026-04-01T00:00:00Z"),
    wordCount: 4,
  },
};

vi.mock("@/contexts/WorkspaceContext", () => ({
  useWorkspace: () => ({
    currentWorkspace: workspace,
    setCurrentWorkspace: vi.fn(),
    workspaces: [workspace],
  }),
  useWorkspaceActions: () => ({
    addNode: vi.fn(),
    addEdge: vi.fn(),
    addQuery: vi.fn(),
    updateQuery: vi.fn(),
    updateWorkspace: vi.fn(),
    removeNode: vi.fn(),
    toggleSavedItem: vi.fn(),
    getGraphSnapshot: vi.fn(() => ({ nodeIds: ["N1"], edgeSummary: [] })),
  }),
}));

vi.mock("@/components/workspace/KnowledgeGraphPanel", () => ({
  default: () => <div data-testid="kg-panel" />,
}));
vi.mock("@/components/workspace/ResearchProgressOverlay", () => ({
  default: () => <div data-testid="progress-overlay" />,
}));
vi.mock("@/components/workspace/EntityDetailDrawer", () => ({
  default: () => null,
}));

describe("WorkspaceView dossier generation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls dossier API when Generate Full Dossier is clicked", async () => {
    mockGenerateDossier.mockResolvedValue({
      filename: "dossier-ws_1.tex",
      latex: "\\section*{Overview}",
    });

    render(
      <MemoryRouter initialEntries={["/workspaces/ws_1"]}>
        <Routes>
          <Route path="/workspaces/:id" element={<WorkspaceView />} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.click(
      screen.getByRole("button", { name: /Generate Full Dossier/i }),
    );

    await waitFor(() => {
      expect(mockGenerateDossier).toHaveBeenCalledWith(
        expect.objectContaining({
          workspaceId: "ws_1",
          query: "Repurpose metformin for NASH in Indian population",
          personaMode: "Researcher",
        }),
      );
    });
  });
});
