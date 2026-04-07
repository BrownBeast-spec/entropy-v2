# Dynamic Query-Aware Synthesis Metrics Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace static zero-prone report stats with query-aware, icon-free metric cards that stay dynamic and non-zero during synthesis, with explicit estimated values when needed.

**Architecture:** Extend the synthesis backend response to always include four validated metric cards built via a hybrid resolver (graph facts first, LLM planning second, deterministic fallback always). Persist these metrics on report objects and render them in the report panel with animation and estimate confidence hints while regeneration is running. Keep failure isolation strict so metric-generation issues never block section synthesis.

**Tech Stack:** TypeScript, Hono, Mastra agents, React, Vitest, Testing Library

---

## File Structure and Responsibilities

- **Backend routing contract**
  - Modify: `apps/api/src/routes/causaly.ts`
  - Responsibility: widen `/api/causaly/synthesise` schema/response to include `metrics`.

- **Backend metric synthesis engine**
  - Modify: `apps/mastra-app/src/agents/synthesis-agent.ts`
  - Responsibility: build `GraphFacts`, plan metric intents, resolve/sanitize to final metric cards, include in result.

- **Backend tests**
  - Modify: `apps/mastra-app/src/__tests__/synthesis-agent.test.ts`
  - Modify: `apps/api/src/__tests__/synthesise.test.ts`
  - Responsibility: validate happy path, validation/fallback/degraded paths, boundary conditions.

- **Frontend API client contract**
  - Modify: `entropy-research-hub/src/lib/api/synthesis.ts`
  - Responsibility: include `metrics` in synthesis response typing/normalization.

- **Frontend report types + metrics utility**
  - Modify: `entropy-research-hub/src/types/workspace.ts`
  - Modify: `entropy-research-hub/src/lib/utils/reportMetrics.ts`
  - Responsibility: add `MetricCardData`/confidence types and deterministic fallback/provisional derivation.

- **Frontend rendering**
  - Modify: `entropy-research-hub/src/components/workspace/MetricCard.tsx`
  - Modify: `entropy-research-hub/src/components/workspace/IntermediateReportPanel.tsx`
  - Modify: `entropy-research-hub/src/pages/WorkspaceView.tsx`
  - Responsibility: icon-free card rendering, estimate hinting, animated values, regeneration merge precedence.

- **Frontend tests**
  - Modify: `entropy-research-hub/src/lib/api/synthesis.test.ts`
  - Modify: `entropy-research-hub/src/lib/utils/reportMetrics.test.ts`
  - Modify: `entropy-research-hub/src/components/workspace/IntermediateReportPanel.citations.test.tsx`
  - Modify: `entropy-research-hub/src/pages/WorkspaceView.search-layout.test.tsx`
  - Responsibility: cover happy/validation/error/boundary behavior for new metrics flow.

- **Progress documentation**
  - Modify: `amd-docs/IMPLEMENTATION.md`
  - Responsibility: track implementation delta and test coverage outcome.

---

## Chunk 1: Backend Metrics Contract and Generation

### Task 1: Add failing tests for synthesise metrics API contract

**Files:**
- Modify: `apps/api/src/__tests__/synthesise.test.ts`

- [ ] **Step 1: Write failing test for successful metrics payload**

Add a test asserting `POST /api/causaly/synthesise` returns:
- `sections` array
- `metrics` array of length 4
- each metric has `key`, `label`, `value`, `confidence`

- [ ] **Step 2: Write failing test for degraded/fallback metrics path**

Add a test that simulates planner failure and verifies:
- request still succeeds
- `sections` still present
- deterministic 4-card fallback metrics returned

- [ ] **Step 3: Write failing test for boundary/empty graph**

Add test with empty graph snapshot and assert:
- sections with no-data content still returned
- metrics length is 4
- values are `0`

- [ ] **Step 4: Run targeted tests to verify RED**

Run:

```bash
pnpm vitest run apps/api/src/__tests__/synthesise.test.ts
```

Expected: new tests fail due to missing `metrics` behavior.

### Task 2: Implement backend metrics generation in synthesis agent

**Files:**
- Modify: `apps/mastra-app/src/agents/synthesis-agent.ts`
- Modify: `apps/mastra-app/src/__tests__/synthesis-agent.test.ts`

- [ ] **Step 1: Add failing unit tests for metric generation and fallback**

