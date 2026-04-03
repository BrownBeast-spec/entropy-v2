# Entropy v2 Implementation Plan — AMD Slingshot Hackathon 2026

**Sprint:** April 4–7, 2026 (3 days to demo-ready)  
**Demo date:** April 7–8, 2026  
**Approach:** Test-Driven Development (TDD) with tracer-bullet vertical slices

---

## Planning Philosophy

This plan follows **tracer-bullet development**: each phase delivers a complete vertical slice from backend → frontend → demo-visible behavior. We prioritize the **demo script** (PRD lines 399-400) and build exactly what the judges will see, in the order they'll see it.

### Demo Script Sequence (our north star)

1. Create workspace → Enter repurposing query ("Repurpose metformin for NASH in Indian population")
2. Watch live progress log → Arrive at three-panel view
3. Toggle India Lens → Show CDSCO badge on metformin node
4. Click node → Open detail drawer
5. Show intermediate report with citations
6. Add follow-up query from suggestion chip → Show graph expansion
7. Switch to Strategist Mode → Run competitive query
8. Show Dominant Companies table and AI Insights

---

## Phase 1: Core Knowledge Graph Augmentation (Day 1, April 4)

**Goal:** Get the first query → graph → report loop working end-to-end with real data.

### 1.1 Backend: Augmentation API Contract (TDD)

**Test first** (`apps/api/src/__tests__/augment.test.ts`):

```typescript
describe("POST /api/causaly/augment", () => {
  it("returns newNodes and newEdges arrays for a well-formed request", async () => {
    const response = await request(app)
      .post("/api/causaly/augment")
      .send({
        query: "metformin NASH",
        graphSnapshot: { nodeIds: [], edgeSummary: [] },
        personaMode: "Researcher",
        indiaLens: false,
        workspaceId: "test-ws-1",
      });
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("newNodes");
    expect(response.body).toHaveProperty("newEdges");
    expect(response.body).toHaveProperty("completenessScore");
  });

  it("returns empty delta when completeness score >= 85 on first iteration", async () => {
    // Test with a rich existing graph
  });

  it("never exceeds 3 iterations regardless of completeness score", async () => {
    // Test iteration cap
  });

  it("includes failed source names in failedSources when an MCP tool throws", async () => {
    // Test error resilience
  });
});
```

**Then implement:**

- Create `apps/api/src/routes/causaly.ts`
- Schema: `AugmentRequestSchema` with Zod
- Response: `{ newNodes[], newEdges[], completenessScore, iterationsRun, failedSources[] }`
- Wire to existing MCP tool orchestration from `entropy.ts`
- Add 1-hour cache per (query + graphSnapshot hash)

**Files to create/modify:**

- `apps/api/src/routes/causaly.ts`
- `apps/api/src/__tests__/augment.test.ts`
- `apps/api/src/index.ts` (mount route)

### 1.2 Backend: CompletenessAgent (TDD)

**Test first** (`packages/mastra-app/src/agents/__tests__/completeness-agent.test.ts`):

```typescript
describe('CompletenessAgent', () => {
  it('returns score >= 85 for graph with >= 8 high-confidence nodes', async () => {
    const result = await completenessAgent.generate({
      query: 'metformin NASH',
      graphSummary: { nodes: [...8 relevant nodes], edges: [] }
    });
    expect(result.score).toBeGreaterThanOrEqual(85);
  });

  it('returns score < 40 and non-empty missingNodes for empty graph', async () => {
    // Test empty state
  });

  it('uses fallback deterministic rule when LLM response is malformed', async () => {
    // Test fallback
  });
});
```

**Then implement:**

- Create `packages/mastra-app/src/agents/completeness-agent.ts`
- Structured output: `{ score: number, missingNodes: string[], missingEdges: string[] }`
- Fallback rule: if nodes >= 8 relevant → score 90

**Files to create:**

- `packages/mastra-app/src/agents/completeness-agent.ts`
- `packages/mastra-app/src/agents/__tests__/completeness-agent.test.ts`

### 1.3 Frontend: WorkspaceStore v2 with IndexedDB (TDD)

**Test first** (`entropy-research-hub/src/lib/storage/__tests__/workspaceStore.test.ts`):

