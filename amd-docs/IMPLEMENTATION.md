# Entropy v2 Implementation Status Audit

Date: 2026-04-04 (Updated)
Scope reviewed:

- `amd-docs/PRD.md`
- `apps/api/` (backend)
- `entropy-research-hub/` (frontend)

This document captures what is actually implemented right now, what is scaffolded, and what is still missing against the PRD for the AMD Slingshot Hackathon 2026.

Latest execution update (worktree: `amdv2-phase1`):

- Backend PRD phase-1 causaly routes implemented and tested (`augment`, `synthesise`, `suggestions`)
- Mastra helper agents for completeness/synthesis/follow-ups added and exported
- Frontend scaffold in this worktree synced to `entropy-research-hub/` and converted from gitlink tracking to regular repository files
- WorkspaceStore v2 implementation started in frontend with IndexedDB-backed storage module and passing unit tests
- Workspace navigation baseline now wired: create workspace action navigates to `/workspaces/:id`, route is mounted, and app is wrapped with `WorkspaceProvider`
- Workspace context persistence now migrated to WorkspaceStore v2 (`idb-keyval`) with legacy adapter retained only as fallback safety path
- Workspace query lifecycle now updates query status/metrics from real augment responses (`running -> complete/failed`, contributed node/edge IDs, completeness score, iterations)
- Fixed query contribution edge-ID mismatch bug so edge IDs persisted to graph and query metadata are consistent
- Added lifecycle regression test coverage in `WorkspaceView.query-lifecycle.test.tsx`
- Cytoscape dependency now explicitly installed in `entropy-research-hub` and validated with a non-mocked `KnowledgeGraphPanel` smoke test
- Frontend test setup now includes canvas context polyfill needed for Cytoscape runtime under jsdom
- WorkspaceView now fetches live follow-up suggestions from `/api/causaly/suggestions` after successful augment and falls back to static suggestions on API failure
- India Lens processor introduced and integrated into augment node ingestion path when India Lens is enabled
- WorkspaceView now triggers synthesis API after augment and persists generated report sections into workspace state when synthesis succeeds
- Repository-level testing guardrails added in `CLAUDE.md` and failure-log process added in `amd-docs/TEST_FAILURES.md`
- Suggestion chip click now submits immediately and executes augmentation against the chip text (no extra submit click required)
- Follow-up submissions now build cumulative graph snapshots from real in-session node/edge deltas rather than stale pre-query snapshots
- Query history entries now expose status and submitted-date metadata while preserving contributed-node highlight behavior on history click
- India Lens graph badge state now remains visible in provenance summary and India Lens toggle persistence is validated with workspace update assertions
- Persona mode visual weighting behavior now has direct unit validation via exported weighting helper tests
- Demo fallback dependency reduced: successful augment completion no longer auto-seeds static demo graph data when backend returns empty deltas
- Added `POST /api/causaly/dossier` SSE route with staged status events and final LaTeX payload generation
- WorkspaceView now triggers dossier generation via new frontend SSE client and includes regression coverage for API invocation flow
- India Lens disclosure tooltip now appears in graph provenance summary with PRD-aligned caution copy
- Workspace bootstrap now auto-seeds a deterministic Metformin NASH demo workspace when persistence is empty, and Settings Organization now includes a Reset to Demo State control that clears persisted workspace state and re-seeds the demo baseline

## Status legend

- Implemented: running code with concrete behavior (not just placeholders)
- Scaffolding: UI/module exists, but static, simulated, or not wired end-to-end
- Not implemented: no meaningful code path yet

---

## 1) Backend status (`apps/api`)

### Implemented

1. Hono API foundation and route mounting
   - Server boot with explicit root `.env` load in `src/server.ts`
   - Global CORS setup and route registration in `src/index.ts`
   - Health check route in `src/routes/health.ts`

