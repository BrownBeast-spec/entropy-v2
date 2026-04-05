import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import WorkspaceView from "./WorkspaceView";

const mockSetCurrentWorkspace = vi.fn();
const mockKgPanel = vi.fn();

const baseWorkspace = {
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
  queries: [],
  savedItems: [],
  report: {
    workspaceId: "ws_1",
    generatedAt: new Date("2026-04-01T00:00:00Z"),
    wordCount: 10,
    graphNodeCountAtGeneration: 1,
    sections: [
      {
        title: "Overview",
        content: "x",
        citations: [{ id: "c1", nodeId: "N1", source: "Open Targets", label: "OT:N1" }],
      },
    ],
  },
};

vi.mock("@/contexts/WorkspaceContext", () => ({
  useWorkspace: () => ({
    currentWorkspace: baseWorkspace,
    setCurrentWorkspace: mockSetCurrentWorkspace,
    workspaces: [baseWorkspace],
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
  default: (props: unknown) => {
    mockKgPanel(props);
    return <div data-testid="kg-panel" />;
  },
}));

vi.mock("@/components/workspace/IntermediateReportPanel", () => ({
  default: ({ onCitationClick }: { onCitationClick?: (nodeId: string) => void }) => (
    <button onClick={() => onCitationClick?.("N1")}>Trigger Citation</button>
  ),
}));

vi.mock("@/components/workspace/ResearchProgressOverlay", () => ({
  default: () => <div data-testid="progress-overlay" />,
}));

vi.mock("@/components/workspace/EntityDetailDrawer", () => ({
  default: () => null,
}));

describe("WorkspaceView citation linking", () => {
  it("highlights cited node in knowledge graph when report citation is clicked", () => {
    render(
      <MemoryRouter initialEntries={["/workspaces/ws_1"]}>
        <Routes>
          <Route path="/workspaces/:id" element={<WorkspaceView />} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("button", { name: /Trigger Citation/i }));

    const lastCall = mockKgPanel.mock.calls.at(-1)?.[0] as {
      highlightedNodes?: string[];
    };
    expect(lastCall.highlightedNodes).toEqual(["N1"]);
  });
});