```typescript
import { workspaceStore } from "../workspaceStoreV2";

describe("WorkspaceStore v2", () => {
  beforeEach(() => workspaceStore.clear());

  it("createWorkspace creates workspace with correct defaults and unique ID", async () => {
    const ws = await workspaceStore.createWorkspace("Test Workspace");
    expect(ws.id).toBeTruthy();
    expect(ws.mode).toBe("Researcher");
    expect(ws.indiaLens).toBe(false);
    expect(ws.nodes).toEqual([]);
  });

  it("augmentGraph merges new nodes without duplicating same ID", async () => {
    const ws = await workspaceStore.createWorkspace("Test");
    const node1 = { id: "P12345", label: "TP53", type: "protein" /* ... */ };
    await workspaceStore.augmentGraph(ws.id, "query1", [node1], []);
    await workspaceStore.augmentGraph(ws.id, "query2", [node1], []);

    const updated = await workspaceStore.getById(ws.id);
    expect(updated.nodes.length).toBe(1);
    expect(updated.nodes[0].provenance.length).toBe(2); // Merged provenance
  });

  it("removeNode removes node and all edges that reference it", async () => {
    // Test cascade delete
  });

  it("exportWorkspaceJSON returns valid JSON-serializable object", async () => {
    // Test export
  });
});
```

**Then implement:**

- Create `entropy-research-hub/src/lib/storage/workspaceStoreV2.ts`
- Use `idb-keyval` for IndexedDB persistence
- Key: `entropy-workspace-v2`
- Implement PRD node/edge schemas with provenance
- Methods: `createWorkspace`, `augmentGraph`, `mergeNodes`, `removeNode`, `exportWorkspaceJSON`

**Files to create:**

- `entropy-research-hub/src/lib/storage/workspaceStoreV2.ts`
- `entropy-research-hub/src/lib/storage/__tests__/workspaceStore.test.ts`
- Update `entropy-research-hub/package.json` to add `idb-keyval`

### 1.4 Frontend: Wire Augmentation Flow (Integration)

**Integration test** (`entropy-research-hub/src/__tests__/augmentation-flow.test.ts`):

```typescript
describe("Augmentation Flow Integration", () => {
  it("submits query, calls augment API, merges delta to workspace", async () => {
    // Mock fetch for /api/causaly/augment
    // Create workspace
    // Submit query
    // Verify API called with correct payload
    // Verify workspace updated with new nodes/edges
  });
});
```

**Then implement:**

- Create `entropy-research-hub/src/lib/api/augmentation.ts`
- Function: `augmentWorkspace(workspaceId, query, graphSnapshot, personaMode, indiaLens)`
- Update `WorkspaceView.tsx` to call real API instead of demo data
- Wire progress overlay to real iteration count

**Files to modify:**

- `entropy-research-hub/src/lib/api/augmentation.ts` (new)
- `entropy-research-hub/src/pages/WorkspaceView.tsx`
- `entropy-research-hub/src/components/workspace/ResearchProgressOverlay.tsx`

### 1.5 Checkpoint: First Vertical Slice

**Demo-visible behavior:**

- ✅ User creates workspace
- ✅ User enters query "metformin NASH"
- ✅ Progress overlay shows real iteration count
- ✅ Graph panel shows real nodes from MCP tools
- ✅ Provenance metadata attached to each node

**Run tests:**

```bash
cd apps/api && npm test -- augment.test.ts
cd packages/mastra-app && npm test -- completeness-agent.test.ts
cd entropy-research-hub && npm test -- workspaceStore.test.ts
cd entropy-research-hub && npm test -- augmentation-flow.test.ts
```

---

## Phase 2: India Lens + Provenance UI (Day 2 Morning, April 5)

**Goal:** Show India-specific badges and transparent provenance.

### 2.1 Backend: Static India Data Bundles

**No tests needed** (static data assets):

- Collect CDSCO approved drug CSV → `apps/api/src/data/cdsco-approved.json`
- Collect NPPA price cap CSV → `apps/api/src/data/nppa-price-caps.json`
- Curate Indian company list → `apps/api/src/data/indian-companies.json`

**Files to create:**

- `apps/api/src/data/cdsco-approved.json`
- `apps/api/src/data/nppa-price-caps.json`
- `apps/api/src/data/indian-companies.json`

### 2.2 Frontend: IndiaLensProcessor (TDD)

**Test first** (`entropy-research-hub/src/lib/__tests__/indiaLens.test.ts`):

