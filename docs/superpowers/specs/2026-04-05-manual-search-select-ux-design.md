# Manual Search-and-Select UX Design

**Date**: 2026-04-05  
**Status**: Approved  
**Feature**: Manual search workflow with helpfulness scoring  
**Replaces**: Autonomous graph augmentation loop

---

## Overview

This design converts Entropy v2 from an autonomous augmentation workflow (query → auto-fetch → auto-add) to a manual search-and-select workflow (query → ranked results → user selects → manual add). This provides users with explicit control over what enters their knowledge graph and makes the system production-ready rather than a hackathon demo.

### Key Changes

1. **Search API replaces augmentation API**: New `POST /api/entropy/search` returns scored results without mutating graph
2. **Helpfulness scoring**: New Mastra agent scores results by gap-filling potential relative to current workspace graph
3. **Right sidebar search UI**: Move query input from left sidebar to RightChatPanel with rich result cards
4. **Multi-select + batch add**: Users select results via checkboxes, add in batch with "Add Selected to Graph" button
5. **Manual report regeneration**: Replace auto-synthesis with explicit "Regenerate" button showing staleness badge
6. **Dynamic metric cards**: Add 4 context-aware metric cards to top of intermediate report panel

---

## Architecture

### Approach: Clean Separation

- **Search**: `POST /api/entropy/search` returns scored results (no graph mutation)
- **Scoring**: `helpfulness-agent` scores each result by gap-filling potential
- **Addition**: `POST /api/workspace/add-nodes` converts selected results to graph nodes/edges
- **Synthesis**: Existing `POST /api/causaly/synthesise` endpoint (manual trigger only)

---

## API Contracts

### `POST /api/entropy/search`

**Purpose**: Execute search across MCP servers and return scored results without mutating workspace graph.

**Request**:

```typescript
{
  query: string;              // "metformin targets in NASH"
  graphSnapshot: {
    nodeIds: string[];        // ["ENSG00000123", "CHEMBL456"]
    edgeSummary: Array<{
      source: string;
      target: string;
      type: string;
    }>;
  };
  personaMode: "Researcher" | "Strategist";
  indiaLens: boolean;
  workspaceId: string;
  maxResults?: number;        // Optional, default: 10 for non-empty, 25 for empty graph
}
```

**Response**:

```typescript
{
  results: Array<{
    id: string;               // Unique result ID for this search
    entityId: string;         // UniProt ID, ChEMBL ID, NCT ID, etc.
    entityType: "protein" | "drug" | "disease" | "trial" | "patent" | "company" | "paper";
    label: string;            // Human-readable name
    source: "Open Targets" | "STRING" | "PubMed" | "PatentsView" | ...;
    metadata: Record<string, any>;
    helpfulness: {
      score: number;          // 0-100
      explanation: string;    // "Fills gap: no AMPK pathway proteins in current graph"
      gapsFilled: string[];   // ["pathway:AMPK signaling", "mechanism:glucose uptake"]
    };
    evidenceScore?: number;
    indiaRelevant?: boolean;
  }>;
  executionTime: number;
  searchedSources: string[];
}
```

**Implementation**:

- Detect empty graph: if `nodeIds.length === 0`, use bootstrap mode (higher maxResults)
- Run MCP tool queries in parallel
- Run helpfulness-agent scoring in parallel for all results
- Sort by helpfulness score descending
- Apply India Lens enrichment if enabled

---

### `POST /api/workspace/add-nodes`

**Purpose**: Convert selected search results into graph nodes/edges and add to workspace.

**Request**:

```typescript
{
  workspaceId: string;
  queryId: string;
  selectedResults: Array<{
    id: string;
    entityId: string;
    entityType: string;
    label: string;
    source: string;
    metadata: Record<string, any>;
    evidenceScore?: number;
    indiaRelevant?: boolean;
  }>;
}
```

**Response**:

```typescript
{
  addedNodes: GraphNode[];
  addedEdges: GraphEdge[];
  duplicatesSkipped: number;
}
```

**Implementation**:

- Check for duplicates by entityId before adding
- Merge provenance if entity already exists
- Infer edges where possible (STRING interactions, Open Targets associations)
- Mark nodes with `addedByQuery` for provenance tracking

---

### `POST /api/causaly/synthesise` (Refactored)

**Changes**: Add `graphNodeCount` to response for staleness tracking.

**Response** (new field):

```typescript
{
  sections: ReportSection[];
  wordCount: number;
  generatedAt: string;
  graphNodeCount: number;     // NEW: track graph size at generation time
}
```

---

## Helpfulness Agent

### Location

`apps/mastra-app/src/agents/helpfulness-agent.ts`

### Purpose

Score a single search result against current workspace graph to determine how much it would improve graph completeness.

### Input

