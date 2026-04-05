# Entropy UI Transformation Plan
## From Modem.dev Clone to Research Workspace Product

---

## Executive Summary

**Current State:** The codebase is a modem.dev visual clone with:
- Three-column shell (left sidebar + main content + right chat panel) ✅
- Settings with secondary sidebar navigation ✅
- Dark theme, table-based layouts, compact design ✅
- Placeholder pages (Topics, People, Companies, Automations, Agent) that don't serve Entropy's purpose

**Target State:** A research workspace product for Indian pharma with:
- The same modem.dev shell for non-workspace screens
- A specialized three-panel workspace view (left query sidebar + center knowledge graph + bottom report panel)
- Actual functionality for workspace creation, query entry, research progress, and report generation
- Data source integrations (Open Targets, PubMed, STRING, PatentsView, etc.)

**Gap Analysis:** We need to:
1. **Repurpose** the Workspaces page (already matches spec) ✅
2. **Create** the three-panel Workspace View (the core product)
3. **Replace** Topics/People/Companies/Automations with Entropy-specific screens or remove them
4. **Adapt** Settings pages to Entropy's needs (Data Sources, MCP Servers, Graph Preferences)
5. **Build** the underlying research engine (MCP tools, autonomous loop, knowledge graph)

---

## Architecture Decisions Already Made

Based on the UI spec, these decisions are locked in:

1. **Shell Pattern:** Keep modem.dev three-column shell for all screens EXCEPT the Workspace View
2. **Workspace View Exception:** Screens 3-5 (Query Entry, Research Progress, Research State) use a custom three-panel layout that breaks from the shell
3. **Navigation:** Left sidebar shows: Agent, Workspaces, Settings (remove Topics, People, Companies, Automations)
4. **Right Panel Context:** The AI chat panel remains persistent and context-aware across all screens
5. **Two Modes:** Researcher Mode (biological focus) and Strategist Mode (competitive/market focus) are persona toggles, not separate product sections
6. **India Lens:** A toggle that filters and highlights India-specific data, not a separate view
7. **Graph Technology:** Cytoscape.js for knowledge graph visualization
8. **Storage:** IndexedDB for persistent workspace data (client-side first, backend later)
9. **No Backend Yet:** All data fetching happens client-side via MCP tools for the 7-day MVP

---

## Implementation Phases

### Phase 1: Shell & Navigation Cleanup (Day 1)
**Goal:** Adapt the existing modem.dev shell to Entropy's navigation structure

#### 1.1 Update Left Sidebar Navigation
**File:** `src/components/layout/LeftSidebar.tsx`

**Changes:**
- Remove: Topics, People, Companies, Automations nav items
- Keep: Agent, Workspaces, Settings
- Update icons to match Entropy context
- Ensure "Workspaces" is highlighted by default on landing

**Acceptance:** Sidebar shows only 3 nav items; clicking each routes correctly.

#### 1.2 Update Top Bar Breadcrumbs
**File:** `src/components/layout/TopBar.tsx`

**Changes:**
- Add breadcrumb patterns for:
  - `/workspaces/:id` → "Entropy / [Workspace Name]"
  - `/workspaces/:id/protein/:gene` → "Entropy / [Workspace Name] / Protein Profile / [Gene Symbol]"
  - `/workspaces/:id/dossier` → "Entropy / [Workspace Name] / Generate Dossier"
- Keep existing settings breadcrumbs
- Remove breadcrumbs for deleted pages (Topics, People, Companies)

**Acceptance:** Breadcrumbs update dynamically based on route; workspace name appears when inside a workspace.

#### 1.3 Update Right Chat Panel Context
**File:** `src/components/layout/RightChatPanel.tsx`

**Changes:**
- Remove references to Topics, People, Companies, Automations
- Update context messages:
  - On Workspaces page: existing welcome message ✅
  - On Workspace View: "You're in [Workspace Name] — ask about nodes, suggest follow-up queries, or request synthesis"
  - On Settings > Data Sources: "Open Targets is your most-used source (31% of graph nodes). PubMed was last fetched 4 minutes ago."
  - On Protein Profile: "You're viewing [Gene Symbol]. Ask me about its role in [disease], known inhibitors, or Indian trial activity."

**Acceptance:** Chat panel shows contextual messages matching the current screen.

