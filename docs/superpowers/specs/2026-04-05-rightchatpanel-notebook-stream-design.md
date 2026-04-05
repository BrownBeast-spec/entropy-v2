# RightChatPanel Notebook Stream Design

## Goal

Transform the workspace right rail into a chat-style Lab Notebook that feels conversational, supports evidence selection, and preserves existing search/add-to-graph behavior with improved hierarchy and personality.

## Scope

- Workspace route behavior only (`/workspaces/:workspaceId/queries/:queryId`) for notebook mode.
- Keep non-workspace routes behaviorally intact.
- Add panel collapse/expand and widen panel from 340px to 400px.

## Design Direction

- Visual tone: Lab Notebook (evidence-first, conversational, technical but warm).
- Avoid generic AI visual tropes (no neon purple gradients, no glassmorphism).
- Emphasize one focal pattern: alternating "You asked" and "Entropy found" timeline entries.

## Information Architecture

1. Header
   - Lab Notebook title + active query subtitle.
   - Collapse control.

2. Context Strip
   - India Lens toggle.
   - Timeline start/end date controls.
   - Compact card-like controls.

3. Notebook Timeline
   - Empty state prompt for first run.
   - For each search:
     - User bubble: query text with "You asked" label.
     - Assistant block: status chip and evidence output with "Entropy found" (or searching/error variants).
     - Sources summary + diagnostics.
     - Inline result cards with selection checkboxes.

4. Sticky Action Tray
   - Appears when one or more results are selected.
   - Shows count and "Add Selected to Graph" action.

5. Composer
   - Search input + submit button pinned at bottom.

6. Collapsed Rail
   - Narrow vertical rail with expand button and rotated label.

## Data and Interaction Model

- Replace single flat search-results view with notebook entries:
  - Entry has id, query, status, results, searched sources, diagnostics, optional timing/error.
- Run sequence:
  - Submit query -> append running entry.
  - On success -> complete entry with results.
  - On failure -> mark entry failed and surface error.
- Selection:
  - Track selected IDs as entry-aware keys (`entryId::resultId`) to avoid collisions across entries.
  - Flatten selected result objects when submitting add-to-graph request.

## Accessibility and Quality Constraints

- Collapse/expand controls use explicit accessible names:
  - "Collapse notebook"
  - "Expand notebook"
- Preserve existing form labels for tests and screen readers:
  - India Lens, Timeline Start, Timeline End.
- Maintain keyboard enter-to-search behavior.

## Verification Strategy

- Update unit tests for RightChatPanel to validate:
  - Notebook timeline labels render after successful search.
  - Collapse/expand behavior hides and restores composer/input.
  - Width token class is used in workspace mode.
- Keep existing tests for:
  - search request payload,
  - add-selected workflow,
  - diagnostics display.
- Run impacted integration tests with WorkspaceView.

## Implemented Files

- `entropy-research-hub/src/components/layout/RightChatPanel.tsx`
- `entropy-research-hub/src/components/layout/RightChatPanel.test.tsx`
- `entropy-research-hub/src/index.css`