```typescript
{
  result: {
    entityId: string;
    entityType: string;
    label: string;
    source: string;
    metadata: Record<string, any>;
  };
  graphSnapshot: {
    nodeIds: string[];
    nodeTypes: Record<string, string>;
    edgeSummary: Array<{
      source: string;
      target: string;
      type: string;
    }>;
  };
  queryContext: string;
}
```

### Output

```typescript
{
  score: number;          // 0-100
  explanation: string;
  gapsFilled: string[];
}
```

### Scoring Logic

**Novelty Check (40 points max)**:

- If entityId already in graph: score = 0
- If entityType underrepresented: +20 points
- If introduces new relationship type: +20 points

**Gap Analysis (40 points max)**:

- Extract semantic concepts from metadata (pathways, mechanisms, indications)
- Compare against existing graph node metadata
- For each new concept: +10 points (max 40)
- Store as `gapsFilled` array

**Query Relevance (20 points max)**:

- LLM prompt: "Does this entity directly address the query?"
- Strongly relevant: +20, Moderately: +10, Weakly: +5, Not relevant: +0

**Bootstrap Mode** (empty graph):

- Skip novelty/gap checks
- Score purely on query relevance (0-100 scale)
- Broader relevance thresholds

### Error Handling

- LLM timeout → fallback to heuristic scoring (novelty + type diversity)
- Invalid metadata → skip gap analysis, use novelty only
- Results still returned with degraded scores and explanations

---

## Frontend Components

### WorkspaceView Layout

**File**: `entropy-research-hub/src/pages/WorkspaceView.tsx`

**Changes**:

- Remove entire left sidebar (query input, suggestions, history)
- 3-column layout:
  - **Left**: KnowledgeGraphPanel (unchanged)
  - **Center**: IntermediateReportPanel (add metric cards)
  - **Right**: RightChatPanel (workspace-aware search UI)

**State Changes**:

- Remove: `queryText`, `runtimeSuggestions`, `handleSubmitQuery`
- Keep: `highlightedNodes`, `selectedNode`, `drawerOpen` (citation linking)
- Add: `reportStale: boolean` (track staleness)

---

### RightChatPanel Workspace Mode

**File**: `entropy-research-hub/src/components/layout/RightChatPanel.tsx`

**Context Detection**:

```typescript
const isWorkspace = location.pathname.startsWith("/workspace/");
const workspaceId = location.pathname.split("/workspace/")[1];
```

**UI Structure**:

```
┌─────────────────────────────────────┐
│ 🔍 Search  [🔧] [◀] [▶]             │  ← Header
├─────────────────────────────────────┤
│ [Search input field]                │  ← Search bar
│ [Search button]                     │
├─────────────────────────────────────┤
│ Results (12)  Sort: Helpfulness ▼   │  ← Results header
│                                     │
│ ☐ [Result Card 1]                  │  ← Rich card (by default)
│   Protein: AMPK alpha-1            │
│   Source: STRING • Score: 89       │
│   "Fills gap: AMPK pathway..."     │
│   [Details] [Info icon]            │
│                                     │
│ ☐ [Result Card 2]                  │
│   Drug: Metformin                   │
│   Source: Open Targets • Score: 76 │
│   "Adds diabetes indication..."    │
│                                     │
│ ... (scrollable)                    │
├─────────────────────────────────────┤
│ [✓] 3 selected                      │  ← Bottom action bar
│ [Add Selected to Graph]             │
└─────────────────────────────────────┘
```

**State Management**:

```typescript
const [searchQuery, setSearchQuery] = useState("");
const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
const [selectedResultIds, setSelectedResultIds] = useState<Set<string>>(
  new Set(),
);
const [isSearching, setIsSearching] = useState(false);
const [searchError, setSearchError] = useState<string | null>(null);
```

**Search Flow**:

1. User types query → clicks Search button
2. Call `POST /api/entropy/search` with current workspace graph snapshot
3. Display results as rich cards with checkboxes
4. User checks results → "Add Selected to Graph" enabled
5. Click "Add Selected" → call `POST /api/workspace/add-nodes`
6. Update workspace via WorkspaceContext
7. Clear selection, keep results visible

**Result Card Component** (`<SearchResultCard />`):

- Checkbox (left)
- Entity type icon + label (top)
- Source badge + helpfulness score badge (top-right)
- Helpfulness explanation (1-line preview, truncated)
- "Details" button → opens EntityDetailDrawer (reuses existing component)
- India Lens indicator (if `indiaRelevant === true`)

---

### IntermediateReportPanel Enhancements

**File**: `entropy-research-hub/src/components/workspace/IntermediateReportPanel.tsx`

**New Top Section**:

```tsx
<div className="metric-cards-row">
  <MetricCard {...metric1} />
  <MetricCard {...metric2} />
  <MetricCard {...metric3} />
  <MetricCard {...metric4} />
</div>
```

**MetricCard Component**:

```typescript
interface MetricCardProps {
  label: string; // "Druggable Targets"
  value: number | string;
  unit?: string;
  icon: LucideIcon;
  trend?: "up" | "down" | "neutral";
  trendValue?: string; // "+5 since last query"
}
```

**Dynamic Metric Selection** (`getMetricsForReport()`):

**Input**: `{ queryType, personaMode, graphSnapshot, reportData }`

**Query Type Detection**:

- Disease-focused: contains disease nodes or query mentions diseases
- Drug-focused: contains drug/compound nodes or query mentions drugs
- Target-focused: mostly protein/gene nodes
- Strategic: persona === "Strategist"

**Metric Sets**:

**Disease Query + Researcher Mode**:

1. Affected Pathways
2. Druggable Targets
3. Clinical Trials
4. Safety Signals

**Drug Query + Researcher Mode**:

1. Known Mechanisms
2. Target Proteins
3. Disease Indications
4. Trial Evidence

**Strategist Mode**:

1. Patent Count
2. Competing Companies
3. India-Relevant Entities (%)
4. Market Precedent

**Fallback**:

1. Total Nodes
2. Unique Sources
3. Graph Density
4. Latest Query Coverage

**Staleness Badge**:

- Compare `workspace.nodes.length` at last report generation vs current
- Show badge: "⚠ 5 new nodes since last report" next to Regenerate button
- Badge disappears after successful regeneration

---

## Data Flows

### 1. Search Execution

**User Action**: Submit search query in RightChatPanel

**Flow**:

1. Frontend: Collect graph snapshot, call `/api/entropy/search`
2. Backend:
   - Detect bootstrap mode (empty graph)
   - Call MCP tools in parallel
   - Score results with helpfulness-agent (parallel execution)
   - Sort by score, return top N
3. Frontend: Display results sorted by helpfulness

---

### 2. Add to Graph

**User Action**: Select results, click "Add Selected to Graph"

**Flow**:

1. Frontend: Collect selected results, call `/api/workspace/add-nodes`
2. Backend:
   - Convert results to GraphNode format
   - Check duplicates, merge provenance
   - Infer edges from metadata
   - Return added nodes/edges
3. Frontend:
   - Update WorkspaceContext
   - Persist to IndexedDB
   - Clear selection
   - Set `reportStale = true`

---

### 3. Report Regeneration

**User Action**: Click "Regenerate" in IntermediateReportPanel

**Flow**:

1. Frontend: Call `/api/causaly/synthesise` with current graph
2. Backend: Generate report with synthesis-agent
3. Frontend: Update workspace with new report, set `reportStale = false`

---

### 4. Result Detail View

**User Action**: Click "Details" on result card

**Flow**:

1. Frontend: Convert SearchResult to temporary GraphNode format
2. Open EntityDetailDrawer with result data
3. Drawer shows metadata, helpfulness explanation, UniProt viewer (if protein)
4. Reuses existing EntityDetailDrawer component (no changes)

---

## Error Handling

### Search Errors

**Network Failure**:

- Display: "Search failed. Check network connection."
- Keep previous results visible
- Show retry button

**Partial MCP Failures**:

- Return partial results + `searchedSources` array
- Display: "⚠ 2 of 5 sources unavailable"

**Zero Results**:

- Display: "No results found. Try broader search terms."
- Suggest alternative queries
- Offer India Lens toggle

**Empty Graph Bootstrap**:

- If < 5 results, auto-increase maxResults and retry
- Show: "Populating initial graph..."

---

### Add-to-Graph Errors

**All Duplicates**:

- Display: "All selected entities already in graph."
- Keep selection visible

**Partial Success**:

- Display: "Added 3 nodes (2 duplicates skipped)"

**Network Failure**:

- Show error, don't clear selection
- Retry button available

---

### Report Regeneration Errors

**Synthesis Failure**:

- Keep existing report visible
- Display: "Regeneration failed. Retrying..."
- Auto-retry once after 2s
- Manual retry if second attempt fails

**Graph Too Small** (< 5 nodes):

- Show warning: "Graph has limited data. Report may be brief."
- Allow regeneration (user choice)

---

### Helpfulness Agent Errors

**LLM Timeout/Error**:

- Fallback to heuristic scoring
- Explanation: "Score based on novelty (LLM unavailable)"
- No user-facing error (graceful degradation)

**Invalid Metadata**:

- Skip gap analysis
- Score based on novelty + keyword matching
- Log error to backend console

---

### Race Conditions

**Concurrent Searches**:

- Cancel previous request (AbortController)
- Clear results, start new search

**Concurrent Add Requests**:

- Disable button while request in flight
- Queue subsequent requests

**Graph Changes During Report Regeneration**:

- Use graph snapshot at request time
- Check staleness on response
- Show badge again if graph changed further

---

### Persistence & Recovery

**IndexedDB Write Failure**:

- Log error, show notification
- Keep workspace in memory
- Retry on next state change

**Page Reload During Search**:

- Search state ephemeral (not persisted)
- User can search again

**Page Reload During Add**:

- Request completed: nodes in IndexedDB, loads normally
- Request in-flight: changes lost, user re-selects

---

## Testing Strategy

### Backend Tests

**`POST /api/entropy/search`** (`apps/api/src/__tests__/search.test.ts`):

- Happy path: Returns scored, sorted results
- Bootstrap mode: Empty graph returns 25 results
- Validation: Rejects invalid inputs
- Error cases: MCP failures, helpfulness agent failures
- Edge cases: All duplicates, zero results

**`POST /api/workspace/add-nodes`** (`apps/api/src/__tests__/add-nodes.test.ts`):

- Happy path: Converts results to GraphNode format
- Deduplication: Skips existing entities, merges provenance
- Edge inference: Creates edges from metadata
- Edge cases: Empty selection, invalid types

**Helpfulness Agent** (`apps/mastra-app/src/__tests__/helpfulness-agent.test.ts`):

- Scoring logic: Novelty, gap analysis, query relevance
- Bootstrap mode: Empty graph scoring
- Fallback: LLM failures use heuristics
- Edge cases: No metadata, large graphs

---

### Frontend Tests

**RightChatPanel** (`entropy-research-hub/src/components/layout/RightChatPanel.test.tsx`):

- UI rendering: Search input, results list, checkboxes
- Search flow: Loading, results, errors, zero results
- Selection flow: Multi-select, add to graph
- Detail view: Opens EntityDetailDrawer

**IntermediateReportPanel** (`entropy-research-hub/src/components/workspace/IntermediateReportPanel.test.tsx`):

- Metric cards: Disease/drug/strategist modes, fallback
- Staleness detection: Badge shows correct delta
- Regeneration: Loading, success, error, retry

**WorkspaceView Integration** (`entropy-research-hub/src/pages/WorkspaceView.integration.test.tsx`):

- End-to-end: Search → select → add → graph updates
- Citation linking: Still works (existing feature)

---

### TDD Requirements

Per `CLAUDE.md`, each test file includes:

- **Happy path**: Expected success
- **Validation**: Invalid input handling
- **Error path**: Network/service failures
- **Edge case**: Boundary conditions

Coverage targets:

- Backend routes: 100% of endpoints
- Mastra agents: 100% of scoring logic paths
- Frontend components: All UI states (loading, error, empty, populated)

---

## Implementation Notes

### Component Reuse

- **EntityDetailDrawer**: Reused for both graph nodes and search results (no changes)
- **WorkspaceContext**: Existing hooks (`addNode`, `addEdge`) reused
- **IndexedDB**: `workspaceStoreV2` persistence unchanged
- **India Lens**: `processIndiaLens()` enrichment reused

### Deprecation

- Left sidebar query UI: Completely removed from WorkspaceView
- Auto-augmentation: `POST /api/causaly/augment` kept for backward compat but not used in new UI
- Auto-synthesis: Still available in code but not triggered automatically
- Follow-up suggestions: May deprecate (user can manually search instead)

### Performance

- Helpfulness scoring: Run agents in parallel (10 results × 500ms each = ~500ms total with Promise.all)
- MCP queries: Already parallelized in existing code
- IndexedDB writes: Non-blocking (existing implementation)

### Migration Path

- Phase 1: Implement search API + helpfulness agent + tests
- Phase 2: Implement add-nodes API + tests
- Phase 3: Build RightChatPanel workspace mode + tests
- Phase 4: Add metric cards to IntermediateReportPanel + tests
- Phase 5: Remove left sidebar, update WorkspaceView layout
- Phase 6: Integration tests, manual QA, update PRD/PLAN docs

---

## Open Questions

None (all clarified during design phase).

---

## Success Criteria

- User can search without auto-adding results to graph
- Helpfulness scores guide selection (high scores appear first)
- Multi-select + batch add works reliably
- Report regeneration is manual, shows staleness badge
- Metric cards display context-appropriate stats
- All tests pass (TDD coverage per CLAUDE.md)
- Zero regressions in existing features (citation linking, graph rendering, India Lens)

---

## Related Documents

- **PRD**: `amd-docs/PRD.md` (needs update to reflect manual workflow)
- **Implementation Plan**: To be created via writing-plans skill
- **Test Coverage**: `CLAUDE.md` (TDD requirements)
- **Current Status**: `amd-docs/IMPLEMENTATION.md`
