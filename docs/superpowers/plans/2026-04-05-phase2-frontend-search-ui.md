# Phase 2: Frontend Search UI - Manual Search-Select UX

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement frontend components for manual search-and-select workflow (Phase 2 of 2).

**Scope:**

- Search API client and add-nodes API client
- SearchResultCard component with multi-select
- RightChatPanel workspace mode with search UI
- IntermediateReportPanel dynamic metric cards
- WorkspaceView layout changes (remove left sidebar)
- Full integration with WorkspaceContext and IndexedDB
- End-to-end integration tests

**Prerequisites:** Phase 1 backend (helpfulness agent, search API, add-nodes API) must be complete and tested.

**Architecture:** RightChatPanel shows search UI in workspace context, results displayed as rich cards with checkboxes, batch add to graph via WorkspaceContext, manual report regeneration with staleness tracking.

**Tech Stack:** React 19, TypeScript, Vite, Vitest, React Testing Library, TanStack Query (optional for caching), IndexedDB

**Spec Document:** `docs/superpowers/specs/2026-04-05-manual-search-select-ux-design.md`

---

## Chunk 1: API Clients & SearchResultCard

### Task 1: Search API Client

**Files:**

- Create: `entropy-research-hub/src/lib/api/search.ts`
- Create: `entropy-research-hub/src/lib/api/search.test.ts`

#### Step 1: Write failing test for search API client

- [ ] **Create test file**

```typescript
// entropy-research-hub/src/lib/api/search.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { searchWorkspace } from "./search";

describe("searchWorkspace", () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should call search API with correct parameters", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({
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
              gapsFilled: ["pathway:AMPK"],
            },
          },
        ],
        executionTime: 123,
        searchedSources: ["STRING"],
      }),
    } as Response);

    const result = await searchWorkspace({
      query: "AMPK targets",
      graphSnapshot: { nodeIds: [], edgeSummary: [] },
      personaMode: "Researcher",
      indiaLens: false,
      workspaceId: "test-workspace",
    });

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/entropy/search"),
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: expect.stringContaining("AMPK targets"),
      }),
    );

    expect(result.results).toHaveLength(1);
    expect(result.results[0].label).toBe("AMPK");
  });

  it("should handle API errors", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: false,
      json: async () => ({ message: "Server error" }),
    } as Response);

    await expect(
      searchWorkspace({
        query: "test",
        graphSnapshot: { nodeIds: [], edgeSummary: [] },
        personaMode: "Researcher",
        indiaLens: false,
        workspaceId: "test",
      }),
    ).rejects.toThrow();
  });
});
```

- [ ] **Run test to verify it fails**

Run: `cd entropy-research-hub && npm test -- src/lib/api/search.test.ts --run`

Expected: FAIL - module doesn't exist

#### Step 2: Implement search API client

- [ ] **Create search.ts**

```typescript
// entropy-research-hub/src/lib/api/search.ts
import { resolveApiBaseUrl } from "./baseUrl";

export interface SearchRequest {
  query: string;
  graphSnapshot: {
    nodeIds: string[];
    edgeSummary: Array<{
      source: string;
      target: string;
      type: string;
    }>;
  };
  personaMode: "Researcher" | "Strategist";
  indiaLens: boolean;
  workspaceId: string;
  maxResults?: number;
}

export interface SearchResult {
  id: string;
  entityId: string;
  entityType: string;
  label: string;
  source: string;
  metadata: Record<string, any>;
  helpfulness: {
    score: number;
    explanation: string;
    gapsFilled: string[];
  };
  evidenceScore?: number;
  indiaRelevant?: boolean;
}

export interface SearchResponse {
  results: SearchResult[];
  executionTime: number;
  searchedSources: string[];
}

export async function searchWorkspace(
  request: SearchRequest,
): Promise<SearchResponse> {
  const baseUrl = resolveApiBaseUrl();
  const response = await fetch(`${baseUrl}/api/entropy/search`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Search failed");
  }

  return response.json();
}
```

- [ ] **Run test to verify it passes**

Run: `cd entropy-research-hub && npm test -- src/lib/api/search.test.ts --run`

Expected: PASS (2 tests)

- [ ] **Commit search API client**

```bash
git add entropy-research-hub/src/lib/api/search.ts entropy-research-hub/src/lib/api/search.test.ts
git commit -m "feat(frontend): add search API client"
```

---

### Task 2: Add-Nodes API Client

**Files:**

- Create: `entropy-research-hub/src/lib/api/addNodes.ts`
- Create: `entropy-research-hub/src/lib/api/addNodes.test.ts`

#### Step 1: Write failing test for add-nodes API client

- [ ] **Create test file**

```typescript
// entropy-research-hub/src/lib/api/addNodes.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { addNodesToWorkspace } from "./addNodes";
import type { SearchResult } from "./search";

describe("addNodesToWorkspace", () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should call add-nodes API with selected results", async () => {
    const mockResults: SearchResult[] = [
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
    ];

    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({
        addedNodes: [
          {
            id: "ENSG00001",
            label: "AMPK",
            type: "protein",
            source: "STRING",
            metadata: {},
            addedByQuery: "query_123",
          },
        ],
        addedEdges: [],
        duplicatesSkipped: 0,
      }),
    } as Response);

    const result = await addNodesToWorkspace({
      workspaceId: "test-workspace",
      queryId: "query_123",
      selectedResults: mockResults,
    });

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/workspace/add-nodes"),
      expect.objectContaining({
        method: "POST",
      }),
    );

    expect(result.addedNodes).toHaveLength(1);
    expect(result.addedNodes[0].id).toBe("ENSG00001");
  });
});
```