#### 1.4 Remove Unused Pages
**Files to delete:**
- `src/pages/TopicsPage.tsx`
- `src/pages/PeoplePage.tsx`
- `src/pages/CompaniesPage.tsx`
- `src/pages/AutomationsPage.tsx`

**File to update:** `src/App.tsx`
- Remove routes for deleted pages
- Keep `/` redirecting to `/workspaces`
- Add new routes:
  - `/workspaces/:id` → WorkspaceView (to be created)
  - `/workspaces/:id/protein/:gene` → ProteinProfile (to be created)
  - `/workspaces/:id/dossier` → DossierGeneration (to be created)

**Acceptance:** Deleted page routes return 404; new routes are registered (even if components are placeholders).

---

### Phase 2: Workspaces Landing & Creation (Day 1-2)
**Goal:** Screen 1 (Landing/Entry) is already 95% complete; finalize it and wire up workspace creation

#### 2.1 Finalize WorkspacesPage
**File:** `src/pages/WorkspacesPage.tsx`

**Current state:** Already matches spec perfectly ✅

**Required changes:**
- Wire up "Create and start researching" button to actually create a workspace object
- Store workspace in IndexedDB or React Context/State
- Navigate to `/workspaces/:id` on creation
- Make table rows clickable to open existing workspaces

**Data Model for Workspace:**
```typescript
interface Workspace {
  id: string;
  name: string;
  description?: string;
  mode: "Researcher" | "Strategist";
  indiaLens: boolean;
  createdAt: Date;
  updatedAt: Date;
  nodes: GraphNode[];
  edges: GraphEdge[];
  queries: Query[];
  savedItems: SavedItem[];
}
```

**Acceptance:** 
- User can create a workspace and is routed to `/workspaces/:id`
- Workspace data persists in IndexedDB
- Returning to `/workspaces` shows the created workspace in the table

#### 2.2 Create Workspace Context Provider
**New file:** `src/contexts/WorkspaceContext.tsx`

**Purpose:** Global state for the current workspace, so all child components can access and modify it

**Exports:**
- `WorkspaceProvider` component
- `useWorkspace()` hook
- `useWorkspaceActions()` hook for mutations (addNode, addEdge, runQuery, etc.)

**Acceptance:** Wrapping a component in WorkspaceProvider gives it access to workspace state.

---

### Phase 3: Workspace View Shell (Day 2)
**Goal:** Create the three-panel layout for Screens 3-5 (Query Entry, Research Progress, Research State)

#### 3.1 Create WorkspaceView Component
**New file:** `src/pages/WorkspaceView.tsx`

**Structure:**
```tsx
<div className="flex h-screen"> {/* Full-height, no modem.dev shell */}
  <CollapsibleLeftSidebar /> {/* Query sidebar */}
  <div className="flex-1 flex flex-col">
    <WorkspaceTopBar /> {/* Breadcrumb, persona toggle, India Lens toggle */}
    <ResizablePanels>
      <KnowledgeGraphPanel /> {/* Top: Cytoscape canvas */}
      <IntermediateReportPanel /> {/* Bottom: AI synthesis */}
    </ResizablePanels>
  </div>
</div>
```

**State Management:**
- Use `react-resizable-panels` (already in package.json ✅) for vertical split
- Default proportions: graph 55%, report 45%
- Sidebar default width: 22% of total, collapsible to icon rail

**Acceptance:** 
- Three panels render correctly
- Panels are resizable with drag handles
- Left sidebar collapses to icon rail
- Persona toggle and India Lens toggle are visible in top bar

---

### Phase 4: Knowledge Graph Panel (Day 2-3)
**Goal:** Render the knowledge graph canvas using Cytoscape.js

#### 4.1 Install Cytoscape.js
```bash
npm install cytoscape @types/cytoscape
```

#### 4.2 Create KnowledgeGraphPanel Component
**New file:** `src/components/workspace/KnowledgeGraphPanel.tsx`

**Features:**
- Cytoscape.js canvas with force-directed layout (cose algorithm)
- Node visual encoding:
  - Shape: circle (biological), rectangle (drug/compound), diamond (patent), hexagon (trial), square (company)
  - Color: by data source (Open Targets, STRING, PubMed, PatentsView, OpenFDA)
  - Size: by evidence strength
