# Graph-Grounded Synthesis System Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a demoable backend-powered knowledge graph system with Neo4j storage, real edge inference on every add-node operation, deep LLM synthesis, provenance/citations, and a full Mastra orchestration workflow.

**Architecture:** Use Neo4j as the source of truth for workspace graph state (nodes, edges, query provenance). Run edge construction on each add-nodes operation using heuristic candidate generation plus LLM validation/inference (`openai/gpt-oss-120b` via NVIDIA NIM). Run deep synthesis as a multi-step pipeline (graph analysis -> pattern extraction -> section generation) with streaming output and exposed reasoning traces.

**Tech Stack:** Hono API, Mastra workflows/agents, Neo4j (local Docker), NVIDIA NIM OpenAI-compatible API, React frontend, Vitest test suites.

---

## Executive Summary

**Stack decisions locked:**

- Backend graph storage: Neo4j local container.
- LLM model: NVIDIA NIM `openai/gpt-oss-120b`.
- Edge construction: run on every add-node operation.
- Synthesis depth: deep reasoning.
- Synthesis UX: streaming.
- Agent config: per-agent temperature + max token controls.
- Failover: fail fast (no fallback model/provider).
- Migration: fresh backend-first, no client data migration.

**Performance envelope target:**

- Add 5-10 nodes + infer edges: ~2-3s.
- Add 20+ nodes + infer edges: ~5-7s.
- Synthesis: streamed section generation, multi-step reasoning.

---

## File Structure Map

### Backend API (`apps/api`)

- Create: `apps/api/src/lib/neo4j-client.ts` - Neo4j singleton driver/session utilities.
- Create: `apps/api/src/lib/neo4j-schema.ts` - schema init (constraints/indexes).
- Create: `apps/api/src/lib/graph-repository.ts` - graph CRUD and query provenance repository.
- Create: `apps/api/src/schemas/graph-schema.ts` - zod schemas for graph entities.
- Create: `apps/api/src/routes/workspace.ts` - workspace/node/edge endpoints.
- Create: `apps/api/src/routes/workflow.ts` - endpoint to execute full workflow.
- Modify: `apps/api/src/routes/causaly.ts` - streaming synthesis support.
- Modify: `apps/api/src/index.ts` - mount routes + run schema init.
- Modify: `apps/api/package.json` - add `neo4j-driver`.

### Mastra App (`apps/mastra-app`)

- Create: `apps/mastra-app/src/lib/nvidia-nim-provider.ts` - NVIDIA NIM OpenAI-compatible provider wiring.
- Create: `apps/mastra-app/src/lib/rate-limiter.ts` - configurable RPM/TPM/concurrency limiter.
- Create: `apps/mastra-app/src/lib/edge-heuristics.ts` - candidate pair selection.
- Create: `apps/mastra-app/src/agents/edge-constructor-agent.ts` - LLM edge inference agent.
- Modify: `apps/mastra-app/src/agents/synthesis-agent.ts` - replace fallback with deep multi-step synthesis + streaming/reasoning callbacks.
- Create: `apps/mastra-app/src/workflows/graph-synthesis-pipeline.ts` - full orchestration workflow.
- Modify: `apps/mastra-app/src/mastra/index.ts` - register new agent + workflow.
- Modify: `apps/mastra-app/src/index.ts` - export new capabilities.
- Modify: `apps/mastra-app/.env.example` - add Neo4j/NVIDIA/rate envs.

### Frontend (`entropy-research-hub`)

- Create: `entropy-research-hub/src/lib/api/workspace.ts` - workspace backend client.
- Create: `entropy-research-hub/src/lib/api/workflow.ts` - workflow trigger client.
- Modify: `entropy-research-hub/src/lib/api/synthesis.ts` - streaming support with SSE callbacks.
- Modify: `entropy-research-hub/src/contexts/WorkspaceContext.tsx` - backend-first storage path.
- Modify: `entropy-research-hub/src/pages/WorkspaceView.tsx` - stream synthesis content + reasoning traces.

### Infra/Docs