Add tests covering:
- computed metrics from graph facts
- invalid planner output sanitation
- deterministic fallback order and count
- empty graph zero metrics
- duplicate metric key rewrite with deterministic suffix (`-2`, `-3`)
- duplicate label handling with deterministic replacement
- invalid slot replacement order (left-to-right from mode template)
- outlier estimate clamp to `100000` and invalid numeric fallback
- planner timeout at `1200ms` hard cap triggers deterministic fallback
- planner schema constraints:
  - `key` kebab-case and max 40 chars
  - `label` max 36 chars and uniqueness
  - `rationale` max 120 chars
  - `estimatedValue` required when `factKey` absent

- [ ] **Step 2: Run synthesis-agent tests to verify RED**

Run:

```bash
pnpm vitest run apps/mastra-app/src/__tests__/synthesis-agent.test.ts
```

Expected: new tests fail due to missing metric generation module behavior.

- [ ] **Step 3: Implement GraphFacts + planned metrics resolver**

In `synthesis-agent.ts`, add:
- `MetricConfidence` and metric card types
- `buildGraphFacts(graphSnapshot)`
- `planMetricCards({ queryText, personaMode, facts })` with hard timeout of `1200ms`
- `resolveMetricCards({ planned, facts, personaMode })`
- deterministic fallback templates and ordering
- key uniqueness enforcement and sanitization rules

- [ ] **Step 4: Extend `summariseFromGraph` result to include metrics**

Return shape must always include:

```ts
{ sections: SynthesisSection[]; metrics: MetricCardData[] }
```

- [ ] **Step 5: Run synthesis-agent tests to verify GREEN**

Run:

```bash
pnpm vitest run apps/mastra-app/src/__tests__/synthesis-agent.test.ts
```

Expected: all synthesis-agent tests pass.

- [ ] **Step 6: Add explicit GraphFacts rule assertions**

Ensure unit tests assert exact GraphFacts behavior:
- `isIndiaRelevant` precedence
- `indiaRelevantSharePct` rounding and zero-node behavior
- strategist/researcher fact values map exactly to template keys

### Task 3: Wire API response schema to return metrics

**Files:**
- Modify: `apps/api/src/routes/causaly.ts`
- Modify: `apps/api/src/__tests__/synthesise.test.ts`

- [ ] **Step 1: Update route handler to pass through `metrics`**

Ensure `/api/causaly/synthesise` response JSON includes `metrics` with exactly 4 items.

- [ ] **Step 2: Add route-level validation/sanitization assertions in tests**

Ensure tests check confidence values are only `computed`/`estimated`, values are non-negative integers.
Also assert:
- `metrics.length === 4`
- optional `rationale` is a string when present
- key uniqueness in final response
- max length constraints preserved (`key<=40`, `label<=36`, `rationale<=120`)

- [ ] **Step 3: Run API synthesize tests to verify GREEN**

Run:

```bash
pnpm vitest run apps/api/src/__tests__/synthesise.test.ts
```

Expected: all tests pass, including new metrics cases.

- [ ] **Step 4: Commit backend chunk**

```bash
git add apps/mastra-app/src/agents/synthesis-agent.ts apps/mastra-app/src/__tests__/synthesis-agent.test.ts apps/api/src/routes/causaly.ts apps/api/src/__tests__/synthesise.test.ts
git commit -m "feat(synthesis): add query-aware metric cards with deterministic fallback"
```

---

## Chunk 2: Frontend Types, API Client, and Metric Utilities

### Task 4: Add failing tests for frontend synthesis client metrics support

**Files:**
- Modify: `entropy-research-hub/src/lib/api/synthesis.test.ts`
- Modify: `entropy-research-hub/src/lib/api/synthesis.ts`

- [ ] **Step 1: Add failing test for parsing metrics from synthesize API response**

Assert client returns metrics array and preserves confidence/rationale fields.
Also assert exact parity fields: `key`, `label`, `value`, `confidence`, optional `rationale`.

- [ ] **Step 2: Add failing test for malformed metrics fallback**

Assert malformed API `metrics` payload normalizes safely without throw.

- [ ] **Step 3: Add failing test for legacy missing report metrics derivation**

Assert compatibility behavior:
- legacy missing `report.metrics` -> derive deterministic metrics from workspace/query

