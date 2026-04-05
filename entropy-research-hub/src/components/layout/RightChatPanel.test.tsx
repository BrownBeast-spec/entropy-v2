import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import RightChatPanel from "./RightChatPanel";

const mockSearchWorkspace = vi.fn();
const mockAddNodesToWorkspace = vi.fn();
const mockAddNode = vi.fn();
const mockAddEdge = vi.fn();
const mockUpdateWorkspace = vi.fn();

vi.mock("@/lib/api/search", () => ({
  searchWorkspace: (...args: unknown[]) => mockSearchWorkspace(...args),
}));

vi.mock("@/lib/api/workspace", () => ({
  addNodesToWorkspace: (...args: unknown[]) => mockAddNodesToWorkspace(...args),
}));

vi.mock("@/contexts/WorkspaceContext", () => ({
  useWorkspace: () => ({
    currentWorkspace: {
      id: "test-workspace",
      mode: "Researcher",
      indiaLens: false,
      nodes: [],
      edges: [],
      activeQueryId: "q_1",
      queries: [
        {
          id: "q_1",
          workspaceId: "test-workspace",
          text: "AMPK targets",
          mode: "Researcher",
          indiaLens: false,
          submittedAt: new Date("2026-04-01T00:00:00Z"),
          status: "pending",
          contributedNodes: [],
          contributedEdges: [],
        },
      ],
    },
  }),
  useWorkspaceActions: () => ({
    addNode: mockAddNode,
    addEdge: mockAddEdge,
    updateWorkspace: mockUpdateWorkspace,
  }),
}));