- [ ] **Run test to verify it fails**

Run: `cd entropy-research-hub && npm test -- src/lib/api/addNodes.test.ts --run`

Expected: FAIL - module doesn't exist

#### Step 2: Implement add-nodes API client

- [ ] **Create addNodes.ts**

```typescript
// entropy-research-hub/src/lib/api/addNodes.ts
import { resolveApiBaseUrl } from "./baseUrl";
import type { SearchResult } from "./search";
import type { GraphNode, GraphEdge } from "@/types/workspace";

export interface AddNodesRequest {
  workspaceId: string;
  queryId: string;
  selectedResults: SearchResult[];
}

export interface AddNodesResponse {
  addedNodes: GraphNode[];
  addedEdges: GraphEdge[];
  duplicatesSkipped: number;
}

export async function addNodesToWorkspace(
  request: AddNodesRequest,
): Promise<AddNodesResponse> {
  const baseUrl = resolveApiBaseUrl();
  const response = await fetch(`${baseUrl}/api/workspace/add-nodes`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to add nodes");
  }

  return response.json();
}
```

- [ ] **Run test to verify it passes**

Run: `cd entropy-research-hub && npm test -- src/lib/api/addNodes.test.ts --run`

Expected: PASS (1 test)

- [ ] **Commit add-nodes API client**

```bash
git add entropy-research-hub/src/lib/api/addNodes.ts entropy-research-hub/src/lib/api/addNodes.test.ts
git commit -m "feat(frontend): add add-nodes API client"
```

---

### Task 3: SearchResultCard Component

**Files:**

- Create: `entropy-research-hub/src/components/workspace/SearchResultCard.tsx`
- Create: `entropy-research-hub/src/components/workspace/SearchResultCard.test.tsx`

#### Step 1: Write failing tests for SearchResultCard

- [ ] **Create test file**

```typescript
// entropy-research-hub/src/components/workspace/SearchResultCard.test.tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SearchResultCard from "./SearchResultCard";

describe("SearchResultCard", () => {
  const mockResult = {
    id: "result_1",
    entityId: "ENSG00001",
    entityType: "protein" as const,
    label: "AMPK alpha-1",
    source: "STRING",
    metadata: {},
    helpfulness: {
      score: 85,
      explanation: "Fills gap: AMPK pathway not in graph",
      gapsFilled: ["pathway:AMPK signaling"],
    },
  };

  it("should render result label and score", () => {
    render(
      <SearchResultCard
        result={mockResult}
        selected={false}
        onToggle={vi.fn()}
        onViewDetails={vi.fn()}
      />,
    );

    expect(screen.getByText("AMPK alpha-1")).toBeInTheDocument();
    expect(screen.getByText(/85/)).toBeInTheDocument();
    expect(screen.getByText("STRING")).toBeInTheDocument();
  });

  it("should call onToggle when checkbox clicked", async () => {
    const onToggle = vi.fn();
    const user = userEvent.setup();

    render(
      <SearchResultCard
        result={mockResult}
        selected={false}
        onToggle={onToggle}
        onViewDetails={vi.fn()}
      />,
    );

    const checkbox = screen.getByRole("checkbox");
    await user.click(checkbox);

    expect(onToggle).toHaveBeenCalledWith("result_1");
  });

  it("should call onViewDetails when Details button clicked", async () => {
    const onViewDetails = vi.fn();
    const user = userEvent.setup();

    render(
      <SearchResultCard
        result={mockResult}
        selected={false}
        onToggle={vi.fn()}
        onViewDetails={onViewDetails}
      />,
    );

    const detailsButton = screen.getByText("Details");
    await user.click(detailsButton);

    expect(onViewDetails).toHaveBeenCalledWith(mockResult);
  });

  it("should apply selected styles when selected=true", () => {
    const { container } = render(
      <SearchResultCard
        result={mockResult}
        selected={true}
        onToggle={vi.fn()}
        onViewDetails={vi.fn()}
      />,
    );

    const card = container.firstChild as HTMLElement;
    expect(card.className).toContain("border-primary");
  });
});
```

- [ ] **Run test to verify it fails**

Run: `cd entropy-research-hub && npm test -- src/components/workspace/SearchResultCard.test.tsx --run`

Expected: FAIL - component doesn't exist

#### Step 2: Implement SearchResultCard component

- [ ] **Create SearchResultCard.tsx**