- Edge visual encoding:
  - Thickness: by confidence score
  - Color: by relationship type
- Toolbar:
  - Zoom in/out buttons
  - Fit to screen
  - Node search/highlight input
  - Layout toggle (force-directed / hierarchical / circular)
  - View variant pills: Graph (active), Timeline, Dendrogram
- Click node → open Detail Drawer
- Hover node → show tooltip
- Right-click node → context menu (Pin to saved items, Generate sub-report, Remove from graph)

**Data Model for Graph Nodes:**
```typescript
interface GraphNode {
  id: string;
  label: string;
  type: "disease" | "gene" | "protein" | "drug" | "compound" | "patent" | "trial" | "company" | "paper";
  source: "Open Targets" | "STRING" | "PubMed" | "PatentsView" | "OpenFDA" | "ClinicalTrials.gov" | "Europe PMC";
  metadata: Record<string, any>;
  evidenceScore?: number;
  addedByQuery: string; // Query ID that added this node
  indiaRelevant?: boolean; // For India Lens highlighting
}

interface GraphEdge {
  id: string;
  source: string; // Node ID
  target: string; // Node ID
  type: "association" | "interaction" | "binding" | "ownership" | "sponsorship";
  confidence?: number;
  metadata: Record<string, any>;
}
```

**Acceptance:**
- Empty workspace shows an empty graph canvas with a message: "No nodes yet — submit a query to start building the graph"
- When nodes exist, they render with correct visual encoding
- Clicking a node logs its ID to console (Detail Drawer wiring comes later)
- Toolbar buttons work (zoom, fit, search highlights nodes)

#### 4.3 Create Timeline and Dendrogram View Variants
**New files:**
- `src/components/workspace/TimelineView.tsx` (Recharts vertical timeline)
- `src/components/workspace/DendrogramView.tsx` (Modal overlay with hierarchical tree)

**Acceptance:**
- Clicking "Timeline" pill replaces graph canvas with timeline
- Clicking "Dendrogram" pill opens modal overlay with tree
- Clicking "Graph" pill returns to graph canvas

---

### Phase 5: Intermediate Report Panel (Day 3)
**Goal:** Display AI-generated synthesis with inline citations

#### 5.1 Create IntermediateReportPanel Component
**New file:** `src/components/workspace/IntermediateReportPanel.tsx`

**Features:**
- Rich-text display area (editable with contentEditable or a lightweight editor like TipTap)
- Structured sections based on mode:
  - Researcher Mode: Overview, Key Targets and Evidence, Molecular Context, Safety Signals, Open Questions
  - Strategist Mode: Competitive Landscape Overview, Dominant Players and Patent Position, Patent Expiry Timeline, Trial Activity Summary, White Space Opportunities
- Inline citation badges after each claim (e.g., "[Open Targets]", "[PMID 38291045]", "[NCT02345678]")
- Click citation badge → highlight corresponding node in graph
- Toolbar:
  - Word count
  - "Regenerate synthesis" button
  - "Generate full dossier" button
  - Export dropdown (Markdown, PDF, JSON)
- Collapse toggle to maximize graph canvas

**Data Model for Report:**
```typescript
interface Report {
  workspaceId: string;
  sections: ReportSection[];
  generatedAt: Date;
  wordCount: number;
}

interface ReportSection {
  title: string;
  content: string; // Markdown or HTML with citation badges
  citations: Citation[];
}

interface Citation {
  id: string;
  nodeId: string; // Links to graph node
  source: string;
  label: string; // Display text for badge
}
```

**Acceptance:**
- Panel displays placeholder report text with mock citations
- Clicking a citation badge logs the node ID to console
- "Regenerate synthesis" button shows a toast: "Synthesis updated"
- Export dropdown shows format options (functionality comes later)

---

### Phase 6: Left Query Sidebar (Day 3-4)
**Goal:** Allow users to add new queries and see query history

#### 6.1 Create QuerySidebar Component
**New file:** `src/components/workspace/QuerySidebar.tsx`