- Create: `docker-compose.neo4j.yml` - local Neo4j service.
- Modify: `.env.example` - add all new env vars.
- Create: `docs/ARCHITECTURE.md` - architecture + data flow.
- Modify: `README.md` - setup/run/reset instructions.
- Modify: `amd-docs/IMPLEMENTATION.md` - progress tracking updates.

### Tests

- Create: `apps/api/src/__tests__/neo4j-client.test.ts`
- Create: `apps/api/src/__tests__/graph-repository.test.ts`
- Create: `apps/api/src/__tests__/workspace-add-nodes.test.ts`
- Create: `apps/api/src/__tests__/integration/full-pipeline.test.ts`
- Create: `apps/mastra-app/src/__tests__/nvidia-nim-provider.test.ts`
- Create: `apps/mastra-app/src/__tests__/rate-limiter.test.ts`
- Create: `apps/mastra-app/src/__tests__/edge-heuristics.test.ts`
- Create: `apps/mastra-app/src/__tests__/edge-constructor-agent.test.ts`
- Modify: `apps/mastra-app/src/__tests__/synthesis-agent.test.ts`

---

## Chunk 1: Infrastructure Foundations

### Task 1: Add local Neo4j container

**Files:**

- Create: `docker-compose.neo4j.yml`

- [ ] **Step 1: Write the failing test/verification command**

Run: `docker-compose -f docker-compose.neo4j.yml config`
Expected: fails because file does not exist.

- [ ] **Step 2: Add compose file**

Create service:

- image `neo4j:5.15-community`
- ports `7474`, `7687`
- auth env `NEO4J_AUTH=neo4j/entropy-dev-password`
- persistent volumes
- healthcheck with `cypher-shell`

- [ ] **Step 3: Verify container definition**

Run: `docker-compose -f docker-compose.neo4j.yml config`
Expected: PASS.

- [ ] **Step 4: Verify runtime**

Run: `docker-compose -f docker-compose.neo4j.yml up -d && docker-compose -f docker-compose.neo4j.yml ps`
Expected: neo4j container healthy/running.

### Task 2: Add environment variables for Neo4j + NVIDIA NIM + rate limits

**Files:**

- Modify: `.env.example`
- Modify: `apps/mastra-app/.env.example`

- [ ] **Step 1: Write failing test/verification**

Run: `pnpm -C apps/mastra-app test -- --run nvidia-nim-provider`
Expected: fails due missing env references or missing provider module.

- [ ] **Step 2: Add env keys**

Add:

- `NEO4J_URI`
- `NEO4J_USER`
- `NEO4J_PASSWORD`
- `NVIDIA_API_KEY`
- `NVIDIA_NIM_BASE_URL=https://integrate.api.nvidia.com/v1`
- `NVIDIA_RATE_LIMIT_RPM`
- `NVIDIA_RATE_LIMIT_TPM`
- `NVIDIA_RATE_LIMIT_CONCURRENT`
- `SYNTHESIS_AGENT_TEMPERATURE`
- `SYNTHESIS_AGENT_MAX_TOKENS`
- `EDGE_AGENT_TEMPERATURE`
- `EDGE_AGENT_MAX_TOKENS`

- [ ] **Step 3: Verify docs presence**

Run: `pnpm -C apps/mastra-app test -- --run nvidia-nim-provider`
Expected: progresses to code-level failures (env docs now present).

### Task 3: Implement Neo4j client singleton

**Files:**

- Create: `apps/api/src/lib/neo4j-client.ts`
- Modify: `apps/api/package.json`
- Test: `apps/api/src/__tests__/neo4j-client.test.ts`

- [ ] **Step 1: Write failing tests first**

Cover:

- connects successfully
- session creation works
- singleton driver reused
- missing password throws

- [ ] **Step 2: Run tests to verify fail**

Run: `pnpm vitest run apps/api/src/__tests__/neo4j-client.test.ts`
Expected: FAIL with module/function missing.

- [ ] **Step 3: Add dependency + implementation**

Install `neo4j-driver`; implement:

- `getNeo4jDriver()`
- `getNeo4jSession()`
- `closeNeo4jDriver()`
- `checkNeo4jConnection()`

- [ ] **Step 4: Re-run tests**

Run: `pnpm vitest run apps/api/src/__tests__/neo4j-client.test.ts`
Expected: PASS.

