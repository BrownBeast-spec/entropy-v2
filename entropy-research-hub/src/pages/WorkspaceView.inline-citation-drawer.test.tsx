import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import WorkspaceView from "./WorkspaceView";

const mockSetCurrentWorkspace = vi.fn();

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
        content: "Tumor suppressor evidence [N1].",
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
  },
};

vi.mock("@/contexts/WorkspaceContext", () => ({
  useWorkspace: () => ({
    currentWorkspace: baseWorkspace,
    setCurrentWorkspace: mockSetCurrentWorkspace,
    workspaces: [baseWorkspace],
  }),
  useWorkspaceActions: () => ({
    updateWorkspace: vi.fn(),
    removeNode: vi.fn(),
    toggleSavedItem: vi.fn(),
  }),
}));

vi.mock("@/components/workspace/KnowledgeGraphPanel", () => ({
  default: () => <div data-testid="kg-panel" />,
}));

vi.mock("@/components/workspace/EntityDetailDrawer", () => ({
  default: ({ isOpen, node }: { isOpen: boolean; node: { label: string } | null }) =>
    isOpen ? <div>Drawer open: {node?.label}</div> : null,
}));

describe("WorkspaceView inline citation interaction", () => {
  it("opens detail drawer when inline citation is clicked", () => {
    render(
      <MemoryRouter initialEntries={["/workspaces/ws_1"]}>
        <Routes>
          <Route path="/workspaces/:id" element={<WorkspaceView />} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("button", { name: /open citation: ot:n1/i }));

    expect(screen.getByText("Drawer open: TP53")).toBeInTheDocument();
  });
});