**Features:**
- Workspace name with edit icon (inline edit)
- Persona toggle (Researcher / Strategist)
- India Lens toggle
- "Add to graph" input with persona-aware placeholder text
- Submit button → triggers Research Progress State
- "Suggested next questions" section (3 AI-generated follow-ups)
- "Query history" section (list of all queries with node counts and dates)
- Click historical query → highlight its contributed nodes in graph
- "Saved items" section (pinned nodes from graph)
- Click saved item → open Detail Drawer
- Collapse toggle to icon rail

**Data Model for Query:**
```typescript
interface Query {
  id: string;
  workspaceId: string;
  text: string;
  mode: "Researcher" | "Strategist";
  indiaLens: boolean;
  submittedAt: Date;
  status: "pending" | "running" | "complete" | "failed";
  contributedNodes: string[]; // Node IDs added by this query
  contributedEdges: string[]; // Edge IDs added by this query
  completenessScore?: number;
  iterations?: number;
}
```

**Acceptance:**
- User can type a query and submit it
- Submission triggers a Research Progress State (placeholder for now)
- Query appears in history list
- Suggested questions are hardcoded placeholders (AI generation comes later)
- Saved items list is empty initially

---

### Phase 7: Research Progress State (Day 4)
**Goal:** Show live progress while the autonomous research loop runs

#### 7.1 Create ResearchProgressOverlay Component
**New file:** `src/components/workspace/ResearchProgressOverlay.tsx`

**Features:**
- Full-screen overlay (or inline panel within workspace)
- Live progress log (lines appear as each step completes)
- Example log lines:
  - "Checking existing graph for coverage of your query..."
  - "Coverage score: 34 out of 100 — augmenting with new data."
  - "Fetching disease-target associations from Open Targets... (12 nodes added)"
  - "Fetching protein interaction data from STRING DB... (8 nodes added)"
  - "Coverage score: 91 — research complete. (Iteration 2 of 3)"
  - "Generating intermediate synthesis..."
- Iteration counter: "Iteration 2 of 3"
- Live node/edge count updates
- "Cancel and view partial results" button
- Auto-transitions to Research State when loop completes

**Technical Approach (MVP):**
- For 7-day demo: simulate the loop with setTimeout and hardcoded delays
- Each "step" adds dummy nodes to the workspace graph
- Completeness score is calculated as: (current node count / 100) * 100
- After 3 iterations or score >= 85, transition to Research State

**Acceptance:**
- Submitting a query shows the progress overlay
- Log lines appear sequentially (simulated)
- Node count updates in real-time
- Clicking "Cancel" returns to Research State with partial graph
- Loop auto-completes and shows Research State

---

### Phase 8: Detail Drawer (Day 4-5)
**Goal:** Show full entity details when a node is clicked

#### 8.1 Create EntityDetailDrawer Component
**New file:** `src/components/workspace/EntityDetailDrawer.tsx`

**Features:**
- Slide-in drawer from right edge (use Radix Dialog or custom drawer)
- Header: entity name, type badge, source badge
- Body content varies by entity type:
  - **Gene/Protein:** UniProt accession, function summary, simplified feature track, disease associations, known drugs, "Open full protein profile" button
  - **Disease:** Disease name, EFO ID, associated targets (filtered to nodes in current graph)
  - **Drug/Compound:** Compound name, PubChem CID, known targets, clinical status, ChEMBL link
  - **Patent:** Patent ID, title, assignee, filing date, expiry date, abstract snippet, links to Google Patents/PatentsView
  - **Trial:** NCT ID, title, sponsor, phase, status, primary endpoint, link to ClinicalTrials.gov
  - **Paper:** Title, authors, journal, date, abstract, MeSH terms, AI summary, links to PubMed/Europe PMC
- Actions:
  - "Pin to saved items" button
  - "Remove from graph" button
  - "Find all connections in graph" (highlights edges)
- Close button

**Acceptance:**
- Clicking a node in the graph opens the drawer
- Drawer shows entity-specific content (hardcoded for now)
- "Pin to saved items" adds the node to the sidebar saved items list
- "Remove from graph" removes the node and closes drawer

---

### Phase 9: Settings Pages (Day 5)
**Goal:** Adapt Settings to Entropy's needs

#### 9.1 Create SettingsDataSources Page
**New file:** `src/pages/settings/SettingsDataSources.tsx`