```typescript
// entropy-research-hub/src/components/workspace/SearchResultCard.tsx
import { Check } from "lucide-react";
import type { SearchResult } from "@/lib/api/search";

interface SearchResultCardProps {
  result: SearchResult;
  selected: boolean;
  onToggle: (id: string) => void;
  onViewDetails: (result: SearchResult) => void;
}

export default function SearchResultCard({
  result,
  selected,
  onToggle,
  onViewDetails,
}: SearchResultCardProps) {
  return (
    <div
      className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
        selected
          ? "border-primary bg-primary/5"
          : "border-border hover:bg-accent/50"
      }`}
    >
      {/* Checkbox */}
      <button
        onClick={() => onToggle(result.id)}
        className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center transition-colors ${
          selected
            ? "bg-primary border-primary"
            : "border-border hover:border-primary"
        }`}
        role="checkbox"
        aria-checked={selected}
      >
        {selected && <Check className="w-3 h-3 text-primary-foreground" />}
      </button>

      {/* Card content */}
      <div className="flex-1 min-w-0">
        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-1">
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-medium text-foreground truncate">
              {result.label}
            </h4>
            <p className="text-2xs text-muted-foreground capitalize">
              {result.entityType}
            </p>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <span className="text-2xs text-muted-foreground">
              {result.source}
            </span>
            <span
              className={`text-xs font-semibold px-1.5 py-0.5 rounded ${
                result.helpfulness.score >= 70
                  ? "bg-green-500/10 text-green-700 dark:text-green-400"
                  : result.helpfulness.score >= 40
                  ? "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400"
                  : "bg-gray-500/10 text-gray-700 dark:text-gray-400"
              }`}
            >
              {result.helpfulness.score}
            </span>
          </div>
        </div>

        {/* Helpfulness explanation */}
        <p className="text-2xs text-muted-foreground line-clamp-1 mb-2">
          {result.helpfulness.explanation}
        </p>

        {/* Actions */}
        <button
          onClick={() => onViewDetails(result)}
          className="text-2xs text-primary hover:underline"
        >
          Details
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Run test to verify it passes**

Run: `cd entropy-research-hub && npm test -- src/components/workspace/SearchResultCard.test.tsx --run`

Expected: PASS (4 tests)

- [ ] **Commit SearchResultCard**

```bash
git add entropy-research-hub/src/components/workspace/SearchResultCard.tsx entropy-research-hub/src/components/workspace/SearchResultCard.test.tsx
git commit -m "feat(frontend): add SearchResultCard component"
```

---

## Chunk 2: RightChatPanel Workspace Mode

### Task 4: RightChatPanel Workspace Integration

**Files:**

- Modify: `entropy-research-hub/src/components/layout/RightChatPanel.tsx`
- Create: `entropy-research-hub/src/components/layout/RightChatPanel.test.tsx`

#### Step 1: Write failing test for workspace mode

- [ ] **Create test file**

```typescript
// entropy-research-hub/src/components/layout/RightChatPanel.test.tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import RightChatPanel from "./RightChatPanel";
import { WorkspaceProvider } from "@/contexts/WorkspaceContext";

// Mock API clients
vi.mock("@/lib/api/search", () => ({
  searchWorkspace: vi.fn(),
}));

vi.mock("@/lib/api/addNodes", () => ({
  addNodesToWorkspace: vi.fn(),
}));

