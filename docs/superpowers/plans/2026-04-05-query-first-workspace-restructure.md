# Query-First Workspace Restructure Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace workspace-centric search/report interactions with a query-centric architecture where each query has its own mode, search session, filters, and intermediate report while sharing a workspace-scoped graph.

**Architecture:** Unify planner-driven search fanout for both GET and POST search contracts, then adapt POST to query-view UX payloads. Promote Query as first-class state (mode, india lens, timeline, report, chat turns). Remove old workspace-level mode/report assumptions instead of layering compatibility UI.

**Tech Stack:** Hono API, Mastra agents, React + Context, IndexedDB (`workspaceStoreV2`), Vitest

---

## Chunk 1: Backend Query Search Core (Planner + Multi-Source Fanout)

### Task 1: Add failing tests for planner-backed POST manual/query search

**Files:**
- Modify: `apps/api/src/__tests__/search.test.ts`

- [ ] **Step 1: Add failing test for POST /api/entropy/search using planner-derived terms**

```ts
it("should use planner-style query decomposition for manual/query search", async () => {
  // mock source tools where query plan values are required to produce results
  // assert post contract returns at least one result from each expected source when tools available
});
```

- [ ] **Step 2: Add failing test for Open Targets fallback via validate_target in POST flow**

```ts
it("should include Open Targets results via validate_target when searchTargets tool is missing", async () => {
  // searchTargets missing, validate_target available -> expect Open Targets in searchedSources + results
});
```

- [ ] **Step 3: Add failing test for Patents diagnostics-only behavior in POST flow**

```ts
it("should return Patents diagnostics without calling deprecated endpoint", async () => {
  // assert sourceDiagnostics.PatentsView indicates temporary migration hold
});
```

- [ ] **Step 4: Run tests to verify failures**

Run: `./node_modules/.bin/vitest run apps/api/src/__tests__/search.test.ts`
Expected: FAIL on new planner/diagnostics behavior

### Task 2: Refactor POST manual/query search to use shared planned fanout core

**Files:**
- Modify: `apps/api/src/routes/entropy.ts`
- Test: `apps/api/src/__tests__/search.test.ts`

- [ ] **Step 1: Extract shared source fanout function used by GET and POST paths**

Create a reusable internal function shape:

```ts
type FanoutInput = {
  plan: QueryPlan;
  types: SearchType[];
  limit: number;
};

type FanoutOutput = {
  items: SearchResult[];
  errors: Record<string, string>;
  sourcesSucceeded: string[];
};
```

- [ ] **Step 2: Update `runUnifiedSearch` to call extracted fanout core**

- [ ] **Step 3: Update `runManualSearch` to build query plan then call extracted fanout core**

Manual path must still return:
- scored `results` with manual entity shape
- `searchedSources`
- `sourceDiagnostics`

- [ ] **Step 4: Implement Patents diagnostics-only path in POST flow**

When POST/manual flow includes patents fanout, return deterministic diagnostic entry:

```ts
sourceDiagnostics.PatentsView = "Temporarily disabled during USPTO ODP migration"
```

Do not fail the whole request.

- [ ] **Step 5: Keep Open Targets fallback to `validate_target` if `searchTargets/search_targets` is absent**

- [ ] **Step 6: Run tests to verify pass**