### Task 4: Add Neo4j schema initialization

**Files:**

- Create: `apps/api/src/lib/neo4j-schema.ts`
- Modify: `apps/api/src/index.ts`

- [ ] **Step 1: Write failing test**

Add test case in `graph-repository` or dedicated schema test to verify constraints exist after init.

- [ ] **Step 2: Run test and confirm fail**

Run: `pnpm vitest run apps/api/src/__tests__/graph-repository.test.ts`
Expected: FAIL for missing constraints.

- [ ] **Step 3: Implement schema init**

Create constraints/indexes:

- unique workspace id
- unique node id
- unique query id
- node type/source indexes

Call initializer on API startup.

- [ ] **Step 4: Re-run tests**

Run: `pnpm vitest run apps/api/src/__tests__/graph-repository.test.ts`
Expected: constraint assertions PASS.

---

## Chunk 2: Graph Persistence + API Surface

### Task 5: Define graph schemas

**Files:**

- Create: `apps/api/src/schemas/graph-schema.ts`

- [ ] **Step 1: Write failing schema tests**

Test:

- valid node/edge/workspace/query payloads parse
- invalid node type rejected
- invalid edge type rejected

- [ ] **Step 2: Run tests to confirm fail**

Run: `pnpm vitest run apps/api/src/__tests__/graph-schema.test.ts`
Expected: FAIL missing schema file.

- [ ] **Step 3: Implement zod schemas**

Include node types/data sources/edge types + inferred provenance fields.

- [ ] **Step 4: Re-run tests**

Run: `pnpm vitest run apps/api/src/__tests__/graph-schema.test.ts`
Expected: PASS.

### Task 6: Implement graph repository

**Files:**

- Create: `apps/api/src/lib/graph-repository.ts`
- Test: `apps/api/src/__tests__/graph-repository.test.ts`

- [ ] **Step 1: Write failing repository tests**

Cover:

- create/get workspace
- add nodes to workspace
- add edges between contained nodes
- get workspace graph returns nodes + edges
- create query and provenance linking
- validation/error path for missing workspace or invalid ids

- [ ] **Step 2: Run tests to verify fail**

Run: `pnpm vitest run apps/api/src/__tests__/graph-repository.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement minimal repository methods**

Methods:

- `createWorkspace`
- `getWorkspace`
- `addNodesToWorkspace`
- `addEdges`
- `getWorkspaceGraph`
- `createQuery`

- [ ] **Step 4: Re-run tests**

Run: `pnpm vitest run apps/api/src/__tests__/graph-repository.test.ts`
Expected: PASS.

### Task 7: Add workspace routes

**Files:**

- Create: `apps/api/src/routes/workspace.ts`
- Modify: `apps/api/src/index.ts`
- Test: `apps/api/src/__tests__/workspace-add-nodes.test.ts`

- [ ] **Step 1: Write failing API tests**

Cover endpoints:

- `POST /api/workspace/create`
- `GET /api/workspace/:id`
- `POST /api/workspace/:id/nodes`
- `GET /api/workspace/:id/graph`

Cases:

- happy path
- bad json/validation errors
- missing workspace 404
- boundary with empty nodes array

- [ ] **Step 2: Run tests and confirm fail**

Run: `pnpm vitest run apps/api/src/__tests__/workspace-add-nodes.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement routes**

Add parsing/validation, repository calls, response payloads.

- [ ] **Step 4: Re-run tests**

Run: `pnpm vitest run apps/api/src/__tests__/workspace-add-nodes.test.ts`
Expected: PASS.

---

## Chunk 3: NVIDIA NIM + Rate Limiting + Edge Construction

### Task 8: Implement NVIDIA NIM provider (OpenAI-compatible)

**Files:**

- Create: `apps/mastra-app/src/lib/nvidia-nim-provider.ts`
- Test: `apps/mastra-app/src/__tests__/nvidia-nim-provider.test.ts`

- [ ] **Step 1: Write failing provider tests**

Cover:

- provider initialization with env
- default model `openai/gpt-oss-120b`
- throws when API key missing
- per-agent config helpers apply env values

- [ ] **Step 2: Run tests to confirm fail**