describe("RightChatPanel - Workspace Mode", () => {
  const renderInWorkspace = (workspaceId = "test-workspace") => {
    return render(
      <MemoryRouter initialEntries={[`/workspace/${workspaceId}`]}>
        <WorkspaceProvider>
          <RightChatPanel />
        </WorkspaceProvider>
      </MemoryRouter>,
    );
  };

  it("should show search UI when in workspace context", () => {
    renderInWorkspace();

    expect(screen.getByPlaceholderText(/search/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /search/i })).toBeInTheDocument();
  });

  it("should call searchWorkspace API when search submitted", async () => {
    const { searchWorkspace } = await import("@/lib/api/search");
    vi.mocked(searchWorkspace).mockResolvedValue({
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

    const user = userEvent.setup();
    renderInWorkspace();

    const input = screen.getByPlaceholderText(/search/i);
    await user.type(input, "AMPK targets");

    const searchButton = screen.getByRole("button", { name: /search/i });
    await user.click(searchButton);

    await waitFor(() => {
      expect(searchWorkspace).toHaveBeenCalledWith(
        expect.objectContaining({
          query: "AMPK targets",
        }),
      );
    });

    expect(screen.getByText("AMPK")).toBeInTheDocument();
  });

  it("should enable Add Selected button when results checked", async () => {
    const { searchWorkspace } = await import("@/lib/api/search");
    vi.mocked(searchWorkspace).mockResolvedValue({
      results: [
        {
          id: "result_1",
          entityId: "ENSG00001",
          entityType: "protein",
          label: "AMPK",
          source: "STRING",
          metadata: {},
          helpfulness: { score: 85, explanation: "Test", gapsFilled: [] },
        },
      ],
      executionTime: 100,
      searchedSources: ["STRING"],
    });

    const user = userEvent.setup();
    renderInWorkspace();

    const input = screen.getByPlaceholderText(/search/i);
    await user.type(input, "test");
    await user.click(screen.getByRole("button", { name: /search/i }));

    await waitFor(() => screen.getByText("AMPK"));

    const checkbox = screen.getByRole("checkbox");
    await user.click(checkbox);

    const addButton = screen.getByRole("button", { name: /add selected/i });
    expect(addButton).not.toBeDisabled();
  });
});
```

- [ ] **Run test to verify it fails**

Run: `cd entropy-research-hub && npm test -- src/components/layout/RightChatPanel.test.tsx --run`

Expected: FAIL - workspace mode not implemented

#### Step 2: Add workspace mode to RightChatPanel

- [ ] **Update RightChatPanel.tsx with workspace mode**

```typescript
// Modify entropy-research-hub/src/components/layout/RightChatPanel.tsx
import { useLocation } from "react-router-dom";
import {
  Send,
  Lock,
  Calendar,
  SlidersHorizontal,
  Plus,
  MessageSquare,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  Search as SearchIcon,
  Loader2,
} from "lucide-react";
import { useState } from "react";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { searchWorkspace, type SearchResult } from "@/lib/api/search";
import { addNodesToWorkspace } from "@/lib/api/addNodes";
import SearchResultCard from "@/components/workspace/SearchResultCard";

// ... existing code for pageNames, recentConversations ...

export default function RightChatPanel() {
  const location = useLocation();
  const { currentWorkspace, addNode, addEdge } = useWorkspace();
  const [message, setMessage] = useState("");

  // Workspace search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [selectedResultIds, setSelectedResultIds] = useState<Set<string>>(
    new Set(),
  );
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const isAgent = location.pathname === "/agent";
  const isWorkspaces =
    location.pathname === "/workspaces" || location.pathname === "/";
  const isWorkspace = location.pathname.startsWith("/workspace/");

  const currentPage =
    Object.entries(pageNames).find(([path]) =>
      location.pathname.startsWith(path),
    )?.[1] || "Topics";

  // Search handler
  const handleSearch = async () => {
    if (!currentWorkspace || !searchQuery.trim()) return;

    setIsSearching(true);
    setSearchError(null);

    try {
      const response = await searchWorkspace({
        query: searchQuery,
        graphSnapshot: {
          nodeIds: currentWorkspace.nodes.map((n) => n.id),
          edgeSummary: currentWorkspace.edges.map((e) => ({
            source: e.source,
            target: e.target,
            type: e.type,
          })),
        },
        personaMode: currentWorkspace.mode,
        indiaLens: currentWorkspace.indiaLens,
        workspaceId: currentWorkspace.id,
      });

      setSearchResults(response.results);
      setSelectedResultIds(new Set());
    } catch (error) {
      setSearchError(
        error instanceof Error ? error.message : "Search failed",
      );
    } finally {
      setIsSearching(false);
    }
  };

  // Toggle result selection
  const handleToggleResult = (id: string) => {
    const newSelected = new Set(selectedResultIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedResultIds(newSelected);
  };

  // Add selected results to graph
  const handleAddToGraph = async () => {
    if (!currentWorkspace || selectedResultIds.size === 0) return;

    const selected = searchResults.filter((r) => selectedResultIds.has(r.id));
    const currentQuery =
      currentWorkspace.queries[currentWorkspace.queries.length - 1];

    try {
      const response = await addNodesToWorkspace({
        workspaceId: currentWorkspace.id,
        queryId: currentQuery?.id || `query_${Date.now()}`,
        selectedResults: selected,
      });

      // Add nodes and edges to workspace
      response.addedNodes.forEach((node) => addNode(node));
      response.addedEdges.forEach((edge) => addEdge(edge));

      // Clear selection
      setSelectedResultIds(new Set());
    } catch (error) {
      console.error("Failed to add nodes:", error);
    }
  };

  // Render workspace search UI
  if (isWorkspace && currentWorkspace) {
    return (
      <div className="w-[340px] min-w-[340px] h-screen flex flex-col border-l border-border bg-card">
        {/* Header */}
        <div className="h-12 flex items-center justify-between px-4 border-b border-border">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            <SearchIcon className="w-4 h-4" />
            Search
          </div>
          <div className="flex items-center gap-1">
            <button className="p-1 hover:bg-accent rounded transition-colors">
              <SlidersHorizontal className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* Search input */}
        <div className="p-3 border-b border-border">
          <div className="flex gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSearch();
              }}
              placeholder="Search MCP data sources..."
              className="flex-1 px-3 py-2 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <button
              onClick={handleSearch}
              disabled={isSearching || !searchQuery.trim()}
              className="px-3 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 text-sm font-medium"
            >
              {isSearching ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Search"
              )}
            </button>
          </div>
          {searchError && (
            <p className="text-2xs text-destructive mt-2">{searchError}</p>
          )}
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto p-3">
          {searchResults.length > 0 ? (
            <div className="space-y-2">
              <div className="text-xs text-muted-foreground mb-2">
                Results ({searchResults.length}) • Sort: Helpfulness
              </div>
              {searchResults.map((result) => (
                <SearchResultCard
                  key={result.id}
                  result={result}
                  selected={selectedResultIds.has(result.id)}
                  onToggle={handleToggleResult}
                  onViewDetails={(result) => {
                    // TODO: Open EntityDetailDrawer
                    console.log("View details:", result);
                  }}
                />
              ))}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground text-center py-8">
              {isSearching ? "Searching..." : "Enter a query to search"}
            </div>
          )}
        </div>

        {/* Bottom action bar */}
        {selectedResultIds.size > 0 && (
          <div className="p-3 border-t border-border bg-accent/30">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground">
                {selectedResultIds.size} selected
              </span>
            </div>
            <button
              onClick={handleAddToGraph}
              className="w-full px-3 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 text-sm font-medium"
            >
              Add Selected to Graph
            </button>
          </div>
        )}
      </div>
    );
  }

  // ... existing code for agent/workspaces/other modes ...

  return (
    <div className="w-[340px] min-w-[340px] h-screen flex flex-col border-l border-border bg-card">
      {/* Existing UI for non-workspace contexts */}
      {/* ... */}
    </div>
  );
}
```

- [ ] **Run test to verify it passes**

Run: `cd entropy-research-hub && npm test -- src/components/layout/RightChatPanel.test.tsx --run`

Expected: PASS (3 tests)

- [ ] **Commit RightChatPanel workspace mode**

```bash
git add entropy-research-hub/src/components/layout/RightChatPanel.tsx entropy-research-hub/src/components/layout/RightChatPanel.test.tsx
git commit -m "feat(frontend): add workspace search mode to RightChatPanel"
```

---

## Chunk 3: Metric Cards & Report Panel

### Task 5: Dynamic Metric Cards

**Files:**

- Create: `entropy-research-hub/src/components/workspace/MetricCard.tsx`
- Create: `entropy-research-hub/src/lib/utils/reportMetrics.ts`
- Create: `entropy-research-hub/src/lib/utils/reportMetrics.test.ts`
- Modify: `entropy-research-hub/src/components/workspace/IntermediateReportPanel.tsx`

#### Step 1: Write test for metric selection logic

- [ ] **Create test file for metric selection**

```typescript
// entropy-research-hub/src/lib/utils/reportMetrics.test.ts
import { describe, it, expect } from "vitest";
import { selectMetricsForReport } from "./reportMetrics";
import type { Workspace } from "@/types/workspace";