Run: `./node_modules/.bin/vitest run apps/api/src/__tests__/search.test.ts`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add apps/api/src/routes/entropy.ts apps/api/src/__tests__/search.test.ts
git commit -m "refactor(api): unify planner-driven query search fanout"
```

---

## Chunk 2: Helpfulness Scoring (Query-Intent-Centric)

### Task 3: Add failing tests for query-only helpfulness behavior

**Files:**
- Modify: `apps/mastra-app/src/__tests__/helpfulness-agent.test.ts`

- [ ] **Step 1: Add failing test ensuring score is driven by query intent even with dense graph**
- [ ] **Step 2: Add failing test ensuring graph novelty bonus is not applied in query mode**
- [ ] **Step 3: Add failing test for source/type relevance weighting (e.g., trials for trial-intent query)**
- [ ] **Step 4: Run tests to verify failures**

Run: `./node_modules/.bin/vitest run apps/mastra-app/src/__tests__/helpfulness-agent.test.ts`
Expected: FAIL on new scoring expectations

### Task 4: Implement query-intent helpfulness strategy

**Files:**
- Modify: `apps/mastra-app/src/agents/helpfulness-agent.ts`
- Test: `apps/mastra-app/src/__tests__/helpfulness-agent.test.ts`

- [ ] **Step 1: Add minimal scoring strategy switch**

```ts
type ScoringMode = "graph-gap" | "query-intent";
```

Default POST/query flow should use `query-intent`.

- [ ] **Step 2: Implement query-intent score components**
- direct query term match in label/metadata
- source/type fit to intent keywords (trial/paper/protein/compound/target)
- optional small freshness bonus when date metadata available

- [ ] **Step 3: Keep duplicate detection as hard guard (entity already in graph => low/zero score)**

- [ ] **Step 4: Run tests to verify pass**

Run: `./node_modules/.bin/vitest run apps/mastra-app/src/__tests__/helpfulness-agent.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/mastra-app/src/agents/helpfulness-agent.ts apps/mastra-app/src/__tests__/helpfulness-agent.test.ts apps/api/src/routes/entropy.ts
git commit -m "feat(mastra): switch query search helpfulness to intent scoring"
```

---

## Chunk 3: Query-First Data Model + Persistence Migration

### Task 5: Add failing tests for query-scoped mode/report/filters model

**Files:**
- Modify: `entropy-research-hub/src/lib/storage/workspaceStoreV2.test.ts`
- Modify: `entropy-research-hub/src/contexts/WorkspaceContext.test.tsx`

- [ ] **Step 1: Add failing test for migration from workspace-level mode/report to first query session**
- [ ] **Step 2: Add failing test for `activeQueryId` persistence**
- [ ] **Step 3: Add failing test for query-level fields (`mode`, `indiaLens`, `timelineStart`, `timelineEnd`, `report`)**
- [ ] **Step 4: Run tests to verify failures**

Run:
- `npm test -- src/lib/storage/workspaceStoreV2.test.ts --run`
- `npm test -- src/contexts/WorkspaceContext.test.tsx --run`

Expected: FAIL

### Task 6: Implement query-first type and store/context migration

**Files:**
- Modify: `entropy-research-hub/src/types/workspace.ts`
- Modify: `entropy-research-hub/src/lib/storage/workspaceStoreV2.ts`
- Modify: `entropy-research-hub/src/lib/storage/workspaceStorage.ts`
- Modify: `entropy-research-hub/src/contexts/WorkspaceContext.tsx`
- Modify: `entropy-research-hub/src/lib/data/demoWorkspaceSeed.ts`

- [ ] **Step 1: Add `WorkspaceQuerySession` type and query-owned report/filters/mode**
- [ ] **Step 2: Add `activeQueryId` to workspace**
- [ ] **Step 3: Implement migration normalization for existing saved workspaces**
- [ ] **Step 4: Add context actions: `createQuery`, `setActiveQuery`, `updateActiveQuery`, `updateQueryReport`**
- [ ] **Step 5: Keep graph storage workspace-scoped and `addedByQuery` intact**
- [ ] **Step 6: Run tests to verify pass**

Run:
- `npm test -- src/lib/storage/workspaceStoreV2.test.ts src/contexts/WorkspaceContext.test.tsx --run`

Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add entropy-research-hub/src/types/workspace.ts entropy-research-hub/src/lib/storage/workspaceStoreV2.ts entropy-research-hub/src/lib/storage/workspaceStorage.ts entropy-research-hub/src/contexts/WorkspaceContext.tsx entropy-research-hub/src/lib/data/demoWorkspaceSeed.ts entropy-research-hub/src/lib/storage/workspaceStoreV2.test.ts entropy-research-hub/src/contexts/WorkspaceContext.test.tsx
git commit -m "refactor(frontend): migrate workspace model to query-first sessions"
```

---

## Chunk 4: Routing and Query View Restructure

### Task 7: Add failing route tests for workspace query list and query detail

**Files:**
- Create: `entropy-research-hub/src/pages/WorkspaceQueriesPage.test.tsx`
- Modify: `entropy-research-hub/src/pages/WorkspacesPage.test.tsx`
- Modify: `entropy-research-hub/src/pages/WorkspaceView.routing.test.tsx`

- [ ] **Step 1: Add failing test `/workspaces/:workspaceId` shows query list**
- [ ] **Step 2: Add failing test create-query action navigates to `/workspaces/:workspaceId/queries/:queryId`**
- [ ] **Step 3: Add failing test query switcher updates route in query view**
- [ ] **Step 4: Run tests to verify failures**

Run: `npm test -- src/pages/WorkspaceQueriesPage.test.tsx src/pages/WorkspacesPage.test.tsx src/pages/WorkspaceView.routing.test.tsx --run`
Expected: FAIL

### Task 8: Implement query list page + query detail route