2. Research session lifecycle API (Mastra workflow orchestration)
   - Route group: `src/routes/research.ts`
   - In-memory session store in `src/store/session-store.ts`
   - Workflow runner with event hooks in `src/lib/workflow-runner.ts`
   - Activity bus for live streaming in `src/lib/activity-bus.ts`
   - Supported endpoints:
     - `POST /api/research` (create session + start workflow)
     - `GET /api/research/:sessionId` (status/result)
     - `GET /api/research/:sessionId/agents` (per-agent state)
     - `POST /api/research/:sessionId/review` (HITL resume)
     - `GET /api/research/:sessionId/report` (PDF stream when complete)
     - `GET /api/research/:sessionId/preview` (HTML preview, includes fs fallback scan)
     - `GET /api/research/:sessionId/audit` (audit trail passthrough)
     - `GET /api/research/:sessionId/stream` (SSE with backlog replay + live updates)

3. Unified evidence search endpoint
   - Route group: `src/routes/entropy.ts`
   - Endpoints:
     - `GET /api/entropy/search`
     - `POST /api/entropy/search`
   - Supports source/type fanout: literature, preprints, proteins, compounds, trials, patents, targets, interactions
   - Uses MCP tool clients from `@entropy/mastra-app`
   - Includes:
     - Query planner agent (structured output with fallback)
     - Evidence summarizer agent (structured output with fallback)
     - Result deduplication and citation deduplication
     - Per-source error bag without hard-failing the full response
     - Europe PMC citation enrichment for literature results

4. Chat runtime endpoint (dynamic registration)
   - Route in `src/routes/chat.ts`
   - Registered in `src/index.ts` via dynamic import to avoid hard startup crash if CopilotKit deps are missing
   - Endpoint: `ALL /api/chat`

5. Basic API error shape standardization
   - `src/middleware/error-handler.ts`

6. Existing test coverage (backend)
   - `src/__tests__/api.test.ts` (session lifecycle routes + health + not found behavior)
   - `src/__tests__/entropy.test.ts` (entropy search behavior with mocked tool clients)
   - `src/__tests__/api-e2e.test.ts` (opt-in integration test for full workflow + PDF)

7. PRD causaly contract (phase 1) now implemented
   - Route group: `src/routes/causaly.ts`
   - Mounted in `src/index.ts` as `/api/causaly`
   - Endpoints implemented:
     - `POST /api/causaly/augment`
     - `POST /api/causaly/synthesise`
     - `GET /api/causaly/suggestions`
   - Behavior now present:
     - 3-iteration augmentation cap with completeness threshold short-circuit
     - Partial-result behavior with `failedSources` capture on per-source failures
     - Request validation and malformed JSON handling for all new endpoints
     - Route-level cache scaffold for augmentation keying by query+snapshot (disabled in tests)

8. New Mastra-side helper agents exported and tested
   - `apps/mastra-app/src/agents/completeness-agent.ts`
   - `apps/mastra-app/src/agents/synthesis-agent.ts`
   - `apps/mastra-app/src/agents/followup-agent.ts`
   - Exported via `apps/mastra-app/src/index.ts`

9. Added test suites for new PRD endpoints/contracts
   - `apps/api/src/__tests__/augment.test.ts`
   - `apps/api/src/__tests__/synthesise.test.ts`
   - `apps/api/src/__tests__/suggestions.test.ts`
   - `apps/mastra-app/src/__tests__/completeness-agent.test.ts`
   - `apps/mastra-app/src/__tests__/synthesis-agent.test.ts`
   - `apps/mastra-app/src/__tests__/followup-agent.test.ts`

### Scaffolding / partial

- Session persistence is in-memory only (Map), so process restarts lose sessions.
- HITL + SSE lifecycle is robust for the existing pipeline, but it is tied to current workflow contracts rather than the new PRD API contracts.

### Not implemented (vs PRD)

Also missing on backend for PRD parity:

- Full production CompletenessAgent LLM implementation (current logic is deterministic fallback helper)
- FollowUpSuggestionAgent LLM-driven generation (current helper is deterministic templates)
- Production-grade dossier generation contract parity (streaming progress depth, formatting pipeline, and integration with final PDF toolchain)
- Production-grade caching and invalidation strategy aligned to final PRD hashing/TTL rules