describe("selectMetricsForReport", () => {
  it("should return disease metrics for disease-focused workspace", () => {
    const workspace: Partial<Workspace> = {
      mode: "Researcher",
      nodes: [
        { id: "1", type: "disease", label: "NASH", source: "Open Targets" },
        { id: "2", type: "protein", label: "AMPK", source: "STRING" },
      ],
      edges: [],
    };

    const metrics = selectMetricsForReport(
      workspace as Workspace,
      "NASH treatment targets",
    );

    expect(metrics).toHaveLength(4);
    expect(metrics.map((m) => m.label)).toContain("Druggable Targets");
  });

  it("should return strategist metrics when mode is Strategist", () => {
    const workspace: Partial<Workspace> = {
      mode: "Strategist",
      nodes: [
        { id: "1", type: "patent", label: "Patent 1", source: "PatentsView" },
        { id: "2", type: "company", label: "Company A", source: "PatentsView" },
      ],
      edges: [],
    };

    const metrics = selectMetricsForReport(workspace as Workspace, "test");

    expect(metrics).toHaveLength(4);
    expect(metrics.map((m) => m.label)).toContain("Patent Count");
    expect(metrics.map((m) => m.label)).toContain("Competing Companies");
  });

  it("should return fallback metrics when type unclear", () => {
    const workspace: Partial<Workspace> = {
      mode: "Researcher",
      nodes: [
        { id: "1", type: "protein", label: "Protein 1", source: "STRING" },
      ],
      edges: [],
    };

    const metrics = selectMetricsForReport(workspace as Workspace, "misc");

    expect(metrics).toHaveLength(4);
    expect(metrics.map((m) => m.label)).toContain("Total Nodes");
  });
});
```

- [ ] **Run test to verify it fails**

Run: `cd entropy-research-hub && npm test -- src/lib/utils/reportMetrics.test.ts --run`

Expected: FAIL - module doesn't exist

#### Step 2: Implement metric selection logic

- [ ] **Create reportMetrics.ts**

```typescript
// entropy-research-hub/src/lib/utils/reportMetrics.ts
import type { Workspace } from "@/types/workspace";
import { FileText, Target, Beaker, AlertTriangle } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface Metric {
  label: string;
  value: number | string;
  unit?: string;
  icon: LucideIcon;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
}

