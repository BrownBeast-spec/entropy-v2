# Entropy v2 — Persistent Research Workspace with Living Knowledge Graph

**Status Update (2026-04-05):** The autonomous research loop described in this PRD has been replaced with a manual search-and-select workflow. See `docs/superpowers/specs/2026-04-05-manual-search-select-ux-design.md` for current implementation.

**Type:** Feature Epic  
**Status:** Build-Ready — Hackathon MVP  
**Event:** AMD Slingshot Hackathon 2026, Pune (April 7–8, 2026)  
**Sprint:** 7 days (April 1–7, 2026)  
**Labels:** `epic`, `hackathon-mvp`, `knowledge-graph`, `workspace`, `india-lens`, `pharma-strategist`

---

## Problem Statement

Indian pharmaceutical teams — spanning translational researchers, computational biologists, portfolio strategists, and BD&L leads — face a compound problem that no existing tool solves end-to-end.

**Fragmented data access.** A researcher establishing a repurposing hypothesis must manually query Open Targets for disease-target associations, STRING DB for interaction networks, PubMed for supporting literature, OpenFDA for safety signals, and ClinicalTrials.gov for trial precedent. Each query is ephemeral. No tool accumulates this evidence into a shared, persistent canvas.

**No persistent, growing evidence base.** Every research session starts from scratch. When a colleague asks a follow-up question — "what are the patent implications?" or "is there a formulation precedent in India?" — the researcher has no living record to build from. All accumulated knowledge lives in browser tabs and personal notes.

**Science and strategy are disconnected.** The mechanistic insights a researcher builds about a target and the competitive patent landscape a strategist assembles about the same molecule are stored in completely separate tools, never cross-referenced. For Indian pharma — where drug repurposing and generic formulation strategy are the dominant commercial workflows, not de-novo discovery — this disconnection is especially damaging because the biological and commercial decisions are made simultaneously, not sequentially.

**No India-specific intelligence layer.** Existing platforms (Open Targets, Causaly, Elsevier BioRAMPTM) are designed for Western drug discovery. They surface no data about CDSCO approvals, NPPA price caps, Indian clinical trial sponsorship, or Indian patent assignees — the exact signals Indian pharma teams need to make go/no-go decisions.

---

## Solution

Entropy v2 is a **persistent pharmaceutical research workspace** where a unified knowledge graph grows incrementally as researchers and strategists add queries. Rather than treating each search as an isolated event, Entropy accumulates evidence from 12+ public APIs into a shared, provenance-tracked graph that persists across sessions. Every node in the graph carries a source, a timestamp, and the query that added it.

The platform has two persona modes — **Researcher Mode** and **Strategist Mode** — that operate on the same underlying knowledge graph but foreground different node types and generate different report structures. A researcher building a mechanistic hypothesis for metformin repurposing in NASH and a strategist mapping the Indian patent landscape for the same molecule are both working from, and contributing to, the same canvas.

The **India Lens** layer surfaces India-specific signals on top of global data: Indian patent assignees via PatentsView, CDSCO-approved drugs via static CSV, NPPA price cap data via static CSV, and Indian-sponsored clinical trials via ClinicalTrials.gov — giving Indian pharma teams contextualised intelligence that no existing platform provides.

The **autonomous research loop** (the existing Mastra multi-agent workflow, retained in full) runs under the hood each time a new query is added. It checks the existing graph for coverage, fetches only the missing evidence from MCP data sources, merges new nodes and edges with full provenance, and terminates when a completeness threshold is met or a hard iteration cap is reached. The result surfaces in both a visual Cytoscape.js knowledge graph and a continuously updated intermediate synthesis report — a living draft that can be exported as a full research dossier at any point.

---

## User Stories

### Workspace Creation and Navigation

1. As a researcher, I want to create a named workspace for a specific research project, so that I can organise my findings by compound or disease without mixing unrelated work.
2. As a researcher, I want to add an optional description to a workspace, so that I can communicate the research context to a colleague who opens it later.
3. As a user, I want to set a default persona mode (Researcher or Strategist) when creating a workspace, so that the query prompts and graph view are contextualised from my first query.
4. As a returning user, I want to see all my recent workspaces on the home screen ranked by last-updated date, so that I can resume work without searching.
5. As a user, I want each workspace card on the home screen to show the number of graph nodes, the last query entered, and the date last updated, so that I can recognise the state of each workspace at a glance.
6. As a user, I want to rename a workspace at any time, so that I can reflect changes in project scope without losing accumulated data.
7. As a user, I want to duplicate a workspace, so that I can create a branch of an existing investigation without destroying the original.
8. As a user, I want to delete a workspace with a confirmation prompt, so that I can clean up completed projects without accidentally losing active ones.
9. As a user, I want to export an entire workspace as a JSON file, so that I can back it up or share it with a colleague who does not have access to my browser.
10. As a returning user, I want to be taken directly to the three-panel workspace view when I click on a workspace that already has graph data, so that I do not have to re-enter my query context.

### First Query and Autonomous Research Loop