```typescript
describe("IndiaLensProcessor", () => {
  it("correctly identifies Indian assignee by name suffix matching", () => {
    const node = {
      id: "US123",
      label: "Patent",
      metadata: { assignee: "Sun Pharma Pvt Ltd" },
    };
    const result = processIndiaLens([node]);
    expect(result[0].indiaContext.isIndianPatent).toBe(true);
  });

  it("matches drug name against CDSCO CSV case-insensitively", () => {
    const node = { id: "C1234", label: "Metformin", type: "drug" };
    const result = processIndiaLens([node]);
    expect(result[0].indiaContext.isCDSCO).toBe(true);
  });

  it("matches drug name against NPPA CSV and returns price cap", () => {
    // Test NPPA price matching
  });

  it("is idempotent — running twice produces same result", () => {
    // Test idempotence
  });
});
```

**Then implement:**

- Create `entropy-research-hub/src/lib/indiaLens.ts`
- Load static datasets at module init
- Function: `processIndiaLens(nodes: GraphNode[]): GraphNode[]`
- Mutate `indiaContext` field on matching nodes

**Files to create:**

- `entropy-research-hub/src/lib/indiaLens.ts`
- `entropy-research-hub/src/lib/__tests__/indiaLens.test.ts`

### 2.3 Frontend: Provenance Panel UI

**Visual test** (manual, no unit test needed):

- Add provenance panel below graph canvas in `KnowledgeGraphPanel.tsx`
- Show: total node count, edge count, source breakdown, last updated timestamp
- Pull data from workspace store

**Files to modify:**

- `entropy-research-hub/src/components/workspace/KnowledgeGraphPanel.tsx`

### 2.4 Frontend: India Lens Toggle Behavior

**Integration test**:

```typescript
describe("India Lens Toggle", () => {
  it("applies India badges to all nodes when toggled on", async () => {
    // Create workspace with metformin node
    // Toggle India Lens
    // Verify node has CDSCO badge
  });

  it("persists India Lens state per workspace", async () => {
    // Toggle on, close workspace, reopen
    // Verify state restored
  });
});
```

**Files to modify:**

- `entropy-research-hub/src/pages/WorkspaceView.tsx`
- `entropy-research-hub/src/components/workspace/KnowledgeGraphPanel.tsx` (badge rendering)

### 2.5 Checkpoint: India Lens Vertical Slice

**Demo-visible behavior:**

- ✅ User toggles India Lens
- ✅ Metformin node shows CDSCO approval badge
- ✅ Indian patent nodes show India flag
- ✅ Provenance panel shows "5 nodes from Open Targets, 3 from STRING, last updated 2 min ago"

---

## Phase 3: Report Synthesis + Citation Linking (Day 2 Afternoon, April 5)

**Goal:** Generate intermediate report with clickable citations that highlight graph nodes.

### 3.1 Backend: Synthesis API (TDD)

**Test first** (`apps/api/src/__tests__/synthesise.test.ts`):

```typescript
describe('POST /api/causaly/synthesise', () => {
  it('returns sections with content and citations for Researcher mode', async () => {
    const response = await request(app).post('/api/causaly/synthesise').send({
      graphSnapshot: { nodes: [...], edges: [...] },
      personaMode: 'Researcher',
      reportSections: ['Overview', 'Key Targets']
    });
    expect(response.body.sections).toHaveLength(2);
    expect(response.body.sections[0].citations.length).toBeGreaterThan(0);
  });

  it('returns different sections for Strategist mode', async () => {
    // Test Strategist sections
  });
});
```

**Then implement:**

- Add `POST /api/causaly/synthesise` to `apps/api/src/routes/causaly.ts`
- Use existing `evidenceSummarizerAgent` pattern
- Response: `{ sections: [{ title, content, citations[] }] }`
- No caching (always reflects current graph)

### 3.2 Frontend: IntermediateReportEditor with Citation Badges (TDD)

**Test first** (`entropy-research-hub/src/components/workspace/__tests__/IntermediateReportPanel.test.ts`):

```typescript
describe('IntermediateReportPanel', () => {
  it('renders citation badges for each citation in source markdown', () => {
    const sections = [{
      title: 'Overview',
      content: 'Metformin is approved for T2D',
      citations: [{ id: 'c1', nodeId: 'P12345', source: 'Open Targets', label: 'OT:ENSG00000' }]
    }];
    render(<IntermediateReportPanel sections={sections} />);
    expect(screen.getByText('OT:ENSG00000')).toBeInTheDocument();
  });

  it('clicking citation badge highlights corresponding node in graph', () => {
    // Test click handler
  });

  it('preserves citation badges after paragraph edit', () => {
    // Test editing behavior
  });
});
```

**Then implement:**