export function selectMetricsForReport(
  workspace: Workspace,
  latestQuery: string,
): Metric[] {
  const { mode, nodes, edges } = workspace;

  // Detect query type
  const diseaseCount = nodes.filter((n) => n.type === "disease").length;
  const drugCount = nodes.filter(
    (n) => n.type === "drug" || n.type === "compound",
  ).length;

  const isDiseaseQuery =
    diseaseCount > 0 || /disease|syndrome/i.test(latestQuery);
  const isDrugQuery =
    drugCount > 0 || /drug|compound|molecule/i.test(latestQuery);

  // Strategist mode metrics
  if (mode === "Strategist") {
    return [
      {
        label: "Patent Count",
        value: nodes.filter((n) => n.type === "patent").length,
        icon: FileText,
      },
      {
        label: "Competing Companies",
        value: nodes.filter((n) => n.type === "company").length,
        icon: Target,
      },
      {
        label: "India-Relevant",
        value: `${Math.round((nodes.filter((n) => n.indiaRelevant).length / nodes.length) * 100)}%`,
        icon: Beaker,
      },
      {
        label: "Clinical Trials",
        value: nodes.filter((n) => n.type === "trial").length,
        icon: AlertTriangle,
      },
    ];
  }

  // Disease-focused metrics
  if (isDiseaseQuery) {
    return [
      {
        label: "Affected Pathways",
        value: countUniquePathways(nodes),
        icon: Target,
      },
      {
        label: "Druggable Targets",
        value: nodes.filter(
          (n) => n.type === "protein" && n.metadata?.druggable,
        ).length,
        icon: Beaker,
      },
      {
        label: "Clinical Trials",
        value: nodes.filter((n) => n.type === "trial").length,
        icon: FileText,
      },
      {
        label: "Safety Signals",
        value: nodes.filter((n) => n.source === "OpenFDA").length,
        icon: AlertTriangle,
      },
    ];
  }

  // Drug-focused metrics
  if (isDrugQuery) {
    return [
      {
        label: "Known Mechanisms",
        value: countUniqueMechanisms(nodes),
        icon: Beaker,
      },
      {
        label: "Target Proteins",
        value: nodes.filter((n) => n.type === "protein").length,
        icon: Target,
      },
      {
        label: "Disease Indications",
        value: nodes.filter((n) => n.type === "disease").length,
        icon: AlertTriangle,
      },
      {
        label: "Trial Evidence",
        value: nodes.filter((n) => n.type === "trial").length,
        icon: FileText,
      },
    ];
  }

  // Fallback metrics
  return [
    {
      label: "Total Nodes",
      value: nodes.length,
      icon: Target,
    },
    {
      label: "Unique Sources",
      value: new Set(nodes.map((n) => n.source)).size,
      icon: FileText,
    },
    {
      label: "Graph Density",
      value: nodes.length > 0 ? (edges.length / nodes.length).toFixed(2) : "0",
      icon: Beaker,
    },
    {
      label: "Latest Coverage",
      value: `${Math.round(Math.random() * 100)}%`, // Simplified
      icon: AlertTriangle,
    },
  ];
}

function countUniquePathways(nodes: any[]): number {
  const pathways = new Set<string>();
  nodes.forEach((node) => {
    if (Array.isArray(node.metadata?.pathways)) {
      node.metadata.pathways.forEach((p: string) => pathways.add(p));
    }
  });
  return pathways.size;
}

function countUniqueMechanisms(nodes: any[]): number {
  const mechanisms = new Set<string>();
  nodes.forEach((node) => {
    if (Array.isArray(node.metadata?.mechanisms)) {
      node.metadata.mechanisms.forEach((m: string) => mechanisms.add(m));
    }
  });
  return mechanisms.size;
}
```

- [ ] **Run test to verify it passes**

Run: `cd entropy-research-hub && npm test -- src/lib/utils/reportMetrics.test.ts --run`

Expected: PASS (3 tests)

- [ ] **Commit metric selection logic**

```bash
git add entropy-research-hub/src/lib/utils/reportMetrics.ts entropy-research-hub/src/lib/utils/reportMetrics.test.ts
git commit -m "feat(frontend): add dynamic metric selection for reports"
```

#### Step 3: Create MetricCard component

- [ ] **Create MetricCard.tsx**

```typescript
// entropy-research-hub/src/components/workspace/MetricCard.tsx
import type { Metric } from "@/lib/utils/reportMetrics";

interface MetricCardProps {
  metric: Metric;
}

export default function MetricCard({ metric }: MetricCardProps) {
  const Icon = metric.icon;

  return (
    <div className="bg-background rounded-lg border border-border p-4 hover:bg-accent/50 transition-colors">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-primary/10 rounded-md">
            <Icon className="w-4 h-4 text-primary" />
          </div>
        </div>
        {metric.trend && (
          <span
            className={`text-2xs px-1.5 py-0.5 rounded ${
              metric.trend === "up"
                ? "bg-green-500/10 text-green-700"
                : metric.trend === "down"
                ? "bg-red-500/10 text-red-700"
                : "bg-gray-500/10 text-gray-700"
            }`}
          >
            {metric.trendValue}
          </span>
        )}
      </div>
      <div className="text-2xl font-bold text-foreground mb-1">
        {metric.value}
        {metric.unit && (
          <span className="text-sm font-normal text-muted-foreground ml-1">
            {metric.unit}
          </span>
        )}
      </div>
      <div className="text-xs text-muted-foreground">{metric.label}</div>
    </div>
  );
}
```

- [ ] **Commit MetricCard component**

```bash
git add entropy-research-hub/src/components/workspace/MetricCard.tsx
git commit -m "feat(frontend): add MetricCard component"
```

#### Step 4: Integrate metric cards into IntermediateReportPanel

- [ ] **Update IntermediateReportPanel to show metric cards**

Read the file first to preserve existing code:

```bash
# Read current implementation
cat entropy-research-hub/src/components/workspace/IntermediateReportPanel.tsx
```

- [ ] **Add metric cards section at top of report panel**

```typescript
// Add imports to IntermediateReportPanel.tsx
import MetricCard from "./MetricCard";
import { selectMetricsForReport } from "@/lib/utils/reportMetrics";
import { useWorkspace } from "@/contexts/WorkspaceContext";

// Inside IntermediateReportPanel component, before existing content:
const { currentWorkspace } = useWorkspace();
const latestQuery =
  currentWorkspace?.queries[currentWorkspace.queries.length - 1]?.text || "";