11. As a researcher, I want to enter a free-text research question as my first workspace query, so that the autonomous agent can interpret my intent and decide which data sources to consult.
12. As a strategist, I want the query prompt to reflect my persona mode, so that I am prompted for competitive intelligence questions rather than biological research questions.
13. As a user, I want to see three AI-suggested example queries tailored to my persona and workspace name before I submit my first query, so that I have a starting point if I am unsure how to frame my question.
14. As a user, I want the India Lens toggle to be available before I submit my first query, so that India-specific data prioritisation is applied from the very first augmentation cycle.
15. As a user, I want to see a live progress log during the autonomous research loop that shows which MCP tool is running, how many nodes it has added, and the current coverage score, so that I understand what the system is doing and trust that it is not stuck.
16. As a user, I want the autonomous research loop to show the current iteration number out of the maximum (e.g. "Iteration 2 of 3"), so that I know the maximum wait time before the loop terminates.
17. As a user, I want the research loop to terminate automatically when the knowledge graph achieves a coverage score of 85 or above, so that the system does not over-fetch data for queries that are already well-covered.
18. As a user, I want the research loop to terminate after a maximum of three iterations regardless of coverage score, so that the system never hangs in a live demo or production session.
19. As a user, I want to cancel the research loop at any time and view the partial graph accumulated so far, so that I can keep working if I decide the existing data is sufficient.
20. As a user, I want the progress log to clearly indicate when a specific MCP data source fails mid-loop (e.g. "STRING DB unavailable — skipping protein interaction data") rather than aborting the entire loop, so that I receive the best available partial result.
21. As a user, I want nodes contributed by a failed data source to be flagged as incomplete in the graph with a visual indicator, so that I know where the graph has gaps and can retry those sources later.

### Knowledge Graph — Core Behaviour

22. As a researcher, I want every node added to the knowledge graph to carry provenance metadata including the data source, the query that triggered it, and the timestamp it was fetched, so that I can verify any claim in the graph against its primary source.
23. As a user, I want the knowledge graph to be cumulative — each new query adds to the existing graph rather than replacing it — so that the workspace builds a progressively richer evidence base over time.
24. As a user, I want the graph to deduplicate nodes automatically when the same entity (same UniProt accession, same patent ID, same NCT ID) is returned by multiple queries, so that the graph does not contain redundant duplicate nodes.
25. As a user, I want deduplicated nodes to merge their provenance records, so that I can see all the queries and sources that contributed evidence for a given entity.
26. As a user, I want the knowledge graph to persist across browser sessions using IndexedDB, so that I do not lose accumulated evidence when I close the browser.
27. As a user, I want to see the total node count, edge count, and source breakdown in a provenance panel below the graph canvas, so that I have a transparent audit of what the graph contains.
28. As a user, I want the provenance panel to show when the graph was last updated relative to the current time, so that I can assess whether the data is fresh enough for my purpose.

### Knowledge Graph — Visual Canvas (Cytoscape.js)

29. As a researcher, I want to see the knowledge graph rendered as an interactive force-directed graph with nodes representing biological and chemical entities and edges representing relationships between them, so that I can explore the connected evidence visually.
30. As a user, I want node shape to encode entity type (circles for biological entities, rectangles for compounds and drugs, diamonds for patents, hexagons for clinical trials, squares for companies), so that I can identify entity categories without reading every label.
31. As a user, I want node colour to encode the data source that contributed the node, with a colour legend always visible, so that I can distinguish Open Targets evidence from STRING evidence from PatentsView evidence at a glance.
32. As a user, I want node size to encode evidence strength (association score, interaction confidence, or citation count depending on entity type), so that the most strongly evidenced entities are visually prominent.
33. As a user, I want edge thickness to encode confidence or association score, so that strong relationships are visually distinguishable from weak ones.
34. As a user, I want edge colour to encode relationship type (co-expression, direct binding, patent ownership, trial sponsorship, etc.), so that the nature of each connection is scannable without clicking.
35. As a user, I want to hover over any node to see a tooltip showing entity name, type, source, key metadata, and which query originally added it to the graph, so that I can get essential context without clicking into the full detail drawer.
36. As a user, I want to click any node to open a detail drawer with the full entity record, so that I can read complete information without navigating away from the workspace.
37. As a user, I want to hover over any edge to see a tooltip showing relationship type, confidence score, source database, and evidence types (e.g. co-expression, text-mining, binding assay), so that I can assess the quality of each connection.
38. As a user, I want to click any edge to open an edge detail drawer listing the full experimental evidence supporting that interaction, so that I can trace a claim back to the underlying data.
39. As a user, I want to pan, zoom, and drag the graph freely, so that I can explore dense regions and sparse peripheries of large graphs.
40. As a user, I want a node search box in the graph toolbar that centres and highlights a specific entity when I type its name or identifier, so that I can navigate large graphs without manually hunting for a node.
41. As a user, I want to change the graph layout algorithm (force-directed, hierarchical, circular) from a toolbar control, so that I can find the spatial arrangement that best reveals the structure I am looking for.
42. As a user, I want a "fit to screen" button that resets the viewport to show all nodes, so that I can recover from deep zooming without manually zooming out.
43. As a user, I want to right-click any node to access a context menu with actions: pin to saved items, remove from graph, find all connections, and run a targeted follow-up query about this entity.
44. As a user, I want to export the current graph view as a PNG or SVG file, so that I can include it in a presentation or publication.