- Use TipTap editor with custom citation node extension
- Citation badges render as colored chips
- onClick handler: call parent `onCitationClick(nodeId)` to highlight node

**Files to modify:**

- `entropy-research-hub/src/components/workspace/IntermediateReportPanel.tsx`

### 3.3 Frontend: Wire Report Generation

**Integration test**:

```typescript
describe("Report Generation Flow", () => {
  it("calls synthesis API after augmentation completes", async () => {
    // Submit query
    // Wait for augmentation
    // Verify synthesis API called
    // Verify report rendered
  });
});
```

**Files to modify:**

- `entropy-research-hub/src/lib/api/synthesis.ts` (new)
- `entropy-research-hub/src/pages/WorkspaceView.tsx`

### 3.4 Checkpoint: Report Vertical Slice

**Demo-visible behavior:**

- ✅ After query completes, intermediate report auto-generates
- ✅ Report shows "Overview", "Key Targets and Evidence", "Safety Signals"
- ✅ Citations appear as blue badges: "[Open Targets: ENSG00000141510]"
- ✅ Clicking citation highlights TP53 node in graph canvas

---

## Phase 4: Follow-up Queries + Graph Expansion (Day 3 Morning, April 6)

**Goal:** Enable adding new queries and seeing cumulative graph growth.

### 4.1 Backend: FollowUpSuggestionAgent (TDD)

**Test first** (`packages/mastra-app/src/agents/__tests__/followup-agent.test.ts`):

```typescript
describe('FollowUpSuggestionAgent', () => {
  it('returns 3 follow-up suggestions for Researcher mode', async () => {
    const result = await followUpAgent.generate({
      graphSummary: { nodes: [...], edges: [...] },
      personaMode: 'Researcher'
    });
    expect(result.suggestions).toHaveLength(3);
  });

  it('returns Strategist-specific suggestions for Strategist mode', async () => {
    // Test Strategist suggestions
  });
});
```

**Then implement:**

- Create `packages/mastra-app/src/agents/followup-agent.ts`
- Output: `{ suggestions: string[] }` (3 items)
- Add `GET /api/causaly/suggestions` endpoint
- Cache 10 min per graph state hash

### 4.2 Frontend: Follow-up Suggestion Chips (TDD)

**Test first**:

```typescript
describe("Follow-up Suggestions", () => {
  it("displays 3 AI-generated suggestions after query completes", () => {
    // Mock suggestions API
    // Render WorkspaceView
    // Verify 3 chips displayed
  });

  it("clicking suggestion chip pre-fills and submits query", async () => {
    // Click chip
    // Verify augmentation triggered
  });
});
```

**Files to modify:**

- `entropy-research-hub/src/pages/WorkspaceView.tsx`
- Add suggestion chip UI to left panel

### 4.3 Frontend: Query History with Node Highlighting (TDD)

**Test first**:

```typescript
describe("Query History", () => {
  it("shows all queries with node counts and dates", () => {
    // Render with 2 queries
    // Verify both listed with metadata
  });

  it("clicking query in history highlights its contributed nodes", () => {
    // Click query
    // Verify highlightedNodes prop updated
  });
});
```

**Files to modify:**

- `entropy-research-hub/src/pages/WorkspaceView.tsx`
- Left panel query history section

### 4.4 Checkpoint: Query Expansion Vertical Slice

**Demo-visible behavior:**

- ✅ User sees 3 follow-up suggestions: "What are safety signals for metformin?", "Find Indian trials for NASH", etc.
- ✅ User clicks "Find Indian trials for NASH"
- ✅ Progress overlay runs again (iteration 1 of 3)
- ✅ Graph expands with 4 new trial nodes
- ✅ Query history shows 2 queries with node counts

---

## Phase 5: Persona Mode + Strategist View (Day 3 Afternoon, April 6)

**Goal:** Toggle between Researcher and Strategist modes with visual weighting changes.

### 5.1 Frontend: Persona Mode Visual Weighting (TDD)

**Test first**:

```typescript
describe("Persona Mode Behavior", () => {
  it("de-emphasizes patent nodes in Researcher mode", () => {
    // Render graph with patent nodes
    // Verify size/opacity reduced
  });

  it("emphasizes patent nodes in Strategist mode", () => {
    // Toggle to Strategist
    // Verify patent nodes full weight
  });

  it("switching modes does not mutate underlying graph data", () => {
    // Toggle mode
    // Verify node count unchanged
  });
});
```

**Files to modify:**

- `entropy-research-hub/src/components/workspace/KnowledgeGraphPanel.tsx`
- Cytoscape style calculation based on `personaMode` prop