- [ ] **Step 4: Add failing test for missing workspace fallback**

Assert when workspace context is absent/stale:
- deterministic 4-card zero fallback with stable template order

- [ ] **Step 5: Run targeted test to verify RED**

Run:

```bash
cd entropy-research-hub && npm test -- --run src/lib/api/synthesis.test.ts
```

Expected: newly added metrics tests fail.

### Task 5: Add type and utility support for metric cards

**Files:**
- Modify: `entropy-research-hub/src/types/workspace.ts`
- Modify: `entropy-research-hub/src/lib/utils/reportMetrics.ts`
- Modify: `entropy-research-hub/src/lib/utils/reportMetrics.test.ts`

- [ ] **Step 1: Add failing unit tests for deterministic fallback metric derivation**

Cover:
- researcher template returns 4 cards
- strategist template returns 4 cards
- empty workspace returns zeros
- estimate vs computed confidence semantics

- [ ] **Step 2: Run reportMetrics tests to verify RED**

Run:

```bash
cd entropy-research-hub && npm test -- --run src/lib/utils/reportMetrics.test.ts
```

Expected: failures for missing new metric contract.

- [ ] **Step 3: Implement `MetricCardData` types and fallback helpers**

Add/update:
- report type includes optional `metrics`
- utilities to build provisional deterministic metrics from workspace snapshot + query context
- helper to format estimated values and confidence hints

- [ ] **Step 4: Re-run synthesis + metrics utility tests to verify GREEN**

Run:

```bash
cd entropy-research-hub && npm test -- --run src/lib/api/synthesis.test.ts src/lib/utils/reportMetrics.test.ts
```

Expected: all targeted tests pass.

- [ ] **Step 5: Commit frontend contract chunk**

```bash
git add entropy-research-hub/src/lib/api/synthesis.ts entropy-research-hub/src/lib/api/synthesis.test.ts entropy-research-hub/src/types/workspace.ts entropy-research-hub/src/lib/utils/reportMetrics.ts entropy-research-hub/src/lib/utils/reportMetrics.test.ts
git commit -m "feat(frontend): add typed synthesis metrics contract and deterministic fallbacks"
```

---

## Chunk 3: UI Rendering, Animation, and Regeneration Flow

### Task 6: Add failing UI tests for icon removal and estimate rendering

**Files:**
- Modify: `entropy-research-hub/src/components/workspace/IntermediateReportPanel.citations.test.tsx`
- Modify: `entropy-research-hub/src/components/workspace/MetricCard.tsx`
- Modify: `entropy-research-hub/src/components/workspace/IntermediateReportPanel.tsx`

- [ ] **Step 1: Add failing test: no icon block in metric cards**

Assert metric cards render label/value without icon container.

- [ ] **Step 2: Add failing test: estimated value formatting**

Assert estimated metrics render with `~` prefix and visible `Estimated` hint.

- [ ] **Step 3: Run panel tests to verify RED**

Run:

```bash
cd entropy-research-hub && npm test -- --run src/components/workspace/IntermediateReportPanel.citations.test.tsx
```

Expected: failures for new metric expectations.

### Task 7: Add failing regeneration-flow tests for dynamic non-zero cards

**Files:**
- Modify: `entropy-research-hub/src/pages/WorkspaceView.search-layout.test.tsx`
- Modify: `entropy-research-hub/src/pages/WorkspaceView.tsx`

- [ ] **Step 1: Add failing test: provisional metrics appear during regeneration**

Assert that once regenerate starts, metric cards update immediately from provisional deterministic metrics.

- [ ] **Step 2: Add failing test: API metrics replace provisional atomically on success**

Assert no mixed state (all cards replaced together).

- [ ] **Step 3: Add failing test: failure precedence rule**

Assert on synthesis failure:
1) prior persisted metrics retained if present
2) otherwise provisional deterministic metrics remain

- [ ] **Step 4: Run workspace view tests to verify RED**

Run:

```bash
cd entropy-research-hub && npm test -- --run src/pages/WorkspaceView.search-layout.test.tsx
```

Expected: failures for missing provisional/merge precedence behavior.

### Task 8: Implement UI and flow behavior to satisfy tests