### Knowledge Graph — Researcher Mode and Strategist Mode

45. As a researcher, I want patent and company nodes to be visually de-emphasised (smaller, more transparent) by default in Researcher Mode, so that the biological machinery is the dominant visual layer and I am not distracted by commercial data.
46. As a strategist, I want protein interaction sub-graphs to be visually compressed and patent/trial/company nodes to be rendered at full visual weight in Strategist Mode, so that the competitive landscape is the dominant visual layer.
47. As a user, I want to toggle between Researcher Mode and Strategist Mode from the persona toggle pill in the top navigation, so that I can switch perspectives without reloading the workspace.
48. As a user, I want persona mode to affect only the visual weighting and query prompt templates, never the underlying graph data, so that switching modes never causes data loss.
49. As a user, I want the persona mode to be persisted per workspace so that each workspace opens in the mode I last used for it.

### Knowledge Graph — India Lens

50. As a user, I want to toggle the India Lens on or off from the workspace toolbar at any time, so that I can switch between a global view and an India-contextualised view without reloading.
51. As a user, I want Indian patent assignees (Indian companies identified by string matching on PatentsView assignee field) to receive a distinct visual badge on their nodes when India Lens is active, so that I can immediately see the Indian IP footprint in the competitive landscape.
52. As a user, I want drugs present in the CDSCO approved drug list (loaded from a static CSV) to have a CDSCO approval badge on their nodes when India Lens is active, so that I can quickly see which compounds have an existing Indian regulatory path.
53. As a user, I want drugs subject to NPPA price caps (loaded from a static NPPA CSV) to display their price cap value in their node tooltip when India Lens is active, so that I can assess formulation commercial viability without leaving the workspace.
54. As a user, I want clinical trials with Indian sponsors (identified by ClinicalTrials.gov sponsor country field) to have an India indicator badge on their nodes when India Lens is active, so that I can see the local clinical precedent for a compound.
55. As a user, I want the India Lens toggle to apply retroactively to all nodes already in the graph, not just nodes fetched after it is turned on, so that I do not need to re-run queries to see India-specific annotations.
56. As a user, I want the India Lens state to be saved per workspace, so that it is restored to my last setting when I re-open the workspace.

### Knowledge Graph — View Variants

57. As a user, I want to switch to a Timeline view variant from the graph toolbar, so that I can see all time-stamped nodes (patent filings, trial starts, publications, approvals) plotted chronologically on a horizontal axis.
58. As a user, I want the Timeline view to show events colour-coded by type (patent, trial, publication, approval), so that I can distinguish the categories at a glance.
59. As a user, I want to hover over any event in the Timeline view to see a tooltip with the entity name, date, source, and key metadata.
60. As a user, I want to click any event in the Timeline view to open the same detail drawer as clicking the node in the Graph view, so that the interaction model is consistent across view variants.
61. As a user, I want to switch back to the Graph view from the Timeline view with a single click, without losing my pan/zoom position in the graph.
62. As a user, I want to open a Dendrogram overlay from the graph toolbar that shows a read-only hierarchical tree of disease-to-target associations from Open Targets for the primary disease in the current graph, so that I can see the biological hierarchy at a glance without switching screens.
63. As a user, I want to export the Dendrogram overlay as a PNG directly from the overlay panel, so that I can include it in a research presentation.
64. As a user, I want to close the Dendrogram overlay and return to the main graph view with a single click.

### Left Panel — Research Query Sidebar

65. As a user, I want to add new queries to the workspace from the left panel's "Add to graph" input without navigating away from the three-panel view, so that my workflow is never interrupted.
66. As a user, I want new queries entered from the left panel to trigger the autonomous research loop inline (showing a compact progress indicator in the left panel, not a full-screen overlay), so that I can continue reading the existing graph and report while augmentation runs.
67. As a user, I want to see three AI-generated follow-up question suggestions in the left panel after each query completes, based on the current state of the graph, so that I always have an intelligent next step without having to think of one myself.
68. As a user, I want follow-up suggestions to reflect my current persona mode and India Lens state, so that a researcher sees mechanistic follow-ups and a strategist sees competitive follow-ups.
69. As a user, I want to click a suggested follow-up question to pre-populate the input and submit it immediately, so that adding contextually relevant queries is a one-click action.
70. As a user, I want to see a query history list in the left panel showing all queries that have been added to this workspace, with each query annotated by the number of nodes it contributed and the date it ran, so that I have a clear audit trail of how the graph was built.
71. As a user, I want to click any query in the history list to highlight the nodes it contributed in the graph canvas, so that I can visually trace what each query added to the overall picture.
72. As a user, I want a saved items section at the bottom of the left panel showing items I have explicitly pinned from the graph, so that I have quick access to key evidence without hunting through the full graph.
73. As a user, I want to collapse the entire left panel into a narrow icon rail, so that I can maximise the graph and report area when working on a small screen.