Run: `pnpm vitest run apps/mastra-app/src/__tests__/nvidia-nim-provider.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement provider layer**

Use OpenAI-compatible base URL:

- `https://integrate.api.nvidia.com/v1`
- model name `openai/gpt-oss-120b`

- [ ] **Step 4: Re-run tests**

Run: `pnpm vitest run apps/mastra-app/src/__tests__/nvidia-nim-provider.test.ts`
Expected: PASS.

### Task 9: Implement configurable rate limiter

**Files:**

- Create: `apps/mastra-app/src/lib/rate-limiter.ts`
- Test: `apps/mastra-app/src/__tests__/rate-limiter.test.ts`

- [ ] **Step 1: Write failing tests**

Cover:

- allows request within limits
- queues when concurrent cap reached
- tracks RPM/TPM state
- release updates stats

- [ ] **Step 2: Run tests and confirm fail**

Run: `pnpm vitest run apps/mastra-app/src/__tests__/rate-limiter.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement limiter**

Use token-bucket/time-window hybrid with:

- requests per minute
- tokens per minute
- max concurrent

- [ ] **Step 4: Re-run tests**

Run: `pnpm vitest run apps/mastra-app/src/__tests__/rate-limiter.test.ts`
Expected: PASS.

### Task 10: Implement edge heuristics candidate generation

**Files:**

- Create: `apps/mastra-app/src/lib/edge-heuristics.ts`
- Test: `apps/mastra-app/src/__tests__/edge-heuristics.test.ts`

- [ ] **Step 1: Write failing tests**

Cover:

- type compatibility contributes score
- shared metadata concepts contribute score
- same-source contributes score
- returns top-N sorted candidates
- handles zero/edge input arrays

- [ ] **Step 2: Run tests and confirm fail**

Run: `pnpm vitest run apps/mastra-app/src/__tests__/edge-heuristics.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement heuristics**

Output candidate pairs with heuristic score + rationale.

- [ ] **Step 4: Re-run tests**

Run: `pnpm vitest run apps/mastra-app/src/__tests__/edge-heuristics.test.ts`
Expected: PASS.

### Task 11: Implement edge constructor agent

**Files:**

- Create: `apps/mastra-app/src/agents/edge-constructor-agent.ts`
- Modify: `apps/mastra-app/src/index.ts`
- Test: `apps/mastra-app/src/__tests__/edge-constructor-agent.test.ts`

- [ ] **Step 1: Write failing tests**

Cover:

- structured output parsing
- confidence threshold filter (>0.7)
- rate limiter acquire/release around inference
- fail-fast on provider errors

- [ ] **Step 2: Run tests and confirm fail**