**Files:**
- Modify: `entropy-research-hub/src/components/workspace/MetricCard.tsx`
- Modify: `entropy-research-hub/src/components/workspace/IntermediateReportPanel.tsx`
- Modify: `entropy-research-hub/src/pages/WorkspaceView.tsx`

- [ ] **Step 1: Remove icon rendering and add confidence-aware value rendering**

Implement icon-free metric card with:
- value
- estimated prefix handling
- confidence hint text/chip

- [ ] **Step 2: Add animation hook/logic for numeric transitions**

Implement animation spec:
- 400ms
- RAF interpolation
- supports up/down
- interrupt-safe
- `prefers-reduced-motion` snap behavior

- [ ] **Step 3: Add provisional metrics state in `WorkspaceView`**

Set provisional metrics on regeneration start, pass to report panel while `isRegenerating`.

- [ ] **Step 4: Persist and consume final metrics from synthesis response**

Store `report.metrics` in query report/current report and replace provisional atomically.

- [ ] **Step 5: Implement legacy compatibility read-path in report rendering**

When `report.metrics` is missing:
- derive deterministic metrics from `currentWorkspace` + query context
- if workspace unavailable/stale, render deterministic 4-card zero fallback (`confidence: computed`)

- [ ] **Step 6: Run affected frontend suites to verify GREEN**

Run:

```bash
cd entropy-research-hub && npm test -- --run src/components/workspace/IntermediateReportPanel.citations.test.tsx src/pages/WorkspaceView.search-layout.test.tsx src/lib/api/synthesis.test.ts src/lib/utils/reportMetrics.test.ts
```

Expected: all targeted tests pass.

- [ ] **Step 7: Commit UI chunk**

```bash
git add entropy-research-hub/src/components/workspace/MetricCard.tsx entropy-research-hub/src/components/workspace/IntermediateReportPanel.tsx entropy-research-hub/src/pages/WorkspaceView.tsx entropy-research-hub/src/components/workspace/IntermediateReportPanel.citations.test.tsx entropy-research-hub/src/pages/WorkspaceView.search-layout.test.tsx
git commit -m "feat(report): render dynamic icon-free synthesis metrics with estimates"
```

---

## Chunk 4: Final Verification and Documentation

### Task 9: Run full relevant verification matrix

**Files:**
- No file edits; verification only

- [ ] **Step 1: Run backend relevant tests**

```bash
pnpm vitest run apps/api/src/__tests__/synthesise.test.ts apps/mastra-app/src/__tests__/synthesis-agent.test.ts
```

Expected: pass.

- [ ] **Step 2: Run frontend relevant tests**

```bash
cd entropy-research-hub && npm test -- --run src/lib/api/synthesis.test.ts src/lib/utils/reportMetrics.test.ts src/components/workspace/IntermediateReportPanel.citations.test.tsx src/pages/WorkspaceView.search-layout.test.tsx
```

Expected: pass.

- [ ] **Step 3: Explicitly verify acceptance criterion 7 (legacy missing metrics)**

Run or add focused test assertion in:

```bash
cd entropy-research-hub && npm test -- --run src/components/workspace/IntermediateReportPanel.citations.test.tsx src/pages/WorkspaceView.search-layout.test.tsx
```

Expected: legacy report objects without `metrics` render deterministic cards without crash.

- [ ] **Step 4: If any external/unfixable failure occurs, document it**

Update:
- `amd-docs/TEST_FAILURES.md`

Include required template fields from guardrails.

### Task 10: Update implementation log and make final commit

**Files:**
- Modify: `amd-docs/IMPLEMENTATION.md`

- [ ] **Step 1: Add implementation summary entry**

Document:
- query-aware metrics added
- icon removal
- estimate confidence semantics
- regeneration dynamic behavior
- test files and pass counts

- [ ] **Step 2: Commit docs + remaining integration changes**

```bash
git add amd-docs/IMPLEMENTATION.md
git commit -m "docs: record dynamic synthesis metrics implementation status"
```

- [ ] **Step 3: Final status check**

```bash
git status --short --branch
```

Expected: clean working tree (or only intentionally uncommitted files).

---

## Notes for Implementers

- Keep YAGNI: exactly 4 cards, no extra dashboard widgets.
- Keep failure isolation strict: sections must still generate when metrics degrade.
- Do not weaken assertions to force pass.
- Preserve deterministic ordering to avoid flaky UI snapshots/tests.