### 5.2 Frontend: Query Prompt Templates by Mode

**Files to modify:**

- `entropy-research-hub/src/lib/data/suggestedQueries.ts`
- Different prompt text for Researcher vs Strategist

### 5.3 Backend: Strategist Report Endpoint (Reuse Existing)

**No new code** — PRD says `POST /api/causaly/strategist` exists and is unchanged. Verify it works.

### 5.4 Frontend: Basic Strategist Report View (Simplified)

**For MVP, create minimal version:**

- Just render AI Insights text with citations
- Skip full Dominant Companies table (defer to post-hackathon)

**Files to create:**

- `entropy-research-hub/src/pages/StrategistReportView.tsx` (simplified)

### 5.5 Checkpoint: Persona Mode Vertical Slice

**Demo-visible behavior:**

- ✅ User toggles to Strategist Mode
- ✅ Patent and trial nodes become more prominent
- ✅ Protein interaction edges become lighter
- ✅ Query prompt changes to "Enter competitive intelligence question"
- ✅ User runs strategist query → sees AI insights about dominant players

---

## Phase 6: Polish + Demo Rehearsal (Day 4 Morning, April 7)

**Goal:** Make it look good and ensure reliability for demo.

### 6.1 UI Polish

- Add loading skeletons to all async states
- Ensure all tooltips have help text
- Add keyboard shortcuts (Escape to close drawer, etc.)
- Verify all buttons have hover states
- Add India Lens disclosure tooltip: "India signals are inferred from public data using heuristic matching — verify before citing"

### 6.2 Error Handling

- Add friendly error messages for API failures
- Test with network disconnected → show "Offline — showing cached data"
- Test with MCP tool failure → show partial results with warning

### 6.3 Demo Data Warm-up

- Pre-populate one demo workspace with metformin NASH data
- Ensure it loads instantly when demo starts
- Add "Reset to Demo State" button in Settings for rehearsal

### 6.4 Demo Rehearsal Script

**Run through full demo 3 times:**

1. Create workspace
2. Enter query
3. Toggle India Lens
4. Click node
5. Show report
6. Add follow-up
7. Switch to Strategist
8. Show Strategist insights

**Time it:** Should complete in < 5 minutes.

### 6.5 Fallback Completeness Rule Test

**Critical:** Test CompletenessAgent fallback when LLM fails:

```typescript
it('uses fallback deterministic rule when LLM call fails', async () => {
  // Mock LLM to throw
  const result = await completenessAgent.generate({...});
  expect(result.score).toBe(90); // Fallback rule
});
```

---

## Phase 7: Presentation Prep (Day 4 Afternoon, April 7)

### 7.1 Demo Slide Deck (3-5 slides max)

1. **Problem:** Fragmented pharma research for Indian teams
2. **Solution:** Persistent knowledge graph with India Lens
3. **Live Demo:** (screen recording as backup)
4. **Tech Stack:** React 19, Hono, Mastra, Cytoscape.js, 12+ MCP data sources
5. **AMD Angle:** "Built for data-intensive research workloads — perfect fit for AMD ROCm acceleration roadmap"

### 7.2 Backup Plan

- Record full demo walkthrough as video
- Export demo workspace as JSON
- Take screenshots of every screen

---

## Testing Strategy Summary

### TDD Sequence (Red-Green-Refactor)

For each feature:

1. **Write failing test** describing expected behavior
2. **Run test** — verify it fails for the right reason
3. **Write minimal code** to pass test
4. **Refactor** for clarity, keep tests passing

### Test Coverage Targets

**Backend:**

- ✅ All API endpoints: 100% contract coverage
- ✅ CompletenessAgent: 100% logic paths (including fallback)
- ✅ FollowUpSuggestionAgent: Response shape validation

**Frontend:**

- ✅ WorkspaceStore v2: 100% public method coverage
- ✅ IndiaLensProcessor: 100% logic paths
- ✅ UI components: Critical interaction paths (citation click, mode toggle, query submit)

### Integration Tests

- ✅ Full augmentation flow (frontend → backend → graph update)
- ✅ Report generation flow (augmentation → synthesis → display)
- ✅ India Lens toggle (backend data → frontend processor → visual badges)

---

## File Structure Summary

### New Backend Files