Run: `pnpm vitest run apps/mastra-app/src/__tests__/edge-constructor-agent.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement agent + inference function**

Use:

- model `openai/gpt-oss-120b`
- low temperature (configurable)
- JSON structured output

- [ ] **Step 4: Re-run tests**

Run: `pnpm vitest run apps/mastra-app/src/__tests__/edge-constructor-agent.test.ts`
Expected: PASS.

### Task 12: Integrate edge inference into add-nodes route (every add operation)

**Files:**

- Modify: `apps/api/src/routes/workspace.ts`
- Test: `apps/api/src/__tests__/workspace-add-nodes.test.ts`

- [ ] **Step 1: Write failing integration test**

Test `POST /api/workspace/:id/nodes` returns non-empty `addedEdges` when inferable candidates exist.

- [ ] **Step 2: Run test and confirm fail**

Run: `pnpm vitest run apps/api/src/__tests__/workspace-add-nodes.test.ts`
Expected: FAIL with `addedEdges: []`.

- [ ] **Step 3: Implement route flow**

Flow:

1. persist nodes
2. build candidates
3. infer edges via agent
4. persist edges
5. return `addedNodes` + `addedEdges`

- [ ] **Step 4: Re-run tests**

Run: `pnpm vitest run apps/api/src/__tests__/workspace-add-nodes.test.ts`
Expected: PASS.

---

## Chunk 4: Deep Synthesis Agent (Streaming + Reasoning Traces)

### Task 13: Replace fallback synthesis with deep multi-step pipeline

**Files:**

- Modify: `apps/mastra-app/src/agents/synthesis-agent.ts`
- Test: `apps/mastra-app/src/__tests__/synthesis-agent.test.ts`

- [ ] **Step 1: Write failing tests**

Cover:

- generates non-fallback section content from graph
- extracts citations from `[nodeId]` patterns
- persona-specific section defaults differ
- India Lens filters to india-relevant evidence
- error path when model call fails (fail-fast)
- boundary case with sparse graphs

- [ ] **Step 2: Run tests and confirm fail**

Run: `pnpm vitest run apps/mastra-app/src/__tests__/synthesis-agent.test.ts`
Expected: FAIL due fallback-only implementation.

- [ ] **Step 3: Implement multi-step synthesis**

Steps:

1. graph analysis
2. pattern extraction
3. per-section synthesis with citations

Add callbacks:

- `onSectionStart`
- `onSectionChunk`
- `onReasoningChunk`
- `onSectionComplete`

- [ ] **Step 4: Re-run tests**

Run: `pnpm vitest run apps/mastra-app/src/__tests__/synthesis-agent.test.ts`
Expected: PASS.

### Task 14: Add synthesis endpoint streaming support

**Files:**

- Modify: `apps/api/src/routes/causaly.ts`
- Test: `apps/api/src/__tests__/synthesise.test.ts`

- [ ] **Step 1: Write failing endpoint tests**

Cover:

- non-streaming mode returns final object
- streaming mode emits SSE events:
  - `start`
  - `section_start`
  - `section_chunk`
  - `reasoning_chunk` (optional)
  - `section_complete`
  - `complete`
- error event on synthesis failure

- [ ] **Step 2: Run tests and confirm fail**

Run: `pnpm vitest run apps/api/src/__tests__/synthesise.test.ts`
Expected: FAIL for missing streaming behavior.

- [ ] **Step 3: Implement streaming**

Use SSE in Hono route and wire synthesis callbacks.

- [ ] **Step 4: Re-run tests**

Run: `pnpm vitest run apps/api/src/__tests__/synthesise.test.ts`
Expected: PASS.

---

## Chunk 5: Full Mastra Workflow

### Task 15: Implement graph synthesis pipeline workflow

**Files:**

- Create: `apps/mastra-app/src/workflows/graph-synthesis-pipeline.ts`
- Modify: `apps/mastra-app/src/mastra/index.ts`
- Modify: `apps/mastra-app/src/index.ts`
- Test: `apps/mastra-app/src/__tests__/graph-synthesis-workflow.test.ts`

- [ ] **Step 1: Write failing workflow tests**

Cover sequence:

- helpfulness scoring
- node persistence
- edge inference + persistence
- synthesis result with citations

Validation/error path:

- missing `searchResults`
- invalid workspace id

- [ ] **Step 2: Run tests and confirm fail**

Run: `pnpm vitest run apps/mastra-app/src/__tests__/graph-synthesis-workflow.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement workflow**

Pipeline:

1. score helpfulness
2. add nodes to graph
3. infer/store edges
4. synthesize report
5. return counts + synthesis payload

- [ ] **Step 4: Register workflow and exports**

Add workflow/agent registration and public exports.

- [ ] **Step 5: Re-run tests**

Run: `pnpm vitest run apps/mastra-app/src/__tests__/graph-synthesis-workflow.test.ts`
Expected: PASS.

### Task 16: Add workflow route in API

**Files:**

- Create: `apps/api/src/routes/workflow.ts`
- Modify: `apps/api/src/index.ts`
- Test: `apps/api/src/__tests__/workflow-route.test.ts`

- [ ] **Step 1: Write failing tests**

Cover:

- `POST /api/workflow/synthesize` executes pipeline
- validation errors return 400 + issue details
- internal errors return 500

- [ ] **Step 2: Run tests and confirm fail**