**Files:**
- Create: `entropy-research-hub/src/pages/WorkspaceQueriesPage.tsx`
- Create: `entropy-research-hub/src/pages/WorkspaceQueryView.tsx`
- Modify: `entropy-research-hub/src/App.tsx`
- Modify: `entropy-research-hub/src/pages/WorkspacesPage.tsx`
- Modify: `entropy-research-hub/src/pages/WorkspaceView.tsx` (convert to adapter/redirect or replace)

- [ ] **Step 1: Add route `/workspaces/:workspaceId` -> query list page**
- [ ] **Step 2: Add route `/workspaces/:workspaceId/queries/:queryId` -> query detail page**
- [ ] **Step 3: Ensure create workspace leads to query list, not direct old view**
- [ ] **Step 4: Add create query flow with initial mode choice (Researcher/Strategist)**
- [ ] **Step 5: Remove workspace top-level mode toggle from query detail page**
- [ ] **Step 6: Run tests to verify pass**

Run: `npm test -- src/pages/WorkspaceQueriesPage.test.tsx src/pages/WorkspacesPage.test.tsx src/pages/WorkspaceView.routing.test.tsx --run`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add entropy-research-hub/src/App.tsx entropy-research-hub/src/pages/WorkspacesPage.tsx entropy-research-hub/src/pages/WorkspaceQueriesPage.tsx entropy-research-hub/src/pages/WorkspaceQueryView.tsx entropy-research-hub/src/pages/WorkspaceView.tsx entropy-research-hub/src/pages/WorkspaceQueriesPage.test.tsx entropy-research-hub/src/pages/WorkspacesPage.test.tsx entropy-research-hub/src/pages/WorkspaceView.routing.test.tsx
git commit -m "feat(frontend): add query-first workspace routing and query list"
```

---

## Chunk 5: Chat-Style Query Sidebar + Query Filters

### Task 9: Add failing sidebar tests for chat interaction and filters

**Files:**
- Modify: `entropy-research-hub/src/components/layout/RightChatPanel.test.tsx`
- Modify: `entropy-research-hub/src/lib/api/search.test.ts`

- [ ] **Step 1: Add failing test for chat turn rendering (user message + assistant result turn)**
- [ ] **Step 2: Add failing test for India Lens toggle in workspace query sidebar**
- [ ] **Step 3: Add failing test for timeline filter start/end in request payload**
- [ ] **Step 4: Add failing test for source diagnostics shown inline in assistant turn**
- [ ] **Step 5: Run tests to verify failures**

Run: `npm test -- src/components/layout/RightChatPanel.test.tsx src/lib/api/search.test.ts --run`
Expected: FAIL

### Task 10: Implement chat-style right sidebar for query view

**Files:**
- Modify: `entropy-research-hub/src/components/layout/RightChatPanel.tsx`
- Modify: `entropy-research-hub/src/lib/api/search.ts`
- Modify/create: `entropy-research-hub/src/components/workspace/SearchResultCard.tsx`

- [ ] **Step 1: Replace single-line search layout with chat composer + turn list**
- [ ] **Step 2: Add query filters in sidebar controls (India Lens + timeline range)**
- [ ] **Step 3: Send active query metadata in search payload (`queryId`, mode, filters)**
- [ ] **Step 4: Keep result multi-select and add-to-graph action from assistant turn**
- [ ] **Step 5: Render source success/unavailable diagnostics in assistant turn**
- [ ] **Step 6: Run tests to verify pass**

Run: `npm test -- src/components/layout/RightChatPanel.test.tsx src/lib/api/search.test.ts src/components/workspace/SearchResultCard.test.tsx --run`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add entropy-research-hub/src/components/layout/RightChatPanel.tsx entropy-research-hub/src/components/layout/RightChatPanel.test.tsx entropy-research-hub/src/lib/api/search.ts entropy-research-hub/src/lib/api/search.test.ts entropy-research-hub/src/components/workspace/SearchResultCard.tsx entropy-research-hub/src/components/workspace/SearchResultCard.test.tsx
git commit -m "feat(frontend): rebuild query sidebar as chat-style intent search"
```

---

## Chunk 6: Query-Specific Intermediate Report + Integration Cleanup

### Task 11: Add failing tests for query-specific report binding

**Files:**
- Modify: `entropy-research-hub/src/pages/WorkspaceView.integration.test.tsx`
- Modify: `entropy-research-hub/src/pages/WorkspaceView.search-layout.test.tsx`
- Modify: `entropy-research-hub/src/pages/WorkspaceView.dossier.test.tsx`
- Modify: `entropy-research-hub/src/pages/WorkspaceView.citation-linking.test.tsx`