---

## 2) Frontend scaffolding status (`entropy-research-hub`)

### Implemented

1. Separate React + Vite app scaffold
   - Own `package.json`, build/test config, and `src/` tree
   - shadcn/ui style component base and layout scaffolding

2. Base shell and page set (legacy + entropy-oriented)
   - App shell components:
     - `src/components/layout/LeftSidebar.tsx`
     - `src/components/layout/TopBar.tsx`
     - `src/components/layout/RightChatPanel.tsx`
     - `src/components/layout/SettingsSidebar.tsx`
   - Existing pages include:
     - `AgentPage`, `TopicsPage`, `PeoplePage`, `CompaniesPage`, `AutomationsPage`
     - Settings pages (Organization, Members, Integrations, MCP Servers)
     - Additional entropy-specific settings pages (Data Sources, Graph Preferences, Export Preferences)

3. Workspace-related scaffolding modules exist
   - Data types: `src/types/workspace.ts`
   - Local storage adapter: `src/lib/storage/workspaceStorage.ts`
   - Context API: `src/contexts/WorkspaceContext.tsx`
   - Workspace view shell: `src/pages/WorkspaceView.tsx`
   - Workspace components:
     - `src/components/workspace/KnowledgeGraphPanel.tsx` (Cytoscape rendering + toolbar controls)
     - `src/components/workspace/IntermediateReportPanel.tsx` (demo report rendering + citation chip UI)
     - `src/components/workspace/ResearchProgressOverlay.tsx` (simulated progress log)
     - `src/components/workspace/EntityDetailDrawer.tsx` (node detail drawer)
   - Demo/mock data sources:
     - `src/lib/data/demoGraphData.ts`
     - `src/lib/data/demoReportData.ts`
     - `src/lib/data/suggestedQueries.ts`

4. New frontend persistence and API integration groundwork implemented
   - IndexedDB-backed store module:
     - `entropy-research-hub/src/lib/storage/workspaceStoreV2.ts`
   - Unit tests for core store contract:
     - `entropy-research-hub/src/lib/storage/workspaceStoreV2.test.ts`
     - Covers create workspace, augment dedup/provenance merge, remove node cascade, export JSON, graph snapshot
   - API client scaffold for augmentation:
     - `entropy-research-hub/src/lib/api/augmentation.ts`
   - Workspace view now attempts real augmentation API call (`/api/causaly/augment`) with fallback to demo completion flow

5. Frontend routing and workspace flow wiring improved
   - `entropy-research-hub/src/App.tsx` now mounts:
     - `WorkspaceProvider`
     - route: `/workspaces/:id` → `WorkspaceView`
   - `entropy-research-hub/src/pages/WorkspacesPage.tsx` now:
     - renders rows from context workspace data when present
     - creates workspace via context action and navigates to `/workspaces/:id`
     - supports row click navigation into workspace detail view
     - retains demo fallback rows when no persisted workspaces exist
   - Added workspace flow tests:
     - `src/pages/WorkspacesPage.test.tsx`
     - `src/pages/WorkspaceView.routing.test.tsx`

6. Workspace context now uses WorkspaceStore v2 as primary persistence backend
   - `entropy-research-hub/src/contexts/WorkspaceContext.tsx` now:
     - loads from `workspaceStoreV2` on mount
     - syncs current workspace from `workspaceStoreV2`
     - delegates `createWorkspace`, `updateWorkspace`, `deleteWorkspace` to v2 store
     - keeps legacy `workspaceStorage` only as fallback if v2 operations fail
   - Added context tests:
     - `src/contexts/WorkspaceContext.test.tsx`

7. Workspace query lifecycle now writes real augmentation metadata
   - `entropy-research-hub/src/pages/WorkspaceView.tsx` now:
     - creates query in `running` state on submit
     - updates query to `complete` with contributed node IDs, contributed edge IDs, completeness score, and iteration count on successful `/api/causaly/augment`
     - updates query to `failed` when augment API throws
     - preserves consistent generated edge IDs across `addEdge` and query contribution metadata
   - Added lifecycle tests:
     - `src/pages/WorkspaceView.query-lifecycle.test.tsx`