### Right-Bottom Panel — Intermediate Report

74. As a researcher, I want the intermediate report to automatically generate after the first query's research loop completes, so that I have a synthesis to read immediately without triggering a separate action.
75. As a researcher, I want the intermediate report in Researcher Mode to contain the following sections: Overview, Key Targets and Evidence, Molecular Context, Safety Signals, and Open Questions, so that the structure maps to my natural research workflow.
76. As a strategist, I want the intermediate report in Strategist Mode to contain the following sections: Competitive Landscape Overview, Dominant Players and Patent Position, Patent Expiry Timeline and Market-Entry Windows, Trial Activity Summary, and White Space Opportunities, so that the structure maps to my natural strategic workflow.
77. As a user, I want every factual claim in the intermediate report to be followed by an inline citation badge showing the source (e.g. "Open Targets", "PatentsView: US10234567"), so that I can verify any claim without having to cross-reference separately.
78. As a user, I want clicking a citation badge in the report to highlight the corresponding node in the graph canvas, so that I can immediately see the evidence behind any claim in its network context.
79. As a user, I want to edit any paragraph of the intermediate report directly, so that I can correct AI-generated errors, add my own interpretation, or restructure the narrative.
80. As a user, I want edited paragraphs to retain their citation badges after editing, so that provenance is not lost when I refine the AI's language.
81. As a user, I want the report to show a staleness indicator when new nodes have been added to the graph since the last synthesis (e.g. "14 new nodes added since this report was generated — regenerate?"), so that I always know whether the report reflects the current graph state.
82. As a user, I want to click "Regenerate synthesis" to produce an updated report based on the current graph, so that the report stays in sync with an evolving graph without manual rewriting.
83. As a user, I want to export the intermediate report as Markdown, PDF, or JSON from the report panel toolbar, so that I can share a snapshot of my current findings without generating a full dossier.
84. As a user, I want to collapse the intermediate report panel to a thin strip, so that I can maximise the graph canvas when I am in exploration mode.

### Detail Drawers

85. As a user, I want clicking a gene or protein node to open a detail drawer showing the UniProt accession, protein function summary, a simplified feature track summary, associated diseases, known drugs, pathway memberships, and links to UniProt, Ensembl, and NCBI Gene, so that I have the full protein context without leaving the workspace.
86. As a user, I want a "Open full protein profile" button in the protein detail drawer that navigates to the standalone Protein Profile screen, so that I can access the interactive UniProt Feature Viewer when I need it.
87. As a user, I want clicking a disease node to open a detail drawer showing the disease name, EFO ID, a ranked list of targets associated with this disease that are already in the current graph, and a link to Open Targets, so that I can understand how the disease is represented in my workspace.
88. As a user, I want clicking a drug or compound node to open a detail drawer showing the compound name, PubChem CID, known targets, clinical status, ChEMBL bioactivity summary, and a link to PubChem.
89. As a user, I want clicking a patent node to open a detail drawer showing the patent ID, title, assignee, filing date, expiry date from FDA Orange Book if available, abstract snippet, and links to Google Patents and PatentsView. When India Lens is on and the assignee is an Indian company, I want a highlighted India badge in the drawer header.
90. As a user, I want clicking a clinical trial node to open a detail drawer showing NCT ID, title, sponsor, phase, status, primary endpoint, and a link to ClinicalTrials.gov. When India Lens is on and the sponsor is Indian, I want an India badge shown.
91. As a user, I want clicking a literature node to open a detail drawer showing title, authors, journal, date, full abstract, MeSH terms, an AI-generated 2–3 sentence summary with citations, and links to PubMed and Europe PMC.
92. As a user, I want all detail drawers to have a "Pin to saved items" button and a "Remove from graph" button, so that I can curate the graph without hunting through menus.
93. As a user, I want detail drawers to slide in from the right edge of the screen without replacing the three-panel layout, so that I can compare the drawer content against the graph and report simultaneously.

### Strategist Mode — Full Report View

