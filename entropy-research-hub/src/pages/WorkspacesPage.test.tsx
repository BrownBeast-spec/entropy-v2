import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import WorkspacesPage from "./WorkspacesPage";

const mockNavigate = vi.fn();
const mockUseWorkspace = vi.fn();
const mockUseWorkspaceActions = vi.fn();
const mockCreateWorkspace = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock("@/contexts/WorkspaceContext", () => ({
  useWorkspace: () => mockUseWorkspace(),
  useWorkspaceActions: () => mockUseWorkspaceActions(),
}));

describe("WorkspacesPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockUseWorkspace.mockReturnValue({
      workspaces: [
        {
          id: "ws_1",
          name: "Workspace Alpha",
          description: "first",
          mode: "Researcher",
          indiaLens: false,
          createdAt: new Date("2026-04-01T10:00:00Z"),
          updatedAt: new Date("2026-04-02T10:00:00Z"),
          nodes: [{ id: "n1" }],
          edges: [],
          queries: [
            {
              id: "q1",
              text: "Find NASH targets",
            },
          ],
          savedItems: [],
        },
      ],
    });

    mockCreateWorkspace.mockReturnValue({ id: "ws_new" });
    mockUseWorkspaceActions.mockReturnValue({
      createWorkspace: mockCreateWorkspace,
    });
  });

  it("renders workspace rows from context instead of static dummy list", () => {
    render(
      <MemoryRouter>
        <WorkspacesPage />
      </MemoryRouter>,
    );

    expect(screen.getByText("Workspace Alpha")).toBeInTheDocument();
    expect(screen.getByText("Find NASH targets")).toBeInTheDocument();
  });

  it("creates workspace using context action and navigates to workspace view", async () => {
    render(
      <MemoryRouter>
        <WorkspacesPage />
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByPlaceholderText(/Metformin NASH Pipeline Analysis/i), {
      target: { value: "Metformin India Lens" },
    });

    fireEvent.change(screen.getByPlaceholderText(/Brief description/i), {
      target: { value: "Regulatory + target evidence" },
    });

    fireEvent.click(screen.getByRole("button", { name: /Strategist/i }));
    fireEvent.click(
      screen.getByRole("button", { name: /Create and start researching/i }),
    );

    await waitFor(() => {
      expect(mockCreateWorkspace).toHaveBeenCalledWith(
        "Metformin India Lens",
        "Regulatory + target evidence",
        "Strategist",
      );
      expect(mockNavigate).toHaveBeenCalledWith("/workspaces/ws_new");
    });
  });

  it("navigates to workspace detail when clicking a workspace row", () => {
    render(
      <MemoryRouter>
        <WorkspacesPage />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByText("Workspace Alpha"));
    expect(mockNavigate).toHaveBeenCalledWith("/workspaces/ws_1");
  });

  it("shows mode from latest query session when available", () => {
    mockUseWorkspace.mockReturnValueOnce({
      workspaces: [
        {
          id: "ws_2",
          name: "Workspace Query Mode",
          description: "query mode",
          createdAt: new Date("2026-04-01T10:00:00Z"),
          updatedAt: new Date("2026-04-02T10:00:00Z"),
          nodes: [],
          edges: [],
          queries: [
            {
              id: "q1",
              workspaceId: "ws_2",
              text: "first",
              mode: "Researcher",
              indiaLens: false,
              submittedAt: new Date("2026-04-01T10:00:00Z"),
              status: "complete",
              contributedNodes: [],
              contributedEdges: [],
            },
            {
              id: "q2",
              workspaceId: "ws_2",
              text: "latest",
              mode: "Strategist",
              indiaLens: false,
              submittedAt: new Date("2026-04-03T10:00:00Z"),
              status: "complete",
              contributedNodes: [],
              contributedEdges: [],
            },
          ],
          activeQueryId: "q2",
          savedItems: [],
        },
      ],
    });

    render(
      <MemoryRouter>
        <WorkspacesPage />
      </MemoryRouter>,
    );

    expect(screen.getByText("Workspace Query Mode")).toBeInTheDocument();
    expect(screen.getAllByText("Strategist").length).toBeGreaterThan(0);
    expect(screen.getByText("latest")).toBeInTheDocument();
  });
});