8. Cytoscape runtime/testing baseline validated
   - Added missing runtime dependency:
     - `entropy-research-hub/package.json` now includes `cytoscape`
   - Added non-mocked Cytoscape smoke test:
     - `src/components/workspace/KnowledgeGraphPanel.test.tsx`
     - Verifies component renders with real Cytoscape initialization (not mocked) in test environment
   - Added test-environment support for canvas:
     - `src/test/setup.ts` adds `HTMLCanvasElement.getContext` polyfill for jsdom
   - `KnowledgeGraphPanel` now supplies explicit layout bounding box fallback for test/runtime environments where container sizing is unavailable

9. Follow-up suggestions now wired to backend endpoint in workspace flow
   - Added API client:
     - `entropy-research-hub/src/lib/api/suggestions.ts`
     - Calls `GET /api/causaly/suggestions` with graph snapshot + persona mode
   - Added API client tests:
     - `src/lib/api/suggestions.test.ts`
     - Covers success, API error propagation, and response filtering
   - Updated `WorkspaceView` behavior:
     - On successful augment completion, fetches fresh suggestions for current graph state and updates left-panel suggestion chips
     - Falls back to local mode/India-Lens templates when suggestions request fails
   - Expanded lifecycle coverage:
     - `src/pages/WorkspaceView.query-lifecycle.test.tsx` now verifies suggestions fetch invocation and rendered dynamic suggestion chip

10. India Lens processor implemented and wired into workspace query flow

- Added processor module:
  - `entropy-research-hub/src/lib/indiaLens.ts`
  - Enriches nodes with `metadata.indiaContext` and `indiaRelevant` using static CDSCO/NPPA/company heuristics
- Added processor tests:
  - `src/lib/indiaLens.test.ts`
  - Covers Indian assignee detection, CDSCO match, NPPA price cap enrichment, and idempotence
- Integrated in workspace flow:
  - `src/pages/WorkspaceView.tsx` now applies `processIndiaLens` to newly-added nodes when India Lens toggle is enabled
- Added lifecycle regression:
  - `src/pages/WorkspaceView.query-lifecycle.test.tsx` now verifies India Lens enrichment on augment-added nodes
- Added graph-panel India Lens UI coverage:
  - `src/components/workspace/KnowledgeGraphPanel.india-lens.test.tsx` verifies rendered summary with India-enriched nodes
- Added Entity Detail Drawer India Lens UI behavior:
  - `entropy-research-hub/src/components/workspace/EntityDetailDrawer.tsx` now renders an `India Lens Signals` section for India-relevant nodes
  - surfaces CDSCO approval, NPPA price cap (INR), and Indian assignee signal when available
- Added drawer coverage:
  - `src/components/workspace/EntityDetailDrawer.india-lens.test.tsx`
  - covers both drug and patent India signals

11. Report synthesis now wired into query completion flow

- Added synthesis API client:
  - `entropy-research-hub/src/lib/api/synthesis.ts`
  - Calls `POST /api/causaly/synthesise` and normalizes response shape
- Added synthesis API tests:
  - `src/lib/api/synthesis.test.ts`
  - Covers success, explicit API error message propagation, and malformed-success payload fallback
- Updated `WorkspaceView` behavior:
  - After successful augment and suggestions fetch, calls synthesis endpoint with current graph snapshot + persona mode
  - On synthesis success, persists report sections in workspace via `updateWorkspace`
  - On synthesis failure, keeps existing demo-report fallback behavior
- Expanded lifecycle regression coverage:
  - `src/pages/WorkspaceView.query-lifecycle.test.tsx` now verifies synthesis invocation and report persistence update

12. Citation-to-graph linking is now wired in workspace view

- `entropy-research-hub/src/pages/WorkspaceView.tsx`
  - `IntermediateReportPanel.onCitationClick` now sets `highlightedNodes` so cited nodes are emphasized in `KnowledgeGraphPanel`