94. As a strategist, I want to access a dedicated Strategist Report view that presents competitive intelligence findings in a structured, printable format, so that I can share findings with BD&L leadership without the full workspace interface.
95. As a strategist, I want the Strategist Report to open the Pharma Strategist query interface when no report has been generated yet for this workspace, so that I have a clear starting point for my competitive query.
96. As a strategist, I want the query interface to offer suggested query categories as clickable chips — Dominant company analysis, Patent expiry landscape, Trial activity benchmarking, White space identification — so that I have a structured starting point for my competitive question.
97. As a strategist, I want the query interface to show a data limitations disclosure before I submit ("Market dominance is inferred from patent volume, trial sponsorship, and publication affiliation — not revenue or sales data"), so that I frame my expectations correctly before seeing results.
98. As a strategist, I want the Strategist Report to include a Dominant Companies table with columns for company name, patent count, earliest patent date, latest patent expiry date, active trial count, and publication count, all sortable by any column, so that I can rank competitors by the dimensions most relevant to my decision.
99. As a strategist, I want to click any company name in the Dominant Companies table to run a company-specific follow-up Strategist query, so that I can drill into any single competitor without leaving the report view.
100. As a strategist, I want the Strategist Report to include an interactive timeline chart showing patents filed, trials initiated, and FDA approvals over time for the queried topic, so that I can understand the chronological development of the competitive landscape.
101. As a strategist, I want to hover over any event on the timeline chart to see a tooltip with the event type, date, source, and entity name, so that I can get detail without opening a separate view.
102. As a strategist, I want to click any timeline event to open the primary source in a new browser tab (PatentsView, ClinicalTrials.gov, PubMed), so that I can verify the claim against the original record.
103. As a strategist, I want the Strategist Report to include a Trial Activity section showing active and completed trials broken down by phase, sponsor, and status, with links to ClinicalTrials.gov for each trial, so that I can benchmark our clinical program against competitors.
104. As a strategist, I want the Strategist Report to include an AI Insights section of 2–3 paragraphs synthesising: which companies dominate and why, key patent cliff dates and market-entry implications, and identified white space opportunities, so that I have a narrative I can present to stakeholders.
105. As a strategist, I want every claim in the AI Insights narrative to include an inline citation formatted as [PatentsView: US12345678] or [NCT02345678] that I can click to open the source, so that I can defend any claim in a stakeholder meeting.
106. As a strategist, I want the Strategist Report to include a White Space panel listing specific opportunities (disease-MoA-patient segment combinations where patent coverage is sparse or expiring and trial activity is low), each annotated with the data that supports the opportunity claim, so that I can prioritise investment discussions.
107. As a strategist, I want to save the entire Strategist Report to the current workspace, so that I can return to it in a future session or share it with a colleague.
108. As a strategist, I want to export the Strategist Report as Markdown, PDF, or JSON, so that I can distribute findings to stakeholders in their preferred format.
109. As a strategist, I want to see a query history of previously generated Strategist reports in the current workspace, so that I can compare analyses over time or reopen an older report without re-running the query.

### Full Dossier Generation

110. As a user, I want a "Generate full dossier" button in the intermediate report toolbar that triggers a comprehensive document generation based on the entire current knowledge graph, so that I can produce a publication-quality research summary when my investigation is complete.
111. As a user, I want to choose the dossier format before generation begins: Full Research Dossier, Executive Summary, India Regulatory Briefing, or Competitive Intelligence Report, so that the output structure matches my intended audience.
112. As a researcher, I want the India Regulatory Briefing format to organise the dossier into sections that map to typical CDSCO/DCGI submission requirements, so that the output is directly useful for regulatory preparation without reformatting.
113. As a user, I want to see a live generation log during dossier creation that shows each synthesis step as it completes, so that I know the system is progressing and have a realistic time estimate.
114. As a user, I want the dossier generation screen to show an estimated generation time based on graph size before I confirm, so that I can decide whether to proceed immediately or schedule it.
115. As a user, I want to preview the generated dossier in a paginated view before downloading, so that I can verify the output before sharing it.
116. As a user, I want to download the generated dossier as PDF or Markdown, so that I have a portable document I can share externally.
117. As a user, I want the dossier generation to fail gracefully — showing which sections were successfully generated and which failed — rather than returning a blank error, so that I can download the partial output and retry only the failed sections.

### Standalone Protein Profile (UniProt Feature Viewer)

118. As a researcher, I want to open a standalone full-screen Protein Profile for any protein node from the detail drawer, so that I can access the complete interactive UniProt Feature Viewer experience.
119. As a structural biologist, I want the Protein Profile to show a zoomable, pannable sequence track with layered annotation tracks for: domains (Pfam/SMART), active sites, post-translational modifications, and disease variants (ClinVar/UniProt), so that I can identify functionally important regions at a glance.
120. As a researcher, I want to hover over any feature on the track to see a tooltip with residue number(s), annotation label, data source, and a link to the source database entry, so that I can get full annotation detail without navigating away.
121. As a drug designer, I want the Protein Profile to show a Known Drugs panel listing ChEMBL compounds with activity against this protein, with bioactivity type, IC50 or Kd value, and clinical status, so that I can assess druggability in context.
122. As a user, I want an "Add to workspace graph" button in the Protein Profile header that adds this protein and its associated evidence to the current workspace's knowledge graph with full provenance, so that findings from deep protein exploration are brought back into the workspace.
123. As a user, I want a "Return to workspace" breadcrumb at the top of the Protein Profile when it was opened from a workspace context, so that I can navigate back without losing the workspace state.

### System and Settings