**Features:**
- Grid of data source cards (identical to modem.dev Integrations page)
- Sources: Open Targets, STRING, PubMed, Europe PMC, PatentsView, OpenFDA, ClinicalTrials.gov
- Each card shows:
  - Source logo/icon
  - Connected / Not connected status dot
  - Last fetched timestamp
  - "Force Refresh" button (or "Connect" if requires API key)
- API key input fields for PubMed and OpenFDA (optional)

**Acceptance:**
- Page renders with all 7 source cards
- Status dots reflect hardcoded states (green for Open Targets/PubMed, amber for STRING, grey for others)
- "Force Refresh" button shows toast: "Refreshing [source]..."

#### 9.2 Create SettingsGraphPreferences Page
**New file:** `src/pages/settings/SettingsGraphPreferences.tsx`

**Features:**
- Maximum graph size limit slider (50-200 nodes)
- Default layout algorithm dropdown (force-directed, hierarchical, circular)
- "Auto-suggest follow-up questions" toggle (on by default)

**Acceptance:**
- Page renders with form fields
- Changes save to localStorage (or IndexedDB)

#### 9.3 Create SettingsExportPreferences Page
**New file:** `src/pages/settings/SettingsExportPreferences.tsx`

**Features:**
- Default dossier format dropdown (Full Dossier / Executive Summary / India Regulatory Briefing / Competitive Intelligence)
- "Include provenance metadata in JSON exports" toggle

**Acceptance:**
- Page renders with form fields
- Changes save to localStorage

#### 9.4 Update SettingsMcpServers Page
**File:** `src/pages/settings/SettingsMcpServers.tsx`

**Current state:** Likely already matches modem.dev pattern

**Changes (if needed):**
- Ensure it shows a table of MCP servers with enable/disable toggles
- Empty state: "No MCP servers configured"

**Acceptance:** Page matches spec exactly.

#### 9.5 Update Settings Secondary Sidebar
**File:** `src/components/layout/SettingsSidebar.tsx`

**Changes:**
- Nav items should be: Organization, Data Sources, MCP Servers, Graph Preferences, Export Preferences
- Remove: Members, Keywords, Topics, Projects, Integrations, Channels, Billing & Usage (unless you want to keep some)

**Acceptance:** Sidebar shows Entropy-specific settings sections.

---

### Phase 10: Full Dossier Generation (Day 5-6)
**Goal:** Screen 6 — Generate comprehensive report from workspace graph

#### 10.1 Create DossierGenerationPage Component
**New file:** `src/pages/DossierGenerationPage.tsx`

**Features:**
- Full-screen overlay (or dedicated route: `/workspaces/:id/dossier`)
- Header: workspace name breadcrumb
- Format selector (segmented button group):
  - Full Dossier
  - Executive Summary
  - India Regulatory Briefing
  - Competitive Intelligence Report
- Generation log panel (styled like terminal output)
- Estimated time badge
- Live log lines:
  - "Synthesising biological evidence (47 nodes)..."
  - "Analysing competitive landscape (23 nodes)..."
  - "Generating regulatory context..."
  - "Composing full dossier..."
  - "Applying India Lens filters..."
- On completion: document preview with pagination
- Action buttons: Download PDF, Download Markdown, Copy, Return to workspace

**Technical Approach (MVP):**
- Simulate generation with setTimeout
- Preview shows a hardcoded multi-page document (or dynamically generated from graph data if time permits)

**Acceptance:**
- Clicking "Generate full dossier" from report panel navigates here
- Log appears sequentially
- Preview renders after generation
- "Return to workspace" navigates back to workspace view

---

### Phase 11: Standalone Protein Profile (Day 6)
**Goal:** Screen 7 — Deep-dive protein reference page

#### 11.1 Create ProteinProfilePage Component
**New file:** `src/pages/ProteinProfilePage.tsx`

**Features:**
- Uses modem.dev shell (left sidebar + main content + right chat panel)
- Breadcrumb: "Entropy / [Workspace Name] / Protein Profile / [Gene Symbol]"
- Two-column layout:
  - Left column (narrow): Metadata card (protein name, UniProt accession, organism, function summary)
  - Right column (wide): 
    - UniProt Feature Viewer (if feasible to embed)
    - Disease associations table
    - Known drugs table
    - Pathway memberships
- "Add to workspace graph" button in header
- "Return to workspace" link in breadcrumb