- Added regression test:
  - `src/pages/WorkspaceView.citation-linking.test.tsx`
  - verifies citation click updates graph highlight input

13. Follow-up loop + query history + persona/India visual behavior closed for must-have demo criteria
    - Workspace query UX updates:
      - `entropy-research-hub/src/pages/WorkspaceView.tsx`
      - Suggestion chips now trigger immediate submit using chip text
      - Query submission now supports explicit query text input path for chip-driven submits
      - Query completion no longer auto-injects static demo graph on successful augment path
      - Query history cards now include status and submitted date metadata while retaining click-to-highlight behavior
    - Graph visual semantics updates:
      - `entropy-research-hub/src/components/workspace/KnowledgeGraphPanel.tsx`
      - Extracted `getPersonaWeighting` helper and reused it in Cytoscape node-style generation
      - India Lens-on state now surfaces an explicit provenance badge and India-relevant node count in panel summary
    - New/expanded regression coverage:
      - `src/pages/WorkspaceView.query-lifecycle.test.tsx`
        - suggestion chip click submits query
        - cumulative graph snapshot includes prior contributed nodes
        - query history shows status/date metadata and still highlights contributed nodes on click
        - India Lens toggle persists via workspace update calls
        - successful empty-delta augment does not auto-seed demo nodes
      - `src/components/workspace/KnowledgeGraphPanel.persona-weighting.test.tsx`
        - researcher/strategist visual weighting expectations for biological vs patent/commercial node types
      - `src/components/workspace/KnowledgeGraphPanel.india-lens.test.tsx`
        - validates India Lens badge text and India-relevant node count visibility

### Scaffolding / partial

1. Workspace flow is implemented mostly as isolated scaffolding, not wired app behavior.
   - `WorkspaceView` route is now wired in `App.tsx`.
   - `WorkspaceProvider` is now mounted in `App.tsx`.
   - Remaining: context still uses legacy localStorage adapter as source of truth.

2. Workspace list and creation are currently static UI.
   - `src/pages/WorkspacesPage.tsx` now supports real create+navigate via context actions.
   - Demo fallback rows still render when no persisted workspace exists.

3. Query-to-graph behavior is simulated.
   - `ResearchProgressOverlay` uses timed fake logs and fake completion.
   - "Load Demo Data" seeds local mock graph data as fallback.
   - Query lifecycle metadata update is now real for augment success/failure, but graph growth still falls back to demo seeding when overlay completes.

4. Graph and report are mostly demo-driven.
   - Graph visuals render from provided nodes/edges.
   - Report section content and citations come from static demo data.

5. WorkspaceStore v2 is implemented but not yet fully wired as the authoritative runtime store.
   - Resolved: context now uses v2 as primary store.
   - Remaining: remove legacy adapter fallback once migration confidence is high.

### Not implemented (vs PRD)

Core PRD deltas still missing on frontend:

- End-to-end augmentation flow against `/api/causaly/augment`
- Real follow-up suggestion calls and staleness tracking
- India Lens processor with static CDSCO/NPPA/company datasets
- Persona mode and India Lens persistence per workspace with full behavior semantics
- Provenance-first graph panel with source/query/timestamp traceability at node/edge level
- Strategist full report view from PRD
- Dossier generation overlay UX/state model using SSE stream
- Standalone Protein Profile screen from PRD
- PRD-aligned settings persistence behavior

Frontend now contains partial real API integration via `/api/causaly/augment` from `WorkspaceView`, with fallback demo behavior still present.
The graph panel now has direct runtime test coverage with real Cytoscape initialization in unit tests.
Follow-up suggestion chips now use real backend suggestions after augment, with deterministic local fallback retained.
India Lens node enrichment is now active in augment flow when India Lens is on, but currently uses static in-module reference data.
Intermediate report generation now has a real API-backed path in `WorkspaceView`, with existing demo report retained as fallback.

---

## 3) PRD coverage snapshot