- [ ] **Step 1: Add failing test that active query switch changes report shown**
- [ ] **Step 2: Add failing test that staleness is computed per active query report baseline**
- [ ] **Step 3: Add failing test that query mode cannot be toggled in query view**
- [ ] **Step 4: Run tests to verify failures**

Run: `npm test -- src/pages/WorkspaceView.integration.test.tsx src/pages/WorkspaceView.search-layout.test.tsx src/pages/WorkspaceView.dossier.test.tsx src/pages/WorkspaceView.citation-linking.test.tsx --run`
Expected: FAIL

### Task 12: Bind IntermediateReportPanel to active query and remove old assumptions

**Files:**
- Modify: `entropy-research-hub/src/components/workspace/IntermediateReportPanel.tsx`
- Modify: `entropy-research-hub/src/pages/WorkspaceQueryView.tsx`
- Modify: `entropy-research-hub/src/lib/utils/reportMetrics.ts`
- Remove/replace obsolete tests: `entropy-research-hub/src/pages/WorkspaceView.query-lifecycle.test.tsx`

- [ ] **Step 1: Wire report input from active query session, not workspace root**
- [ ] **Step 2: Use active query text for metrics and report generation actions**
- [ ] **Step 3: Keep graph workspace-scoped while query citations highlight graph nodes**
- [ ] **Step 4: Remove obsolete workspace-level lifecycle test file if still present**
- [ ] **Step 5: Run tests to verify pass**

Run: `npm test -- src/pages/WorkspaceView.integration.test.tsx src/pages/WorkspaceView.search-layout.test.tsx src/pages/WorkspaceView.dossier.test.tsx src/pages/WorkspaceView.citation-linking.test.tsx --run`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add entropy-research-hub/src/components/workspace/IntermediateReportPanel.tsx entropy-research-hub/src/pages/WorkspaceQueryView.tsx entropy-research-hub/src/lib/utils/reportMetrics.ts entropy-research-hub/src/pages/WorkspaceView.integration.test.tsx entropy-research-hub/src/pages/WorkspaceView.search-layout.test.tsx entropy-research-hub/src/pages/WorkspaceView.dossier.test.tsx entropy-research-hub/src/pages/WorkspaceView.citation-linking.test.tsx entropy-research-hub/src/pages/WorkspaceView.query-lifecycle.test.tsx
git commit -m "refactor(frontend): scope intermediate report to active query"
```

---

## Chunk 7: Documentation and Final Verification

### Task 13: Update implementation docs with new architecture and scope cuts

**Files:**
- Modify: `amd-docs/IMPLEMENTATION.md`
- Modify: `amd-docs/PRD.md`
- Create: `amd-docs/MIGRATION_QUERY_MODEL.md`

- [ ] **Step 1: Document query-first model and route changes**
- [ ] **Step 2: Document unified planner search behavior in query flow**
- [ ] **Step 3: Document Patents diagnostics-only scope decision**
- [ ] **Step 4: Commit docs**

```bash
git add amd-docs/IMPLEMENTATION.md amd-docs/PRD.md amd-docs/MIGRATION_QUERY_MODEL.md
git commit -m "docs: record query-first architecture and migration decisions"
```

### Task 14: Full verification gate before PR update

**Files:**
- No code changes required unless failures

- [ ] **Step 1: Run backend tests**

Run: `./node_modules/.bin/vitest run apps/api/src/__tests__/entropy.test.ts apps/api/src/__tests__/search.test.ts apps/api/src/__tests__/add-nodes.test.ts`

- [ ] **Step 2: Run mastra tests**

Run: `./node_modules/.bin/vitest run apps/mastra-app/src/__tests__/helpfulness-agent.test.ts`

- [ ] **Step 3: Run affected frontend tests**

Run: `npm test -- --run src/components/layout/RightChatPanel.test.tsx src/pages/WorkspaceView.integration.test.tsx src/pages/WorkspaceView.search-layout.test.tsx src/pages/WorkspaceView.dossier.test.tsx src/pages/WorkspaceView.citation-linking.test.tsx src/pages/WorkspaceView.routing.test.tsx`

- [ ] **Step 4: Run full frontend suite + build**

Run:
- `npm test -- --run`
- `npm run build`

- [ ] **Step 5: If any unavoidable external failure exists, document in `amd-docs/TEST_FAILURES.md`**

- [ ] **Step 6: Final commit for verification and minor fixups**

```bash
git add .
git commit -m "test: verify query-first restructure and stabilize regressions"
```

---

Plan complete and saved to `docs/superpowers/plans/2026-04-05-query-first-workspace-restructure.md`. Ready to execute.