124. As a user, I want a Settings screen showing the current connection status of every integrated data source (live, cached-only, or unavailable), so that I can understand what data quality to expect before starting a session.
125. As a user, I want a "Force refresh" button per data source in Settings that clears the cache and re-fetches from the live API, so that I can get the most current data when I know I need it.
126. As a user, I want to set a maximum graph node cap (50–200 nodes) in Settings, so that I can balance graph richness against performance on my hardware.
127. As a user, I want to enter optional NCBI and OpenFDA API keys in Settings to increase rate limits for those services, with clear instructions on where to obtain the keys, so that I can improve data throughput in production use.
128. As a user, I want all Settings preferences to persist to IndexedDB alongside workspace data, so that my configuration survives browser refreshes.
129. As a user, I want the knowledge graph canvas to degrade gracefully when Cytoscape fails to render — showing a plain grouped list of node labels by entity type — rather than a blank screen, so that I can still read and act on the graph data even when the visual layer breaks.

---

## Implementation Decisions

### Architecture Overview

Entropy v2 is a client-side-first application built on the existing React 19 + Vite + TanStack Query + Zustand + Tailwind + shadcn/ui stack. The Mastra multi-agent autonomous workflow runs server-side (existing Hono API). New client-side modules are the workspace store, the KG augmenter agent interface, the completeness scoring layer, and the three-panel workspace UI.

### Module Breakdown

**1. WorkspaceStore (Zustand + idb-keyval)**

The central client-side state store for all workspace data. It manages workspace metadata, the knowledge graph (nodes, edges, provenance), query history, saved items, persona mode, India Lens state, and Settings preferences.

Key interface methods: `createWorkspace`, `deleteWorkspace`, `renameWorkspace`, `duplicateWorkspace`, `setActiveWorkspace`, `augmentGraph(workspaceId, query)`, `mergeNodes(newNodes)`, `mergeEdges(newEdges)`, `getGraphSnapshot(workspaceId)`, `pinItem(nodeId)`, `removeNode(nodeId)`, `exportWorkspaceJSON(workspaceId)`.

Storage backend: idb-keyval (IndexedDB) via Zustand's persist middleware. This replaces the localStorage backend from the existing workspace store. Key: `entropy-workspace-v2`. Handles graphs of up to ~200 nodes and full provenance payloads without hitting the 5MB localStorage limit.

Node schema (TypeScript interface):
- `id`: stable unique identifier (UniProt accession, patent ID, NCT ID, DOI, etc.)
- `type`: enum of entity types (disease, target, protein, drug, compound, patent, trial, company, paper, safety-signal)
- `label`: display name
- `data`: full payload from MCP tool response
- `provenance`: array of `{ source, query, timestamp, rawResponseHash }` objects
- `indiaContext`: optional object with `{ isCDSCO, isNPPA, isIndianPatent, isIndianSponsor, nppaPrice }`

Edge schema:
- `id`, `source` (node id), `target` (node id), `type` (relationship type enum), `confidence`, `evidenceTypes`, `provenance`

**2. KGAugmenterAgent (client → server interface)**

Wraps the existing Mastra autonomous workflow to support incremental graph augmentation rather than full-rebuild queries. The client sends: `{ workspaceId, query, existingGraphSnapshot, personaMode, indiaLens }`. The server returns: `{ newNodes, newEdges, completenessScore, iterationsRun, failedSources }`.

The server-side augmenter: (a) calls the CompletenessAgent to score the current graph against the query, (b) if score < 85, runs a minimal targeted MCP batch fetching only the entity types missing for the query, (c) repeats up to 3 iterations, (d) returns the delta (new nodes/edges only, not the full graph).

This keeps the existing autonomous workflow intact. The augmenter is a new routing layer on top of it, not a replacement.

**3. CompletenessAgent (Mastra sub-agent)**

A lightweight Mastra agent that takes a query string and a serialised graph snapshot (nodes + edges summary, not full payloads) and returns `{ score: 0–100, missingNodes: string[], missingEdges: string[] }`. Score ≥ 85 triggers early loop termination. If the LLM call fails, the fallback is a deterministic rule: "if graph has ≥ 8 high-confidence nodes relevant to the query entity type, return score 90." This ensures the loop always terminates even under API failure.

**4. FollowUpSuggestionAgent (Mastra sub-agent)**

After each augmentation cycle completes, a lightweight Mastra agent reads the current graph snapshot and the persona mode and returns three follow-up query suggestions as plain strings. These are displayed in the left panel. Cached for 10 minutes per graph state hash.

**5. KnowledgeGraphCanvas (React component, Cytoscape.js)**

Wraps `react-cytoscapejs`. Receives the full graph from the WorkspaceStore. Visual encoding (node size, shape, colour, edge thickness) is computed as a pure derivation from node/edge data — not stored separately. Persona mode and India Lens state are passed as props that trigger style recalculation, never data mutation. Layout algorithm is a local component state (does not persist).

Exports: `fitToScreen()`, `highlightNodes(ids)`, `highlightEdges(ids)`, `exportAsPNG()`, `exportAsSVG()`.

**6. ThreePanelLayout (React component, react-resizable-panels)**