describe("RightChatPanel - Workspace Mode", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderInWorkspace = () =>
    render(
      <MemoryRouter initialEntries={["/workspaces/test-workspace/queries/q_1"]}>
        <RightChatPanel />
      </MemoryRouter>,
    );

  it("should show search UI when in workspace context", () => {
    renderInWorkspace();

    expect(
      screen.getByPlaceholderText(/search mcp data sources/i),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /search/i })).toBeInTheDocument();
  });

  it("should call searchWorkspace API when search submitted", async () => {
    mockSearchWorkspace.mockResolvedValue({
      results: [
        {
          id: "result_1",
          entityId: "ENSG00001",
          entityType: "protein",
          label: "AMPK",
          source: "STRING",
          metadata: {},
          helpfulness: {
            score: 85,
            explanation: "Fills gap",
            gapsFilled: [],
          },
        },
      ],
      executionTime: 100,
      searchedSources: ["STRING"],
    });

    renderInWorkspace();

    const input = screen.getByPlaceholderText(/search mcp data sources/i);
    fireEvent.change(input, { target: { value: "AMPK targets" } });
    fireEvent.click(screen.getByRole("button", { name: /search/i }));

    await waitFor(() => {
      expect(mockSearchWorkspace).toHaveBeenCalledWith(
        expect.objectContaining({
          query: "AMPK targets",
          queryId: "q_1",
        }),
      );
    });

    expect(screen.getByText("AMPK")).toBeInTheDocument();
    expect(screen.getByText(/sources: 1 successful/i)).toBeInTheDocument();
  });

  it("should enable Add Selected button when results checked", async () => {
    mockSearchWorkspace.mockResolvedValue({
      results: [
        {
          id: "result_1",
          entityId: "ENSG00001",
          entityType: "protein",
          label: "AMPK",
          source: "STRING",
          metadata: {},
          helpfulness: {
            score: 85,
            explanation: "Fills gap",
            gapsFilled: [],
          },
        },
      ],
      executionTime: 100,
      searchedSources: ["STRING"],
    });

    renderInWorkspace();

    fireEvent.change(screen.getByPlaceholderText(/search mcp data sources/i), {
      target: { value: "test" },
    });
    fireEvent.click(screen.getByRole("button", { name: /search/i }));

    await waitFor(() => {
      expect(screen.getByText("AMPK")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("checkbox", { name: /select ampk/i }));

    expect(
      screen.getByRole("button", { name: /add selected to graph/i }),
    ).not.toBeDisabled();
  });

  it("should show source diagnostics when some sources are unavailable", async () => {
    mockSearchWorkspace.mockResolvedValue({
      results: [
        {
          id: "result_1",
          entityId: "Q96FL8",
          entityType: "protein",
          label: "Multidrug and toxin extrusion protein 1",
          source: "UniProt",
          metadata: {},
          helpfulness: {
            score: 42,
            explanation: "Novel entity",
            gapsFilled: [],
          },
        },
      ],
      executionTime: 150,
      searchedSources: ["UniProt"],
      sourceDiagnostics: {
        "Open Targets": "Tool unavailable",
        PubMed: "Tool unavailable",
      },
    });

    renderInWorkspace();

    fireEvent.change(screen.getByPlaceholderText(/search mcp data sources/i), {
      target: { value: "metformin" },
    });
    fireEvent.click(screen.getByRole("button", { name: /search/i }));

    await waitFor(() => {
      expect(
        screen.getByText(/sources: 1 successful, 2 unavailable/i),
      ).toBeInTheDocument();
    });
  });

  it("should expose India Lens and timeline filters in workspace sidebar", () => {
    renderInWorkspace();

    expect(screen.getByLabelText(/india lens/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/timeline start/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/timeline end/i)).toBeInTheDocument();
  });

  it("should render notebook chat timeline for each search", async () => {
    mockSearchWorkspace.mockResolvedValue({
      results: [
        {
          id: "result_1",
          entityId: "ENSG00001",
          entityType: "protein",
          label: "AMPK",
          source: "STRING",
          metadata: {},
          helpfulness: {
            score: 85,
            explanation: "Fills gap",
            gapsFilled: [],
          },
        },
      ],
      executionTime: 100,
      searchedSources: ["STRING"],
    });

    renderInWorkspace();

    fireEvent.change(screen.getByPlaceholderText(/search mcp data sources/i), {
      target: { value: "AMPK targets" },
    });
    fireEvent.click(screen.getByRole("button", { name: /^search$/i }));

    await waitFor(() => {
      expect(screen.getByText(/you asked/i)).toBeInTheDocument();
      expect(screen.getByText(/entropy found/i)).toBeInTheDocument();
    });
  });

  it("should allow collapsing and expanding the notebook panel", () => {
    renderInWorkspace();

    fireEvent.click(screen.getByRole("button", { name: /collapse notebook/i }));

    expect(
      screen.queryByPlaceholderText(/search mcp data sources/i),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /expand notebook/i }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /expand notebook/i }));
    expect(
      screen.getByPlaceholderText(/search mcp data sources/i),
    ).toBeInTheDocument();
  });

  it("uses widened notebook panel width token", () => {
    const { container } = renderInWorkspace();

    const panel = container.firstChild as HTMLElement;
    expect(panel.className).toContain("w-[var(--chat-width)]");
  });

  it("keeps search loading state while request is in flight", async () => {
    let resolveSearch: ((value: unknown) => void) | undefined;
    mockSearchWorkspace.mockReturnValue(
      new Promise((resolve) => {
        resolveSearch = resolve;
      }),
    );

    renderInWorkspace();

    fireEvent.change(screen.getByPlaceholderText(/search mcp data sources/i), {
      target: { value: "slow query" },
    });
    fireEvent.click(screen.getByRole("button", { name: /^search$/i }));

    expect(
      screen.getByText(/notebook search in progress/i),
    ).toBeInTheDocument();

    resolveSearch?.({
      results: [],
      executionTime: 10,
      searchedSources: [],
    });

    await waitFor(() => {
      expect(
        screen.queryByText(/notebook search in progress/i),
      ).not.toBeInTheDocument();
    });
  });

  it("renders in-page entry error and no global error block for failed run", async () => {
    mockSearchWorkspace.mockRejectedValueOnce(new Error("Source timeout"));

    renderInWorkspace();

    fireEvent.change(screen.getByPlaceholderText(/search mcp data sources/i), {
      target: { value: "failing query" },
    });
    fireEvent.click(screen.getByRole("button", { name: /^search$/i }));

    await waitFor(() => {
      expect(screen.getByText(/entropy issue/i)).toBeInTheDocument();
      expect(screen.getByText(/source timeout/i)).toBeInTheDocument();
    });

    expect(screen.queryByText(/^Search failed$/i)).not.toBeInTheDocument();
  });

  it("shows onboarding progress to graph augmentation after add", async () => {
    mockSearchWorkspace.mockResolvedValue({
      results: [
        {
          id: "result_1",
          entityId: "ENSG00001",
          entityType: "protein",
          label: "AMPK",
          source: "STRING",
          metadata: {},
          helpfulness: {
            score: 85,
            explanation: "Fills gap",
            gapsFilled: [],
          },
        },
      ],
      executionTime: 120,
      searchedSources: ["STRING"],
    });
    mockAddNodesToWorkspace.mockResolvedValue({
      data: {
        addedNodes: [
          {
            id: "N1",
            label: "AMPK",
            type: "protein",
            source: "STRING",
            metadata: {},
            addedByQuery: "q_1",
          },
        ],
        inferredEdges: [],
      },
    });

    renderInWorkspace();

    fireEvent.change(screen.getByPlaceholderText(/search mcp data sources/i), {
      target: { value: "AMPK" },
    });
    fireEvent.click(screen.getByRole("button", { name: /^search$/i }));

    await waitFor(() => {
      expect(screen.getByText(/fetching from sources/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("checkbox", { name: /select ampk/i }));
    fireEvent.click(
      screen.getByRole("button", { name: /add selected to graph/i }),
    );

    await waitFor(() => {
      expect(
        screen.getByText(/graph augmented with 1 evidence node/i),
      ).toBeInTheDocument();
    });

    expect(mockAddNodesToWorkspace).toHaveBeenCalledWith(
      "test-workspace",
      expect.objectContaining({
        queryId: "q_1",
        inferEdges: true,
        nodes: expect.arrayContaining([
          expect.objectContaining({
            label: "AMPK",
            type: "protein",
            source: "STRING",
          }),
        ]),
      }),
    );
  });

  it("persists query contributed nodes when adding selected evidence", async () => {
    mockSearchWorkspace.mockResolvedValue({
      results: [
        {
          id: "result_1",
          entityId: "ENSG00001",
          entityType: "protein",
          label: "AMPK",
          source: "STRING",
          metadata: {},
          helpfulness: {
            score: 85,
            explanation: "Fills gap",
            gapsFilled: [],
          },
        },
      ],
      executionTime: 120,
      searchedSources: ["STRING"],
    });
    mockAddNodesToWorkspace.mockResolvedValue({
      data: {
        addedNodes: [
          {
            id: "N1",
            label: "AMPK",
            type: "protein",
            source: "STRING",
            metadata: {},
            addedByQuery: "q_1",
          },
        ],
        inferredEdges: [],
      },
    });

    renderInWorkspace();

    fireEvent.change(screen.getByPlaceholderText(/search mcp data sources/i), {
      target: { value: "AMPK" },
    });
    fireEvent.click(screen.getByRole("button", { name: /^search$/i }));

    await waitFor(() => {
      expect(screen.getByText(/fetching from sources/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("checkbox", { name: /select ampk/i }));
    fireEvent.click(
      screen.getByRole("button", { name: /add selected to graph/i }),
    );

    await waitFor(() => {
      expect(mockUpdateWorkspace).toHaveBeenCalled();
    });

    expect(mockUpdateWorkspace).toHaveBeenCalledWith(
      expect.objectContaining({
        queries: expect.arrayContaining([
          expect.objectContaining({
            id: "q_1",
            contributedNodes: expect.arrayContaining(["N1"]),
          }),
        ]),
      }),
    );
  });
});
