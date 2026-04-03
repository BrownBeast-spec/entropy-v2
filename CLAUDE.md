# Engineering Guardrails (Entropy v2)

This file defines mandatory quality rules for all future implementation work (human + AI contributors).

## 1) Testing Is Mandatory

- No production code change is complete without tests.
- New feature or behavior change: add/expand tests for the changed behavior.
- Bug fix: add a regression test that reproduces the bug first.
- Refactor: keep existing tests green; add tests if behavior surface changed.

## 2) Minimum Test Coverage Per Change

For each changed behavior, include:

- Happy path (expected success)
- Validation/invalid input case
- Error/degraded path (partial failure, fallback, unavailable dependency, etc.)
- At least one boundary/edge case

## 3) Do Not “Test-to-Pass” by Weakening Assertions

- Never delete or weaken assertions just to make tests pass.
- Never remove failing tests unless behavior is intentionally removed and documented.
- If a test fails, fix product code first.
- If failure is external (infra/network/tooling) and not fixable here, document it in `amd-docs/TEST_FAILURES.md`.

## 4) Failure Documentation Standard

When a test cannot be fixed from this codebase, add an entry to `amd-docs/TEST_FAILURES.md` with:

- Test name and file path
- Exact error output
- Why this is external/out-of-scope
- What was attempted
- Next owner/action needed
- Temporary risk/impact

Do not claim “all good” while such failures remain undocumented.

## 5) TDD Workflow Requirement

- Write/adjust tests first for the targeted behavior.
- Run tests and confirm failure for the expected reason.
- Implement minimal code to satisfy behavior.
- Re-run tests and keep them green.

## 6) Required Verification Before Marking Work Complete

Run all relevant test suites for touched areas. At minimum:

- Backend/API changes: `pnpm vitest run apps/api/src/__tests__/*.test.ts`
- Mastra agent changes: `pnpm vitest run apps/mastra-app/src/__tests__/<affected>.test.ts`
- Frontend (`entropy-research-hub`) changes:
  - `npm test -- --run <affected-test-files>`
  - plus any additional impacted frontend tests

Report test results in the update message with pass/fail counts.

## 7) Preserve and Grow Test Quality

- Prefer behavior-driven tests over implementation-detail tests.
- Avoid over-mocking; mock only external boundaries.
- Keep tests deterministic (no arbitrary sleeps; no flaky timing assumptions).
- Add regression coverage for every defect discovered during implementation.

## 8) Implementation Tracking Requirement

- After meaningful implementation increments, update `amd-docs/IMPLEMENTATION.md` with what is now implemented vs. still pending.

These rules are non-negotiable unless explicitly overridden by the user in the current session.