```
apps/api/src/
├── routes/
│   └── causaly.ts                      # NEW: Augment, synthesise, suggestions endpoints
├── data/                               # NEW: Static India datasets
│   ├── cdsco-approved.json
│   ├── nppa-price-caps.json
│   └── indian-companies.json
└── __tests__/
    ├── augment.test.ts                 # NEW
    └── synthesise.test.ts              # NEW

packages/mastra-app/src/agents/
├── completeness-agent.ts               # NEW
├── followup-agent.ts                   # NEW
└── __tests__/
    ├── completeness-agent.test.ts      # NEW
    └── followup-agent.test.ts          # NEW
```

### New Frontend Files

```
entropy-research-hub/src/
├── lib/
│   ├── storage/
│   │   ├── workspaceStoreV2.ts         # NEW: IndexedDB store
│   │   └── __tests__/
│   │       └── workspaceStore.test.ts  # NEW
│   ├── api/
│   │   ├── augmentation.ts             # NEW
│   │   └── synthesis.ts                # NEW
│   ├── indiaLens.ts                    # NEW
│   └── __tests__/
│       └── indiaLens.test.ts           # NEW
├── components/workspace/
│   └── __tests__/
│       └── IntermediateReportPanel.test.ts  # NEW
├── pages/
│   └── StrategistReportView.tsx        # NEW (simplified)
└── __tests__/
    └── augmentation-flow.test.ts       # NEW: E2E integration
```

---

## Success Criteria

### Must-Have for Demo (April 7-8)

- ✅ User can create workspace and enter query
- ✅ Graph renders with real nodes from MCP tools
- ✅ India Lens toggle shows badges on relevant nodes
- ✅ Intermediate report auto-generates with citations
- ✅ Citation click highlights node in graph
- ✅ Follow-up query expands graph cumulatively
- ✅ Persona mode toggle changes visual weighting
- ✅ Provenance panel shows source breakdown
- ✅ All tests pass: `npm test` in all packages

### Nice-to-Have (Defer if Time Runs Out)

- Full Strategist report with Dominant Companies table
- Timeline view variant
- Full dossier generation with SSE
- Standalone Protein Profile screen

---

## Daily Stand-up Questions

**Day 1 (April 4) EOD:**

- ✅ Can user submit query and get real graph back?
- ✅ Does CompletenessAgent terminate loop correctly?
- ✅ All Phase 1 tests passing?

**Day 2 (April 5) EOD:**

- ✅ Does India Lens badge appear on metformin?
- ✅ Does report generate with clickable citations?
- ✅ All Phase 2 & 3 tests passing?

**Day 3 (April 6) EOD:**

- ✅ Can user add follow-up query and see graph expand?
- ✅ Does Strategist mode toggle work?
- ✅ All Phase 4 & 5 tests passing?

**Day 4 (April 7) Pre-Demo:**

- ✅ Demo rehearsal completed 3 times successfully?
- ✅ Backup video recorded?
- ✅ All critical paths tested with network failures?

---

## Risk Mitigation

### Risk: MCP tools fail during demo

**Mitigation:** Pre-warm demo workspace with cached data. Add "Use cached demo data" fallback button.

### Risk: CompletenessAgent LLM call hangs

**Mitigation:** 5-second timeout + fallback deterministic rule (tested in Phase 1).

### Risk: IndexedDB quota exceeded

**Mitigation:** 200-node hard cap enforced in WorkspaceStore, warn user at 180 nodes.

### Risk: Cytoscape rendering fails on judge's machine

**Mitigation:** Graceful degradation to plain node list (PRD line 129), tested in Phase 6.

---

## Post-Hackathon Roadmap (Reference Only)

Not in scope for April 7-8, but mentioned in PRD:

- PostgreSQL workspace persistence
- WorkspaceStore v1 → v2 migration utility
- Live CDSCO/NPPA API integration
- AlphaFold structure viewer
- Full Strategist report with data tables
- Timeline + Dendrogram view variants
- Multi-language query support (Hindi)

---

## Final Checklist Before Demo

- [ ] All tests passing: `npm test` across all packages
- [ ] Demo workspace pre-loaded and accessible
- [ ] Network failure tested and handled gracefully
- [ ] India Lens disclosure tooltip visible
- [ ] Provenance panel always visible below graph
- [ ] Citation click → node highlight works
- [ ] Persona mode toggle works without data loss
- [ ] Follow-up suggestions appear after query
- [ ] Demo rehearsed 3 times, under 5 minutes
- [ ] Backup video recorded
- [ ] Slide deck finalized (3-5 slides)
- [ ] AMD angle clear in presentation

---

**Let's build this. Tests first, ship fast, win hackathon.**