**Technical Approach (MVP):**
- Hardcoded data for 2-3 example proteins (e.g., PPARG, GLP1R, DPP4)
- Tables use modem.dev table styles
- UniProt Feature Viewer: if time permits, use a lightweight embed or static image placeholder

**Acceptance:**
- Route `/workspaces/:id/protein/:gene` renders the page
- Tables display protein data
- "Add to workspace graph" adds a protein node to the workspace
- Right chat panel shows contextual message about the protein

---

### Phase 12: Error & Degradation States (Day 6-7)
**Goal:** Handle failures gracefully

#### 12.1 Graph Render Failure State
**Component:** `src/components/workspace/KnowledgeGraphPanel.tsx`

**Features:**
- If Cytoscape fails to render, replace canvas with a plain table of nodes grouped by type
- Amber banner at top: "Graph visualisation unavailable — showing list view" with "Retry render" link

**Acceptance:**
- Simulating a render error shows the table view

#### 12.2 Research Loop Partial Failure State
**Component:** `src/components/workspace/ResearchProgressOverlay.tsx`

**Features:**
- If a MCP tool fails, show amber status in log: "STRING DB unavailable — skipping protein interaction data"
- Mark affected nodes as "incomplete" with a badge
- Graph shows warning badge: "3 sources incomplete"
- User can retry failed sources later

**Acceptance:**
- Simulating a tool failure shows the warning state

#### 12.3 Report Generation Failure State
**Component:** `src/pages/DossierGenerationPage.tsx`

**Features:**
- If synthesis step fails, show red-bordered error card
- Two buttons: "Retry synthesis" and "Download raw data" (exports graph as JSON)

**Acceptance:**
- Simulating a generation failure shows the error card

---

### Phase 13: MCP Tool Integration (Day 7+, Post-MVP)
**Goal:** Replace hardcoded data with real MCP tool calls

This is the most complex phase and should be tackled AFTER the UI is fully functional with mock data.

#### 13.1 MCP Tools to Implement
Each tool is a separate module that fetches data from an API and returns structured results.

1. **OpenTargetsAssociationTool** → fetches disease-target associations
2. **StringProteinInteractionTool** → fetches protein-protein interactions
3. **PubMedLiteratureTool** → searches PubMed for papers
4. **EuropePMCTool** → searches Europe PMC for papers
5. **PatentsViewTool** → searches US patents
6. **OpenFDASafetyTool** → fetches adverse event reports
7. **ClinicalTrialsTool** → searches ClinicalTrials.gov

Each tool returns results in a normalized `GraphNode[]` and `GraphEdge[]` format.

#### 13.2 Autonomous Research Loop
**New file:** `src/lib/research/autonomousLoop.ts`

**Algorithm:**
1. Parse user query to extract entities (disease, drug, gene)
2. Calculate current graph coverage score (0-100)
3. If score < 85:
   - Select which MCP tools to call based on entity types
   - Call tools in parallel
   - Add results to graph
   - Recalculate coverage score
   - If iteration < 3 and score < 85, repeat
4. Generate intermediate synthesis using AI (GPT-4 or Claude)

**Acceptance:**
- Submitting a query triggers real API calls
- Graph is populated with real data
- Coverage score reflects actual graph completeness
- Loop terminates after 3 iterations or score >= 85

---

## Complete File Inventory

### New Files to Create
```
src/
  contexts/
    WorkspaceContext.tsx                    # Global workspace state
  components/
    workspace/
      KnowledgeGraphPanel.tsx              # Cytoscape graph canvas
      TimelineView.tsx                      # Timeline view variant
      DendrogramView.tsx                    # Dendrogram modal overlay
      IntermediateReportPanel.tsx           # AI synthesis display
      QuerySidebar.tsx                      # Left sidebar for queries
      ResearchProgressOverlay.tsx           # Progress log during research loop
      EntityDetailDrawer.tsx                # Node detail slide-in drawer
  pages/
    WorkspaceView.tsx                       # Main three-panel workspace
    DossierGenerationPage.tsx               # Full report generation
    ProteinProfilePage.tsx                  # Standalone protein deep-dive
    settings/
      SettingsDataSources.tsx               # Data source status & API keys
      SettingsGraphPreferences.tsx          # Graph display preferences
      SettingsExportPreferences.tsx         # Export format defaults
  lib/
    research/
      autonomousLoop.ts                     # Research loop orchestrator
      completenessAgent.ts                  # Coverage score calculator
      synthesisAgent.ts                     # Report generation
    mcp/
      tools/
        OpenTargetsAssociationTool.ts
        StringProteinInteractionTool.ts
        PubMedLiteratureTool.ts
        EuropePMCTool.ts
        PatentsViewTool.ts
        OpenFDASafetyTool.ts
        ClinicalTrialsTool.ts
    storage/
      workspaceDB.ts                        # IndexedDB wrapper
```

