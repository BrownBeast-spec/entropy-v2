# Entropy v2 Implementation Status Audit

Date: 2026-04-04 (Updated)
Scope reviewed:

- `amd-docs/PRD.md`
- `apps/api/` (backend)
- `entropy-research-hub/` (frontend)

This document captures what is actually implemented right now, what is scaffolded, and what is still missing against the PRD for the AMD Slingshot Hackathon 2026.

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

### Scaffolding / partial

- Session persistence is in-memory only (Map), so process restarts lose sessions.
- HITL + SSE lifecycle is robust for the existing pipeline, but it is tied to current workflow contracts rather than the new PRD API contracts.

### Not implemented (vs PRD)

PRD-specified API contract additions are not present yet:

- `POST /api/causaly/augment`
- `POST /api/causaly/synthesise`
- `GET /api/causaly/suggestions`
- `POST /api/causaly/dossier` (SSE stream)

Also missing on backend for PRD parity:

- Explicit CompletenessAgent boundary and contract as described in PRD
- FollowUpSuggestionAgent endpoint contract
- PRD request/response shapes for graph delta augmentation
- Caching behavior aligned to PRD contract keys/hashes

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

### Scaffolding / partial

1. Workspace flow is implemented mostly as isolated scaffolding, not wired app behavior.
   - `WorkspaceView` exists, but current route config in `src/App.tsx` does not expose `/workspaces/:id`.
   - `WorkspaceProvider` exists, but it is not mounted in `src/main.tsx`.

2. Workspace list and creation are currently static UI.
   - `src/pages/WorkspacesPage.tsx` uses hardcoded `dummyWorkspaces`.
   - "Create and start researching" does not persist or navigate to a real workspace.

3. Query-to-graph behavior is simulated.
   - `ResearchProgressOverlay` uses timed fake logs and fake completion.
   - "Load Demo Data" seeds local mock graph data.

4. Graph and report are mostly demo-driven.
   - Graph visuals render from provided nodes/edges.
   - Report section content and citations come from static demo data.

### Not implemented (vs PRD)

Core PRD deltas still missing on frontend:

- WorkspaceStore v2 using IndexedDB (`idb-keyval`) and PRD schemas/provenance model
- End-to-end augmentation flow against `/api/causaly/augment`
- Real follow-up suggestion calls and staleness tracking
- India Lens processor with static CDSCO/NPPA/company datasets
- Persona mode and India Lens persistence per workspace with full behavior semantics
- Provenance-first graph panel with source/query/timestamp traceability at node/edge level
- Strategist full report view from PRD
- Dossier generation overlay using SSE stream
- Standalone Protein Profile screen from PRD
- PRD-aligned settings persistence behavior

No real API integration was found in the frontend scaffold at this point.

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
| Full dossier generation             | Not implemented                                                                          | None: 110-117        |
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
