# Workspace Flow Editorial Redesign

## Goal

Redesign the workspace -> query creation -> query view flow into a stronger, more distinctive interface while preserving core behavior and keeping usability high.

## Key Decisions

- Remove workspace-level mode signaling from workspace creation UI.
- Require explicit query input + mode selection before navigating to a new query view.
- Replace large mode-specific query creation buttons with a single multiline chat-style composer.
- Keep existing backend API contracts; enforce flow at frontend level.

## Information Architecture

1. `WorkspacesPage`
   - Move from table layout to card-based "Workspace Deck".
   - Keep search + source status visible.
   - Keep workspace creation on same page with stronger visual hierarchy.

2. `WorkspaceQueriesPage`
   - Add one multiline query composer.
   - Inline mode chips (Researcher, Strategist).
   - Single submit action (`Run Query`).
   - Existing queries remain accessible via recent query list.

3. `WorkspaceQueryView`
   - Focus on displaying query workspace content.
   - No extra first-query gating copy in this view.

## UX/Visual Direction

- Personality lane: strong editorial bold.
- Contrast: elevated section cards, stronger headings, distinct action affordances.
- Avoid generic AI tropes (purple/cyan neon gradients, glassmorphism defaults).
- Preserve readability and keyboard/form accessibility.

## Validation Expectations

- Workspaces page no longer shows query mode tag in create block.
- Query page no longer exposes large mode-specific create buttons.
- Query composer supports multiline input and disables submit until input is non-empty.
- Query creation persists mode + query text and navigates to query route.