Run: `pnpm vitest run apps/api/src/__tests__/workflow-route.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement route and mount**

Call Mastra workflow with validated payload, return structured response.

- [ ] **Step 4: Re-run tests**

Run: `pnpm vitest run apps/api/src/__tests__/workflow-route.test.ts`
Expected: PASS.

---

## Chunk 6: Frontend Backend-First Integration

### Task 17: Create backend API clients for workspace + workflow

**Files:**

- Create: `entropy-research-hub/src/lib/api/workspace.ts`
- Create: `entropy-research-hub/src/lib/api/workflow.ts`
- Test: `entropy-research-hub/src/lib/api/workspace.test.ts`

- [ ] **Step 1: Write failing tests**

Cover:

- create/fetch workspace
- fetch graph
- add nodes
- workflow trigger
- error handling on non-2xx

- [ ] **Step 2: Run tests and confirm fail**

Run: `npm test -- --run src/lib/api/workspace.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement API client modules**

Add typed request/response helpers around fetch.

- [ ] **Step 4: Re-run tests**

Run: `npm test -- --run src/lib/api/workspace.test.ts`
Expected: PASS.

### Task 18: Add synthesis streaming client

**Files:**

- Modify: `entropy-research-hub/src/lib/api/synthesis.ts`
- Test: `entropy-research-hub/src/lib/api/synthesis.test.ts`

- [ ] **Step 1: Write failing tests**

Cover SSE parsing and callback invocation for all relevant event types.

- [ ] **Step 2: Run tests and confirm fail**

Run: `npm test -- --run src/lib/api/synthesis.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement streaming API function**

Implement chunk parsing + callbacks for section/reasoning/complete/error events.

- [ ] **Step 4: Re-run tests**

Run: `npm test -- --run src/lib/api/synthesis.test.ts`
Expected: PASS.

### Task 19: Migrate WorkspaceContext to backend-first state

**Files:**

- Modify: `entropy-research-hub/src/contexts/WorkspaceContext.tsx`
- Test: `entropy-research-hub/src/contexts/WorkspaceContext.test.tsx`

- [ ] **Step 1: Write failing tests**

Cover:

- loads workspace/graph from backend
- handles loading + error states
- no IndexedDB path for default demo flow
- boundary case with empty graph

- [ ] **Step 2: Run tests and confirm fail**

Run: `npm test -- --run src/contexts/WorkspaceContext.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement backend-first context behavior**

Replace client-storage-first logic with backend fetch path.

- [ ] **Step 4: Re-run tests**

Run: `npm test -- --run src/contexts/WorkspaceContext.test.tsx`
Expected: PASS.

### Task 20: Update WorkspaceView for synthesis streaming + reasoning display

**Files:**

- Modify: `entropy-research-hub/src/pages/WorkspaceView.tsx`
- Test: `entropy-research-hub/src/pages/WorkspaceView.test.tsx`

- [ ] **Step 1: Write failing UI tests**

Cover:

- starts synthesis streaming
- appends section content incrementally
- renders optional reasoning trace panel
- handles stream error state

- [ ] **Step 2: Run tests and confirm fail**

Run: `npm test -- --run src/pages/WorkspaceView.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement streaming UI state updates**

Use callback pipeline to incrementally render sections.

- [ ] **Step 4: Re-run tests**

Run: `npm test -- --run src/pages/WorkspaceView.test.tsx`
Expected: PASS.

---

## Chunk 7: Verification, Docs, and Tracking

### Task 21: End-to-end integration test

**Files:**

- Create: `apps/api/src/__tests__/integration/full-pipeline.test.ts`

- [ ] **Step 1: Write failing e2e test**

Scenario:

1. create workspace
2. execute workflow with mock search results
3. verify node + edge persistence
4. verify synthesis sections + citations

- [ ] **Step 2: Run test and confirm fail**

Run: `pnpm vitest run apps/api/src/__tests__/integration/full-pipeline.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement missing glue code**

Add only minimal integration fixes needed to pass.

- [ ] **Step 4: Re-run test**

Run: `pnpm vitest run apps/api/src/__tests__/integration/full-pipeline.test.ts`
Expected: PASS.

### Task 22: Update docs

**Files:**

- Modify: `README.md`
- Create: `docs/ARCHITECTURE.md`
- Modify: `amd-docs/IMPLEMENTATION.md`

- [ ] **Step 1: Write docs validation checklist**

Checklist:

- local setup commands
- env vars documented
- run/test/reset commands documented
- architecture/data-flow documented
- implementation tracker updated

- [ ] **Step 2: Update docs files**