| PRD area                            | Current state                                                                            | User Stories Covered |
| ----------------------------------- | ---------------------------------------------------------------------------------------- | -------------------- |
| Workspace creation/navigation       | Scaffolding (UI present, not wired end-to-end)                                           | Partial: 1-5         |
| First query + autonomous loop       | Partial (backend has workflow infra; frontend uses simulation; PRD API contract missing) | Partial: 11-14       |
| Cumulative KG + provenance          | Not implemented to PRD schema                                                            | None: 22-28          |
| Cytoscape graph canvas              | Scaffolding/partial (rendering and controls exist)                                       | Partial: 29-35       |
| Persona modes                       | Scaffolding (visual toggles; not full PRD semantics)                                     | Partial: 45-49       |
| India Lens                          | Scaffolding (toggle + demo flags, no real processor/datasets)                            | None: 50-56          |
| Left query sidebar behavior         | Scaffolding                                                                              | Partial: 65-67       |
| Intermediate report behavior        | Scaffolding (demo data)                                                                  | Partial: 74-78       |
| Detail drawers                      | Scaffolding                                                                              | Partial: 85-93       |
| Strategist full report view         | Not implemented                                                                          | None: 94-109         |
| Full dossier generation             | Partial (backend SSE route + frontend trigger wired; final UX/PDF flow still pending)   | Partial: 110-117     |
| Standalone Protein Profile          | Not implemented                                                                          | None: 118-123        |
| Settings + data source status model | Partial (mostly static pages)                                                            | Partial: 124-129     |
| Testing against PRD decisions       | Partial (backend tests exist; frontend tests minimal)                                    | N/A                  |

---

## 4) Reusable building blocks already in place

### Backend pieces worth reusing

- Zod-first request validation and uniform error response pattern
- Existing MCP tool orchestration in `src/routes/entropy.ts`
- Existing SSE/session event plumbing in `research` routes and `workflow-runner`
- Existing summary generation pattern with structured output + fallback

### Frontend pieces worth reusing

- Cytoscape panel scaffold and toolbar interaction model
- Detail drawer structure by node type
- Three-panel workspace layout shell in `WorkspaceView`
- Existing demo datasets as initial contract fixtures for tests

---

## 5) Critical Gaps for Hackathon Demo

Based on the PRD demo script (PRD lines 399-400), the following are **must-have** for April 7-8:

### Backend API gaps (high priority)

1. **POST /api/causaly/augment** - Graph delta augmentation endpoint
2. **POST /api/causaly/synthesise** - Report synthesis endpoint
3. **GET /api/causaly/suggestions** - Follow-up query suggestions
4. **CompletenessAgent** - Score + early termination logic
5. **FollowUpSuggestionAgent** - Context-aware query suggestions

### Frontend gaps (high priority)

1. **WorkspaceStore v2** with IndexedDB (idb-keyval) replacing localStorage
2. **PRD-aligned schemas** - Node provenance, edge provenance, indiaContext
3. **Real augmentation flow** - Call /api/causaly/augment, merge delta
4. **India Lens processor** - Static CDSCO/NPPA/Indian company datasets
5. **Persona mode full behavior** - Visual weight + query templates
6. **Provenance panel** - Source/query/timestamp display below graph
7. **Report staleness tracking** - "X new nodes since last synthesis"
8. **Citation badge linking** - Click citation → highlight node in graph

### Can defer (nice-to-have, not demo-critical)

- POST /api/causaly/dossier (full dossier generation with SSE)
- Strategist full report view (user stories 94-109)
- Standalone Protein Profile screen (user stories 118-123)
- Timeline view variant (user stories 57-61)
- Dendrogram overlay (user stories 62-64)

---

## 6) Notes

- `entropy-research-hub/IMPLEMENTATION_PLAN.md` and `entropy-research-hub/PROGRESS_REPORT.md` describe an intended transformation path, but the currently checked-in app code is still in a mixed state (legacy routes plus entropy scaffolding).
- This audit should be treated as the implementation baseline for the next execution plan.