The outer shell of the Workspace View. Wraps `react-resizable-panels` with a horizontal `PanelGroup` (left sidebar + right area) and a vertical `PanelGroup` inside the right area (graph canvas + report). Persists panel size ratios to the WorkspaceStore per workspace.

**7. IntermediateReportEditor (React component)**

A TipTap-based rich-text editor. Receives AI-generated markdown from the synthesis endpoint and renders it as editable blocks. Citation badges are implemented as TipTap custom node extensions — they render as coloured chips and are non-deletable but moveable. The editor emits `onChange` events to the WorkspaceStore which persists the edited content.

**8. StrategistReportView (React component)**

A dedicated view for the full Strategist report output. Contains: Dominant Companies table (shadcn/ui DataTable with sorting), interactive Timeline chart (Recharts), Trial Activity section, AI Insights rich text with citation badges, and White Space panel. Receives data from the `/api/causaly/strategist` endpoint (existing, unchanged). Export handled by the same export utility used elsewhere.

**9. IndiaLensProcessor (utility module)**

Runs on the client after each graph augmentation. For each node in the graph, it checks against three static datasets loaded at app start: CDSCO approved drug CSV, NPPA price cap CSV, and an Indian company name list (derived from PatentsView assignees). It mutates the `indiaContext` field on matching nodes. PatentsView Indian assignee detection is a simple string match against known Indian company names and suffixes (Pvt Ltd, Ltd, Laboratories, Pharma, etc. with Indian city/state keywords). This is a best-effort heuristic, disclosed as such in the UI.

**10. DossierGenerationOverlay (React component)**

Full-screen overlay triggered from the report panel. Contains a format selector, a generation log, and a document preview panel. Calls `POST /api/causaly/dossier` with the full graph snapshot and selected format. Streams the generation log via server-sent events.

### API Contract Additions

`POST /api/causaly/augment`
- Request: `{ query, graphSnapshot: { nodeIds, edgeSummary }, personaMode, indiaLens, workspaceId }`
- Response: `{ newNodes[], newEdges[], completenessScore, iterationsRun, failedSources[] }`
- Caching: 1 hour per (query + graphSnapshot hash) pair

`POST /api/causaly/synthesise`
- Request: `{ graphSnapshot, personaMode, reportSections[] }`
- Response: `{ sections: [{ title, content, citations[] }] }`
- Caching: None (always reflects current graph)

`GET /api/causaly/suggestions`
- Request: `{ graphSnapshot, personaMode }` as query params
- Response: `{ suggestions: string[] }` (3 items)
- Caching: 10 minutes per graph state hash

`POST /api/causaly/dossier`
- Request: `{ graphSnapshot, format: 'full' | 'executive' | 'india-regulatory' | 'competitive' }`
- Response: Server-sent event stream with `{ step, nodesProcessed, content }` events
- Final event: `{ done: true, documentUrl: string }`

`POST /api/causaly/strategist` — existing endpoint, unchanged.

### India Lens Static Data

- CDSCO approved drug list: bundled as a static JSON at build time, sourced from public CDSCO database export. Structure: `[{ drugName, approvalDate, indication }]`
- NPPA price cap data: bundled as static JSON. Structure: `[{ drugName, formulation, priceCapINR, effectiveDate }]`
- Indian company name list: bundled as static JSON, curated manually from PatentsView top 500 pharma assignees filtered for Indian entities. Used for PatentsView India Lens matching.

### Schema Change: Workspace Store v2

The existing `entropy-workspaces` localStorage key is superseded by `entropy-workspace-v2` in IndexedDB. No migration is required for the hackathon (fresh start). A migration utility for post-hackathon production use is out of scope.

### Resizable Panel Defaults

Left panel: 22% default, 18% min, 35% max. Right-top (graph): 55% of right area by default, 40% min. Right-bottom (report): 45% of right area by default, 30% min. All defaults can be overridden by dragging. Panel sizes persisted per workspace in WorkspaceStore.

---

## Testing Decisions

### What makes a good test

A good test for Entropy v2 exercises externally observable behaviour — what the module returns or emits — not implementation details like internal state shape, private methods, or specific API call order. Tests should be written against module interfaces, not against line numbers or component internals.

A test is not useful if changing the implementation without changing the behaviour would break it.

### Modules to test and test types

**WorkspaceStore — unit tests**
- `createWorkspace` creates a workspace with correct defaults and a unique ID
- `augmentGraph` merges new nodes into the existing graph without duplicating nodes with the same ID
- `augmentGraph` merges provenance arrays when the same node ID is returned by two different queries
- `removeNode` removes the node and all edges that reference it
- `exportWorkspaceJSON` returns a valid JSON-serialisable object containing all workspace data
- `getGraphSnapshot` returns a summary representation (not full payloads) for serialisation to the completeness agent

**IndiaLensProcessor — unit tests**
- Correctly identifies an Indian assignee by name suffix matching (Pvt Ltd, Ltd with Indian keywords)
- Correctly matches a drug name against the CDSCO CSV regardless of case and spacing
- Correctly matches a drug name against the NPPA CSV and returns the price cap value
- Does not mutate nodes that do not match any India signal
- Is idempotent — running it twice on the same graph produces the same result