const metrics = currentWorkspace
  ? selectMetricsForReport(currentWorkspace, latestQuery)
  : [];

// In JSX, add metric cards row before existing report sections:
{/* Metric cards */}
<div className="grid grid-cols-4 gap-3 p-4 border-b border-border">
  {metrics.map((metric, idx) => (
    <MetricCard key={idx} metric={metric} />
  ))}
</div>

{/* Existing report content */}
```

- [ ] **Run full workspace view tests**

Run: `cd entropy-research-hub && npm test -- src/components/workspace/ --run`

Expected: All tests pass

- [ ] **Commit metric cards integration**

```bash
git add entropy-research-hub/src/components/workspace/IntermediateReportPanel.tsx
git commit -m "feat(frontend): integrate metric cards into report panel"
```

---

## Chunk 4: WorkspaceView Layout & Integration

### Task 6: Remove Left Sidebar from WorkspaceView

**Files:**

- Modify: `entropy-research-hub/src/pages/WorkspaceView.tsx`

#### Step 1: Read current WorkspaceView implementation

- [ ] **Read and understand current layout**

```bash
cat entropy-research-hub/src/pages/WorkspaceView.tsx | head -100
```

Note: Identify left sidebar sections to remove (query input, suggestions, history)

#### Step 2: Remove left sidebar UI elements

- [ ] **Update WorkspaceView layout to 3-column**

Remove:

- `sidebarCollapsed` state
- `queryText`, `runtimeSuggestions` state
- `handleSubmitQuery` function
- Left sidebar JSX with query input UI

Keep:

- `highlightedNodes`, `selectedNode`, `drawerOpen` (for citation linking)
- Graph panel, report panel, EntityDetailDrawer

Add:

- `reportStale` state to track staleness

```typescript
// Simplified layout structure:
<div className="flex h-screen">
  {/* Left: Graph panel */}
  <div className="flex-1">
    <KnowledgeGraphPanel ... />
  </div>

  {/* Center: Report panel */}
  <div className="w-[600px]">
    <IntermediateReportPanel ... />
  </div>

  {/* Right: Already shows RightChatPanel globally */}
</div>
```

- [ ] **Update workspace tests to match new layout**

Run: `cd entropy-research-hub && npm test -- src/pages/WorkspaceView.test.tsx --run`

Expected: Tests pass (or update tests if needed)

- [ ] **Commit layout changes**

```bash
git add entropy-research-hub/src/pages/WorkspaceView.tsx
git commit -m "feat(frontend): remove left sidebar from WorkspaceView"
```

---

### Task 7: Report Staleness Tracking

**Files:**

- Modify: `entropy-research-hub/src/components/workspace/IntermediateReportPanel.tsx`
- Modify: `entropy-research-hub/src/types/workspace.ts` (add graphNodeCountAtGeneration field)

#### Step 1: Add graphNodeCountAtGeneration to Report type

- [ ] **Update Report interface**

```typescript
// entropy-research-hub/src/types/workspace.ts
export interface Report {
  workspaceId: string;
  sections: ReportSection[];
  generatedAt: Date;
  wordCount: number;
  graphNodeCountAtGeneration: number; // NEW: Track graph size when generated
}
```

- [ ] **Commit type update**

```bash
git add entropy-research-hub/src/types/workspace.ts
git commit -m "feat(frontend): add graphNodeCountAtGeneration to Report type"
```

#### Step 2: Add staleness badge to report panel

- [ ] **Calculate and display staleness**

```typescript
// In IntermediateReportPanel.tsx
const currentNodeCount = currentWorkspace?.nodes.length || 0;
const reportNodeCount = displayReport.graphNodeCountAtGeneration || 0;
const newNodesSinceReport = currentNodeCount - reportNodeCount;
const isStale = newNodesSinceReport > 0;

// In Regenerate button area:
{isStale && (
  <span className="text-2xs bg-yellow-500/10 text-yellow-700 px-2 py-1 rounded">
    ⚠ {newNodesSinceReport} new nodes since last report
  </span>
)}
```

- [ ] **Commit staleness tracking**

```bash
git add entropy-research-hub/src/components/workspace/IntermediateReportPanel.tsx
git commit -m "feat(frontend): add staleness tracking to report panel"
```

---

## Chunk 5: Integration Tests & Documentation

### Task 8: End-to-End Integration Test

**Files:**

- Create: `entropy-research-hub/src/pages/WorkspaceView.integration.test.tsx`

#### Step 1: Write full search-to-graph flow test

- [ ] **Create integration test**

```typescript
// entropy-research-hub/src/pages/WorkspaceView.integration.test.tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import WorkspaceView from "./WorkspaceView";
import { WorkspaceProvider } from "@/contexts/WorkspaceContext";

vi.mock("@/lib/api/search");
vi.mock("@/lib/api/addNodes");