Document:

- Neo4j local startup/reset
- NVIDIA NIM env config
- rate limiter knobs
- workflow data flow

- [ ] **Step 3: Verify docs consistency**

Run manual check + repo markdown lint if available.

### Task 23: Required verification pass before completion

**Files:**

- No new files; run required verification commands.

- [ ] **Step 1: Run backend API test suites**

Run:

- `pnpm vitest run apps/api/src/__tests__/*.test.ts`
- `pnpm vitest run apps/api/src/__tests__/integration/full-pipeline.test.ts`

Expected: all passing.

- [ ] **Step 2: Run mastra test suites**

Run affected suites, minimum:

- `pnpm vitest run apps/mastra-app/src/__tests__/synthesis-agent.test.ts`
- `pnpm vitest run apps/mastra-app/src/__tests__/edge-constructor-agent.test.ts`
- `pnpm vitest run apps/mastra-app/src/__tests__/graph-synthesis-workflow.test.ts`

Expected: all passing.

- [ ] **Step 3: Run frontend affected tests**

Run:

- `npm test -- --run src/lib/api/synthesis.test.ts`
- `npm test -- --run src/contexts/WorkspaceContext.test.tsx`
- `npm test -- --run src/pages/WorkspaceView.test.tsx`

Expected: all passing.

- [ ] **Step 4: Document any external/unfixable failures**

If needed, log in `amd-docs/TEST_FAILURES.md` with required fields from `CLAUDE.md`.

---

## Key Implementation Notes (Ditto from agreed plan)

1. **Edge construction trade-off and chosen strategy**
   - Chosen: infer on every add-node operation for graph visualization quality.
   - Mitigation: heuristic candidate pre-filtering, then LLM inference on top-N pairs.

2. **NVIDIA NIM integration details**
   - OpenAI-compatible API style.
   - Base URL: `https://integrate.api.nvidia.com/v1`.
   - Model: `openai/gpt-oss-120b`.
   - Streaming supported and exposes reasoning content.

3. **Synthesis behavior**
   - Deep reasoning only.
   - Streaming enabled for synthesis path.
   - Reasoning traces shown in UI.

4. **Configurability**
   - Temperature and max token limits configurable per agent.
   - Rate limits configurable via env and enforced centrally.

5. **Failure posture**
   - Fail fast on NVIDIA NIM failures (no fallback provider).

6. **Migration posture**
   - Fresh backend-first start; no migration/import of existing client demo graph data.

---

## Command Appendix

### Core verification commands

```bash
pnpm vitest run apps/api/src/__tests__/*.test.ts
pnpm vitest run apps/mastra-app/src/__tests__/synthesis-agent.test.ts
pnpm vitest run apps/mastra-app/src/__tests__/edge-constructor-agent.test.ts
pnpm vitest run apps/mastra-app/src/__tests__/graph-synthesis-workflow.test.ts
npm test -- --run src/lib/api/synthesis.test.ts
npm test -- --run src/contexts/WorkspaceContext.test.tsx
npm test -- --run src/pages/WorkspaceView.test.tsx
```

### Neo4j local runtime

```bash
docker-compose -f docker-compose.neo4j.yml up -d
docker-compose -f docker-compose.neo4j.yml ps
docker-compose -f docker-compose.neo4j.yml down
docker-compose -f docker-compose.neo4j.yml down -v
```

---

## Completion Criteria

- [ ] Backend graph data is persisted in Neo4j, not browser storage.
- [ ] Add-nodes returns non-empty inferred edges when candidate relationships exist.
- [ ] Synthesis content is LLM-generated from graph evidence (no placeholder fallback text).
- [ ] Citations resolve to real node ids/source labels.
- [ ] Workflow executes end-to-end and returns counts + synthesis payload.
- [ ] Streaming synthesis events render in frontend.
- [ ] Reasoning traces are available in frontend UI.
- [ ] All required tests pass or external failures are documented in `amd-docs/TEST_FAILURES.md`.
- [ ] `amd-docs/IMPLEMENTATION.md` updated at meaningful milestones.

---

Plan complete and saved to `docs/superpowers/plans/2026-04-05-graph-grounded-synthesis-system.md`. Ready to execute?
