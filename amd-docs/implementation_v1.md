# Entropy v4 Implementation v1

Date: 2026-03-31
Branch: `amd`
Status: Day 1 backend + MCP integration completed, verified with builds/tests.

## What we did so far

### 1) New MCP packages created

- Added `packages/mcp-europepmc/` with tools:
  - `search_europepmc`
  - `get_fulltext_europepmc`
  - `get_citations_europepmc`
- Added `packages/mcp-patents/` with tools:
  - `search_patents_by_drug`
  - `get_patent_timeline`
  - `get_top_assignees`
- Added `packages/mcp-string/` with tools:
  - `get_protein_interactions`
  - `get_functional_enrichment`
  - `get_protein_info`
- Added `packages/mcp-pubchem/` with tools:
  - `search_compounds`
  - `get_compound_details`
  - `get_similar_compounds`

### 2) Workspace + dependency wiring

- Updated `pnpm-workspace.yaml` to include new MCP packages.
- Updated `apps/mastra-app/package.json` to include workspace deps for:
  - `@entropy/mcp-europepmc`
  - `@entropy/mcp-patents`
  - `@entropy/mcp-string`
  - `@entropy/mcp-pubchem`
- Added `@entropy/audit` and `puppeteer` to mastra dependencies to fix build/runtime dependency gaps.
- Updated `apps/mastra-app/src/lib/audit.ts` to import from `@entropy/audit` instead of deep relative package path.

### 3) MCP client integration in Mastra

- Updated `apps/mastra-app/src/lib/mcp-client.ts`:
  - Registered new MCP servers (`europepmc`, `patents`, `string`, `pubchem`).
  - Added helper getters:
    - `getEuropePMCTools()`
    - `getPatentsTools()`
    - `getSTRINGTools()`
    - `getPubChemTools()`

### 4) API route implementation and rename

- Replaced "causaly" naming with "entropy" naming for the new aggregator route.
- Added `apps/api/src/routes/entropy.ts` with unified search endpoint:
  - `GET /api/entropy/search`
  - `POST /api/entropy/search`
- Registered route in `apps/api/src/index.ts`:
  - `app.route("/api/entropy", entropy)`
- Removed `apps/api/src/routes/causaly.ts`.

### 5) Unified search behavior delivered

- Parallel fan-out calls across selected source types.
- Input validation via Zod (query, types, limit).
- Source-level fault tolerance (partial result return with `errors` object).
- Normalized result model (`type`, `id`, `title`, `description`, `source`, `url`, `metadata`).
- Deduplication by URL fallbacking to `type:id`.
- Supports types:
  - `literature`, `preprints`, `proteins`, `compounds`, `trials`, `patents`, `targets`, `interactions`.

### 6) Additional compatibility fixes

- Updated `apps/api/src/routes/chat.ts` to satisfy updated `getLocalAgents` shape (`resourceId` + typed `mastra` bridge).

## Testing and integration completed

### 1) New tests added

- Added `apps/api/src/__tests__/entropy.test.ts`:
  - validates success path for `/api/entropy/search`
  - validates bad input handling
  - validates dedup behavior
  - validates missing tool handling (`errors` bag)

### 2) Existing tests improved for new integrations

- Extended `apps/mastra-app/src/__tests__/agents.test.ts`:
  - added assertions for EuropePMC, Patents, STRING, PubChem tool discovery
  - added stabilized MCP discovery timeouts to reduce flakiness in full-suite runs
- Updated `apps/mastra-app/src/__tests__/hitl.test.ts` to match current schema/output shape:
  - switched `notes` -> `suggestions`
  - added required `htmlPreviewPath`, `iterationCount`
  - aligned workflow shape expectations (`htmlPath`, `pdfError`)

### 3) Verification commands executed

- Recursive build passed:
  - `/home/beast/.npm-global/bin/pnpm -r build`
- Full test suite passed:
  - `/home/beast/.npm-global/bin/pnpm test`
  - Result: 28 test files passed, 5 skipped; 283 tests passed, 11 skipped.

## Current state summary

- Backend aggregator infrastructure is live under `/api/entropy/search`.
- New MCP data sources are integrated and discoverable by Mastra.
- Build + test baseline is green after integration.
- Frontend integration with this new API is not yet completed.

## Next steps (proposed implementation plan)

### Phase A - Frontend data plumbing (high priority)

1. Add typed API client in `entropy_front/src/lib/api.ts`.
2. Add TanStack Query client in `entropy_front/src/lib/queryClient.ts`.
3. Wire `QueryClientProvider` in `entropy_front/src/main.jsx`.
4. Add `useUnifiedSearch` query hook and result type mapping.

### Phase B - Unified Search UI (high priority)

1. Create `entropy_front/src/components/UnifiedSearch.tsx`.
2. Add tabbed result views by type (Literature, Protein, Compound, Trial, Patent, Target).
3. Add loading, empty, and partial-error states using response `errors`.
4. Integrate with existing `App.jsx` shell replacing mock fetch behavior.

### Phase C - Workspace persistence (high priority)

1. Create `entropy_front/src/store/workspaceStore.ts` with Zustand + localStorage.
2. Implement `WorkspaceSidebar.tsx` (create/switch/delete workspace).
3. Add "Save to workspace" action on result cards.
4. Add export JSON for workspace items (demo flow requirement).

### Phase D - Strategist MVP (medium/high priority)

1. Add backend `POST /api/entropy/strategist` route skeleton.
2. Build strategist data collectors (patents + trials + papers).
3. Add prompt composition and "public-signals-only" disclaimer.
4. Implement `StrategistReport.tsx` to render narrative + tables/timeline.

### Phase E - Existing visual components data hookup (medium priority)

1. Connect `DocumentsView` to live literature results.
2. Connect `NetworkView` to STRING interaction payload.
3. Connect `DendrogramView` to target/association data.
4. Add `UniProtFeatureViewer.tsx` skeleton and integrate selected protein context.

### Phase F - QA, polish, and demo hardening (high priority)

1. Add rate-limit aware caching strategy where needed.
2. Add retry/backoff and graceful source-failure UX.
3. Add responsive polish and skeleton loaders.
4. Rehearse the 5-7 min demo script with deterministic demo query fixtures.

## Context I need from you before Phase A/B coding

To move faster with fewer revisions, please provide:

1. Preferred frontend result-card design constraints (compact vs detailed).
2. Exact tabs to show in MVP and desired default tab order.
3. Whether search triggers on Enter only or debounced typing.
4. Workspace export format preference (plain JSON vs structured schema + metadata).
5. Strategist output priority (narrative-first vs charts-first).

## Suggested immediate execution order

1. Phase A (frontend data plumbing).
2. Phase B (UnifiedSearch UI integrated in App).
3. Phase C (workspace persistence + save flow).

This gives an end-to-end, demoable slice quickly: search -> inspect -> save.