**CompletenessAgent prompt contract — integration tests**
- Given a graph with ≥ 8 high-confidence nodes relevant to the query entity type, the agent returns score ≥ 85
- Given an empty graph, the agent returns score < 40 and a non-empty `missingNodes` array
- The fallback deterministic rule fires when the LLM response is malformed and returns score 90 for a rich graph

**KGAugmenterAgent server endpoint — integration tests**
- `POST /api/causaly/augment` returns `newNodes` and `newEdges` arrays for a well-formed request
- `POST /api/causaly/augment` returns an empty delta when completeness score ≥ 85 on the first iteration
- `POST /api/causaly/augment` never exceeds 3 iterations regardless of completeness score
- `POST /api/causaly/augment` includes failed source names in `failedSources` when an MCP tool throws
- `POST /api/causaly/augment` returns partial results (not an error) when one of several MCP tools fails

**IntermediateReportEditor — unit tests**
- Citation badge nodes are rendered for each citation in the source markdown
- `onChange` fires with the updated content when the user edits a paragraph
- Citation badges are present in the emitted content after a paragraph edit

**StrategistReportView — integration tests**
- Dominant Companies table sorts correctly by each column
- Clicking a company name fires the correct follow-up query with the company name as the query string
- Export button produces a non-empty Markdown string for a populated report

**ThreePanelLayout — unit tests**
- Collapsing the left panel reduces its rendered width to the icon rail width
- Panel size ratios are preserved when the component re-renders with updated props
- The correct workspace ID is passed to each child panel

---

## Out of Scope

The following are explicitly excluded from the hackathon MVP and should not be built against this PRD:

- **Multi-user collaboration.** Workspaces are single-user and local to one browser. No real-time co-editing, no sharing links, no comment threads.
- **Authentication and user accounts.** There is no login, no user session, no backend user table. All data lives in the client's IndexedDB.
- **PostgreSQL or any server-side persistence.** The workspace store is entirely client-side. Post-hackathon migration to a backend database is a separate PRD.
- **AlphaFold 3D protein structure viewer.** AlphaFold DB integration is on the post-hackathon roadmap.
- **COSMIC mutation data.** Out of scope for this sprint.
- **Mobile responsive design.** The three-panel layout targets desktop (1280px+) only.
- **Multi-language query input (Hindi).** Post-hackathon roadmap item.
- **AMD ROCm / local LLM inference.** Future roadmap. The AMD tie-in for the demo is a positioning narrative, not a technical integration.
- **Workspace versioning.** No git-style history or checkpoint system.
- **Admin dashboard and analytics.**
- **PDF export for the intermediate report panel.** Markdown and JSON export are in scope. PDF export is in scope only for the full dossier.
- **WorkspaceStore v1 → v2 migration.** The new `entropy-workspace-v2` IndexedDB key is a clean start.
- **Full interactive UniProt Feature Viewer inside the detail drawer.** The drawer shows a simplified static feature summary. The full interactive viewer is only available on the standalone Protein Profile screen.
- **CDSCO and NPPA live API integration.** Both are bundled as static JSON at build time for the hackathon. Live API integration is post-MVP.

---

## Further Notes

### Demo script priority order

The hackathon demo will run in this sequence: create a new workspace → enter a repurposing query ("Repurpose metformin for NASH in Indian population") → watch the live progress log → arrive at the three-panel view → toggle India Lens → show CDSCO badge on metformin node → click a node to open the detail drawer → show the intermediate report with citations → add one follow-up query from a suggestion chip → show graph expansion → switch to Strategist Mode → run a competitive query → show the Dominant Companies table and AI Insights. The full dossier generation is the finale. Every screen decision in this PRD is optimised to make this sequence feel smooth.

### Hardcoded fallback for demo reliability

If the Completeness Agent LLM call fails during the demo (network issue), the fallback deterministic rule (≥ 8 relevant nodes → exit loop) must be implemented and tested before the demo. This is non-negotiable.

### India Lens heuristic disclosure

The Indian company identification logic is a string-matching heuristic, not a curated verified list. The UI must display a one-line disclosure on the India Lens toggle tooltip: "India signals are inferred from public data using heuristic matching — verify before citing." This protects the product from being used to make consequential decisions based on mis-identified entities.

### Provenance as the trust differentiator

Every judge question about "how do you know this is real data?" should be answerable by pointing to the provenance panel at the bottom of the graph canvas. The provenance panel is the single most important trust signal in the product. It must always be visible and never hidden behind a click.

### Post-hackathon priorities (Week 1–2, April 15–28)

- PostgreSQL workspace persistence with lightweight magic-link auth
- WorkspaceStore v1 → v2 migration utility
- Live CDSCO and NPPA API integration
- Multi-language query support (Hindi via Google Translate preprocessing)
- AlphaFold structure viewer on Protein Profile screen