### Files to Modify
```
src/
  App.tsx                                   # Update routes
  components/
    layout/
      LeftSidebar.tsx                       # Remove unused nav items
      TopBar.tsx                            # Add workspace breadcrumbs
      RightChatPanel.tsx                    # Update context messages
      SettingsSidebar.tsx                   # Update settings nav
  pages/
    WorkspacesPage.tsx                      # Wire up creation & navigation
    settings/
      SettingsMcpServers.tsx                # Ensure matches spec
```

### Files to Delete
```
src/
  pages/
    Index.tsx                               # Unused (redirects to /workspaces)
    TopicsPage.tsx
    PeoplePage.tsx
    CompaniesPage.tsx
    AutomationsPage.tsx
```

---

## Dependencies to Add

```bash
# Knowledge graph visualization
npm install cytoscape @types/cytoscape

# IndexedDB wrapper (optional, for cleaner DB access)
npm install dexie
```

All other dependencies (react-resizable-panels, recharts, radix-ui components) are already installed ✅

---

## Testing Strategy for 7-Day MVP

1. **Manual Testing Only** — No time for automated tests in 7 days
2. **Test Scenarios:**
   - Create a workspace → verify it appears in list
   - Submit a query → verify progress log appears
   - View graph → verify nodes render
   - Click node → verify detail drawer opens
   - Toggle persona mode → verify graph visual weighting changes
   - Toggle India Lens → verify India nodes are highlighted
   - Generate dossier → verify preview renders
   - Export report → verify file downloads
3. **Demo Data:** Hardcoded 3 example workspaces with pre-populated graphs for instant demo readiness

---

## Risk Mitigation

### Risks
1. **Cytoscape.js learning curve** — Mitigation: Start with a minimal graph, add features incrementally
2. **AI synthesis quality** — Mitigation: Use hardcoded template-based synthesis for MVP, upgrade to GPT-4 post-MVP
3. **MCP tool API rate limits** — Mitigation: Cache all API responses in IndexedDB; add rate-limit warnings in UI
4. **IndexedDB complexity** — Mitigation: Use Dexie.js for simpler API; start with localStorage for settings
5. **Report generation takes too long** — Mitigation: Show progress log; allow cancellation; cap iteration count at 3

### Critical Path
The absolute minimum for a working demo:
1. Workspace creation (Phase 2)
2. Three-panel layout (Phase 3)
3. Graph canvas with hardcoded nodes (Phase 4)
4. Report panel with hardcoded synthesis (Phase 5)
5. Query sidebar with hardcoded suggestions (Phase 6)

Everything else (MCP tools, autonomous loop, protein profile, dossier generation) can be simulated or deferred.

---

## Success Metrics for MVP Demo

1. **Functional:**
   - User can create a workspace
   - User can submit a query and see progress
   - Graph renders with at least 20 nodes
   - Report displays with citations
   - User can export report as Markdown
   - Settings pages are navigable

2. **Visual:**
   - Matches modem.dev design language exactly
   - Dark theme, compact spacing, table-based layouts
   - No jarring visual inconsistencies
   - Animations are smooth (fade-ins, drawer slides)

3. **Demo-Ready:**
   - 3 pre-populated example workspaces
   - 1 "live" query that simulates the research loop in 30 seconds
   - 1 pre-generated dossier PDF that downloads instantly

---

## Next Steps

1. **Review this plan** — Confirm all screens and phases align with your vision
2. **Prioritize phases** — Which phases MUST be done for the demo?
3. **Start Phase 1** — Shell & navigation cleanup (smallest, fastest win)
4. **Build incrementally** — Each phase should result in a visible, testable feature

Would you like me to start implementing Phase 1, or would you prefer to adjust the plan first?