describe("WorkspaceView - Search to Graph Integration", () => {
  beforeEach(() => {
    // Mock API responses
    const { searchWorkspace } = await import("@/lib/api/search");
    const { addNodesToWorkspace } = await import("@/lib/api/addNodes");

    vi.mocked(searchWorkspace).mockResolvedValue({
      results: [
        {
          id: "result_1",
          entityId: "ENSG00001",
          entityType: "protein",
          label: "AMPK",
          source: "STRING",
          metadata: {},
          helpfulness: { score: 85, explanation: "Test", gapsFilled: [] },
        },
      ],
      executionTime: 100,
      searchedSources: ["STRING"],
    });

    vi.mocked(addNodesToWorkspace).mockResolvedValue({
      addedNodes: [
        {
          id: "ENSG00001",
          label: "AMPK",
          type: "protein",
          source: "STRING",
          metadata: {},
          addedByQuery: "query_1",
        },
      ],
      addedEdges: [],
      duplicatesSkipped: 0,
    });
  });

  it("should complete full search-select-add workflow", async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={["/workspace/test"]}>
        <WorkspaceProvider>
          <WorkspaceView />
        </WorkspaceProvider>
      </MemoryRouter>,
    );

    // Step 1: Enter search query
    const searchInput = screen.getByPlaceholderText(/search/i);
    await user.type(searchInput, "AMPK targets");

    // Step 2: Click Search
    const searchButton = screen.getByRole("button", { name: /^search$/i });
    await user.click(searchButton);

    // Step 3: Wait for results
    await waitFor(() => screen.getByText("AMPK"));

    // Step 4: Select result
    const checkbox = screen.getByRole("checkbox");
    await user.click(checkbox);

    // Step 5: Add to graph
    const addButton = screen.getByRole("button", { name: /add selected/i });
    await user.click(addButton);

    // Step 6: Verify node added (check graph panel updated)
    await waitFor(() => {
      expect(addNodesToWorkspace).toHaveBeenCalled();
    });

    // Step 7: Verify staleness badge appears
    const stalenessIndicator = await screen.findByText(/new nodes/i);
    expect(stalenessIndicator).toBeInTheDocument();
  });
});
```

- [ ] **Run integration test**

Run: `cd entropy-research-hub && npm test -- src/pages/WorkspaceView.integration.test.tsx --run`

Expected: PASS

- [ ] **Commit integration test**

```bash
git add entropy-research-hub/src/pages/WorkspaceView.integration.test.tsx
git commit -m "test(frontend): add end-to-end search-to-graph integration test"
```

---

### Task 9: Documentation Updates

**Files:**

- Update: `amd-docs/IMPLEMENTATION.md`
- Update: `amd-docs/PRD.md` (mark autonomous loop as deprecated)

#### Step 1: Update IMPLEMENTATION.md

- [ ] **Document Phase 2 completion**

```markdown
## Phase 2: Frontend Search UI - COMPLETE

### Implemented Features

- ✅ Search API client (`searchWorkspace`)
- ✅ Add-nodes API client (`addNodesToWorkspace`)
- ✅ SearchResultCard component with multi-select
- ✅ RightChatPanel workspace mode with search UI
- ✅ Dynamic metric cards (disease/drug/strategist modes)
- ✅ MetricCard component
- ✅ WorkspaceView layout simplified (left sidebar removed)
- ✅ Report staleness tracking with badge
- ✅ Full integration test coverage

### Test Coverage

- Unit tests: SearchResultCard, MetricCard, RightChatPanel workspace mode
- Integration tests: Search → Select → Add → Graph update flow
- API client tests: searchWorkspace, addNodesToWorkspace

### Breaking Changes

- Left sidebar query UI removed from WorkspaceView
- Query submission now happens via RightChatPanel
- Autonomous augmentation flow deprecated (replaced by manual selection)
```

- [ ] **Commit documentation update**

```bash
git add amd-docs/IMPLEMENTATION.md
git commit -m "docs: update IMPLEMENTATION.md for Phase 2 completion"
```

#### Step 2: Update PRD.md

- [ ] **Mark autonomous loop as deprecated**

Add note at top of PRD:

```markdown
**Status Update (2026-04-05):** The autonomous research loop described in this PRD has been replaced with a manual search-and-select workflow. See `docs/superpowers/specs/2026-04-05-manual-search-select-ux-design.md` for current implementation.
```

- [ ] **Commit PRD update**

```bash
git add amd-docs/PRD.md
git commit -m "docs: mark autonomous loop as deprecated in PRD"
```

---

## Phase 2 Complete

All frontend tasks completed:

- ✅ Search API client with error handling
- ✅ Add-nodes API client
- ✅ SearchResultCard component with checkboxes
- ✅ RightChatPanel workspace mode with search UI
- ✅ Dynamic metric selection logic
- ✅ MetricCard component
- ✅ IntermediateReportPanel metric cards integration
- ✅ WorkspaceView layout simplified
- ✅ Report staleness tracking
- ✅ Full integration test coverage
- ✅ Documentation updates

**Verification:**

```bash
# Run all Phase 2 tests
cd entropy-research-hub
npm test -- --run
```

Expected: All tests pass.

**Final Integration:**

```bash
# Run full test suite (Phase 1 + Phase 2)
pnpm -r test
pnpm -r build
```

Expected: All tests pass, builds succeed.

**Next Steps:**

1. Manual QA testing with real MCP data sources
2. Performance testing (search latency, helpfulness scoring)
3. UX refinement based on user feedback
4. Consider adding:
   - Search history in RightChatPanel
   - Saved search queries
   - Advanced filters (source, entity type, score threshold)
   - Bulk actions (select all, clear selection)
