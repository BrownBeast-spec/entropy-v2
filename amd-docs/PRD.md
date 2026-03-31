# Entropy Causaly-Style Biomedical Intelligence Platform

# Product Requirements Document (PRD) v4.0

**Event**: AMD Slingshot Hackathon 2026 - Pune Campus Days (April 7-8, 2026)  
**Status**: Build-Ready - Hackathon MVP  
**Created**: March 30, 2026  
**Owner**: Development Team  
**Epic Labels**: `causaly-ui-complete`, `hackathon-mvp`, `pharma-strategist`  
**Timeline**: 7 days (March 31 - April 6, 2026)  
**Demo Date**: April 7-8, 2026

---

## Problem Statement

Pharma researchers and translational scientists face fragmented biomedical data access:

1. **Scattered Data Sources**: Must manually query 10+ databases (PubMed, UniProt, Open Targets, ClinicalTrials.gov, USPTO patents, etc.) separately with no unified interface
2. **No Visual Intelligence**: Cannot visualize protein-protein interaction networks, disease-target associations, or patent timelines graphically
3. **No Workspace Persistence**: Every search is ephemeral - no way to save findings across sessions or organize research by project
4. **No Competitive Intelligence**: Portfolio strategists manually compile competitor patent landscapes, trial activities, and market dominance from disparate sources - taking days/weeks per analysis
5. **Citation Verification Burden**: AI tools hallucinate; researchers spend hours verifying claims against primary sources

**Current Entropy v2 limitations**:

- Backend-only research pipeline (CLI/API interfaces)
- Beautiful Causaly-inspired UI exists (`entropy_front/`) but uses only mock data
- No persistent workspaces or multi-project organization
- No competitor intelligence / patent analysis capabilities

---

## Solution

Transform Entropy into a **production-ready biomedical intelligence platform** with three core pillars:

### Pillar 1: Unified Multi-Source Search

Single search bar → aggregated real-time results from 12+ public APIs:

- Literature: PubMed, Europe PMC (preprints), Semantic Scholar
- Proteins: UniProt, Ensembl, NCBI Gene/Protein
- Compounds: PubChem, ChEMBL
- Clinical: ClinicalTrials.gov
- Patents: PatentsView (USPTO), FDA Orange Book
- Targets: Open Targets Platform
- Safety: OpenFDA FAERS

**Key Features**:

- Parallel API aggregation (<2s response time)
- Deduplication by DOI/Accession/NCT ID
- Grouped by result type with source badges
- AI-generated summaries for papers (via existing Mastra Librarian)
- Entity extraction & highlighting (genes, drugs, diseases)

### Pillar 2: Persistent Multi-Workspace Organization

- Create unlimited named workspaces ("Metformin Competition 2026", "NSCLC Target Pipeline")
- One-click save any search result (paper, protein, patent, trial) to workspace
- Full metadata preserved + direct link to original source
- Grid view with filters (by type, source, date)
- Export workspace as CSV/JSON

**Tech Implementation**:

- **MVP (Hackathon)**: Client-side Zustand store + localStorage (no backend dependency)
- **Post-MVP**: PostgreSQL tables (`workspaces`, `saved_items`) + lightweight auth

### Pillar 3: Pharma Strategist (Competitor Intelligence Copilot)

AI-powered analyst that answers strategic queries like:

- _"What companies dominate metformin distribution?"_
- _"When do key diabetes drug patents expire?"_
- _"Show me AstraZeneca's trial activity in NSCLC over the past 3 years"_

**Strategist Output**:

1. **Dominant Companies Table** - Patent count, earliest patent, latest expiry
2. **Visual Timeline** - Patents filed → trials started → FDA approvals
3. **AI-Synthesized Insights** - Market positioning, competitive gaps, opportunity windows
4. **Full Citations** - Every claim links to PatentsView, Orange Book, ClinicalTrials, PubMed
5. **Export** - Markdown/PDF report for stakeholders

**Data Sources** (all public/free):

- PatentsView API (USPTO patent assignments, filing dates)
- FDA Orange Book (drug-specific patent expiry, assignees)
- ClinicalTrials.gov (sponsor = company, phase, status)
- PubMed (publication volume by company affiliation)
- Open Targets (drug-disease associations by sponsor)

**AI Engine**: Existing Mastra Librarian Agent + new prompt templates (no new infra)

---

## User Stories

### Core Platform (Stories 1-75 from Original PRD - Unchanged)

**Discovery & Target Identification** (1-7)

1. As a translational researcher, I want to search for a disease by name, so that I can see all gene targets associated with it
2. As a target identification scientist, I want to see association scores for each target, so that I can prioritize which ones to investigate further
3. As a drug discovery team lead, I want to view targets in a hierarchical dendrogram, so that I can understand the biological relationships at a glance
4. As a computational biologist, I want to click on a gene target node, so that I can see detailed information about that protein
5. As a researcher, I want to hover over dendrogram connections, so that I can see the evidence types supporting each association
6. As a portfolio manager, I want to filter targets by minimum association score, so that I only see high-confidence candidates
7. As a bioinformatician, I want to export the target list as CSV, so that I can import it into my analysis pipeline

**Protein Interaction Networks** (8-18) 8. As a systems biologist, I want to visualize protein-protein interactions for a gene, so that I can understand its biological context 9. As a pathway researcher, I want to see interaction confidence scores on network edges, so that I can trust the relationships 10. As a network analyst, I want to zoom and pan the network graph, so that I can explore dense interaction clusters 11. As a researcher, I want to click on a protein node, so that I can see its UniProt details and related pathways 12. As a computational scientist, I want to filter interactions by confidence threshold, so that I can focus on high-quality data 13. As a pathway biologist, I want to overlay Reactome pathway annotations on the network, so that I can see which proteins belong to which pathways 14. As a drug target validator, I want to see which proteins in the network are druggable, so that I can assess therapeutic opportunities 15. As a team member, I want to export the network as PNG or SVG, so that I can include it in presentations 16. As a researcher, I want to click on an interaction edge, so that I can see the experimental evidence supporting it 17. As a bioinformatician, I want to expand the network by adding interaction partners, so that I can explore second-degree connections 18. As a systems biologist, I want to see protein complex annotations, so that I can identify functional modules

**Literature Discovery** (19-29) 19. As a literature reviewer, I want to search PubMed by disease and topic, so that I can find relevant research papers 20. As a busy scientist, I want to see AI-generated 2-3 sentence summaries of papers, so that I can quickly assess relevance without reading full abstracts 21. As a researcher, I want to see highlighted entities (genes, drugs, diseases) in paper summaries, so that I can quickly identify key concepts 22. As a literature analyst, I want to click on a paper card, so that I can read the full abstract in a slide-in panel 23. As a systematic reviewer, I want to see MeSH terms for each paper, so that I can understand the paper's classification 24. As a scientist, I want to click "View in PubMed" links, so that I can access the full text article 25. As a researcher, I want to filter papers by publication year, so that I can focus on recent findings 26. As a team lead, I want to filter by journal name, so that I can prioritize high-impact publications 27. As a researcher, I want to see author information, so that I can identify key opinion leaders in the field 28. As a literature reviewer, I want pagination controls, so that I can browse through hundreds of results efficiently 29. As a knowledge manager, I want to see preprints separately from peer-reviewed papers, so that I can assess evidence quality

**Drug Safety Assessment** (30-37) 30. As a safety scientist, I want to search for a drug by name, so that I can see its adverse event profile 31. As a pharmacovigilance analyst, I want to see organ systems color-coded by safety severity, so that I can quickly identify risk areas 32. As a toxicologist, I want to hover over organ diagrams, so that I can see the top 3 adverse events for that system 33. As a clinical development lead, I want to click on an organ, so that I can see a detailed table of all adverse events 34. As a regulatory affairs specialist, I want to see the data source and last update date, so that I can trust the information 35. As a safety reviewer, I want to see event frequency counts, so that I can assess the magnitude of risk 36. As a risk manager, I want to compare safety profiles across multiple drugs, so that I can make informed decisions 37. As a medical affairs director, I want to export safety data as a report, so that I can share with stakeholders

**Timeline & Historical Context** (38-43) 38. As a competitive intelligence analyst, I want to see a chronological timeline of clinical trials, so that I can understand the development history 39. As a portfolio strategist, I want to see publication dates on the timeline, so that I can identify when interest in a target emerged 40. As a regulatory analyst, I want to see FDA approval dates, so that I can understand the regulatory history 41. As a researcher, I want to filter timeline events by type (trial, paper, approval), so that I can focus on specific event categories 42. As a project manager, I want to zoom the timeline view, so that I can see decade, year, or month-level detail 43. As a scientist, I want to click on timeline event cards, so that I can see expanded details

**AI Copilot & Insights** (44-50) 44. As a researcher, I want to see an AI-generated overview of my current query, so that I can get a high-level summary 45. As a scientist, I want to see inline citations in AI text, so that I can verify claims 46. As a user, I want to click citations, so that I can open the source document 47. As a researcher, I want to see a mini dendrogram widget in the sidebar, so that I have quick reference while reading details 48. As a pathway biologist, I want to see top pathways for the current gene, so that I can understand its biological role 49. As a safety analyst, I want to see a safety summary widget, so that I can quickly assess risk 50. As a scientist, I want quick action buttons for "Generate Report" and "Export", so that I can save my findings efficiently

**Navigation & User Experience** (51-58) 51. As a user, I want a persistent top navigation bar, so that I can access key features from anywhere 52. As a researcher, I want to switch between Dendrogram, Network, Documents, Timeline, Grid, and Strategist views using tabs, so that I can explore data in different formats 53. As a user, I want smooth animations when loading visualizations, so that the interface feels polished and responsive 54. As a researcher, I want loading skeletons while data fetches, so that I understand the system is working 55. As a user, I want clear error messages when API calls fail, so that I know what went wrong 56. As a scientist, I want the sidebar to be collapsible, so that I can maximize screen space for visualizations 57. As a user, I want keyboard shortcuts for common actions, so that I can work more efficiently 58. As a researcher, I want a search bar always accessible, so that I can quickly pivot to new queries

**Performance & Reliability** (59-64) 59. As a user, I want pages to load in under 2 seconds, so that I don't waste time waiting 60. As a researcher, I want network graphs with 50+ nodes to render smoothly, so that I can explore complex interactions 61. As a user, I want the system to cache frequently accessed data, so that repeated queries are instant 62. As a scientist, I want the UI to remain responsive even when AI summarization is running, so that I can continue exploring 63. As a researcher, I want graceful degradation when external APIs are slow, so that I can still use other features 64. As a user, I want to see progress indicators for long-running operations, so that I know the system hasn't frozen

**Data Quality & Trust** (65-75) 65. As a scientist, I want to see data source labels on every piece of information, so that I can assess credibility 66. As a researcher, I want to see timestamps on cached data, so that I know if information is stale 67. As a quality analyst, I want entity extraction to be accurate (>80% precision), so that highlighted terms are relevant 68. As a user, I want AI-generated summaries to include citations, so that I can verify claims 69. As a researcher, I want association scores from Open Targets to match their official platform, so that I trust the data 70. As a scientist, I want STRING DB interaction scores to reflect actual confidence levels, so that I don't overinterpret weak evidence 71. As a bioinformatician, I want API rate limits to be handled gracefully with retry logic, so that my workflow isn't interrupted 72. As a researcher, I want stale cached data to be visually indicated, so that I know to refresh if needed 73. As a team lead, I want error logs accessible for debugging, so that I can report issues effectively 74. As a scientist, I want data provenance visible (which API, which query, when retrieved), so that I can reproduce results 75. As a user, I want the system to work offline with cached data when APIs are unavailable, so that I can continue working

### NEW: Unified Search (Stories 76-78)

76. **As a researcher**, I want to type "metformin" once in a single search bar, so that I see aggregated results from PubMed, Europe PMC (preprints), UniProt, PubChem, ClinicalTrials.gov, PatentsView, Open Targets, and OpenFDA simultaneously—**instead of manually querying 8+ databases separately**

77. **As a user**, I want results automatically grouped by type (Literature / Protein / Compound / Clinical Trial / Patent / Target / Safety) with clear source badges (e.g., "PubMed", "UniProt", "PatentsView"), so that I can quickly scan different data dimensions without confusion

78. **As a scientist**, I want to filter aggregated results by source, publication date, evidence strength, or result type using dropdown filters, so that I can focus on specific data subsets (e.g., "Show only patents filed after 2020" or "Only high-confidence Open Targets associations >0.7")

### NEW: Workspaces & Persistence (Stories 79-82)

79. **As a researcher**, I want to create multiple named workspaces (e.g., "Metformin Competition 2026", "NSCLC Target Pipeline", "Alzheimer's Drug Candidates"), so that I can organize findings by project without mixing unrelated research

80. **As a user**, I want to save any search result (paper, protein, patent, trial, target) to any workspace with one click on a "Save to Workspace" button, so that I can build curated collections without copy-pasting URLs manually

81. **As a team lead**, I want saved items to include full metadata (title, authors, journal, date, DOI/Accession/NCT ID/Patent ID) + direct link back to original source, so that I can share workspace exports with colleagues who can verify sources

82. **As a strategist**, I want to browse/explore everything saved in a workspace using a filterable grid view (filter by type, source, date added), so that I can quickly find specific items in large collections (100+ saved items)

### NEW: Pharma Strategist (Competitor Intelligence) (Stories 83-92)

83. **As a portfolio strategist**, I want to type natural-language queries like _"What companies dominate distribution of metformin?"_ or _"Show me AstraZeneca's trial activity in lung cancer"_, so that I get AI-generated competitor reports without manually compiling data from patents, trials, and publications

84. **As a competitive-intelligence analyst**, I want the Strategist report to include:

- **Dominant Companies Table** (company name, patent count, earliest patent date, latest expiry date)
- **Visual Timeline** (interactive chart showing patents filed → trials started → FDA approvals over time)
- **Trial Activity Summary** (number of trials by phase, recruitment status, key endpoints)
- **Publication Volume** (number of papers by company affiliation, trending topics)

...so that I can assess competitive landscape at a glance

85. **As a business-development lead**, I want to export the Strategist report as:

- **Markdown** (for internal wikis/Notion)
- **PDF** (for board presentations)
- **JSON** (for data pipelines)

...so that I can share findings with stakeholders in their preferred format

86. **As a researcher**, I want every claim in the Strategist report to include inline citations (e.g., _"Novo Nordisk holds 14 active patents for metformin formulations [PatentsView: US10234567, US10234568, ...]_"), so that I can verify AI-generated insights against primary sources

87. **As a regulatory affairs specialist**, I want the Strategist to highlight patent expiry dates from FDA Orange Book data, so that I can identify market-entry opportunities when exclusivity ends

88. **As a clinical development director**, I want the Strategist to show which companies are sponsoring trials in specific disease areas (e.g., _"Pfizer: 23 active trials in NSCLC, 12 in Phase 3"_), so that I can benchmark our trial portfolio against competitors

89. **As a portfolio manager**, I want the Strategist to identify "white space" opportunities (diseases with low trial activity or expiring patents), so that I can prioritize investment in underserved therapeutic areas

90. **As a scientist**, I want the Strategist timeline to be interactive (hover over events for details, click to open source in new tab), so that I can explore the data behind the synthesis

91. **As a team lead**, I want Strategist queries and reports to be saved in workspaces, so that I can revisit analyses months later or share with new team members

92. **As a user**, I want the Strategist to clearly indicate data limitations (e.g., _"Market share data unavailable—analysis based on public patent/trial signals only"_), so that I don't overinterpret findings

### NEW: UniProt Feature Viewer (Stories 93-96)

93. **As a structural biologist**, I want to click any protein in search results or network graphs to open a UniProt Feature Viewer, so that I can see protein domains, post-translational modifications (PTMs), and variants visualized on a sequence track

94. **As a researcher**, I want the Feature Viewer to show color-coded tracks:

- **Domains** (Pfam, SMART) - blue
- **Active Sites** - green
- **PTMs** (phosphorylation, ubiquitination) - purple
- **Disease Variants** (from ClinVar, UniProt) - red

...so that I can quickly identify functionally important regions

95. **As a drug designer**, I want to hover over Feature Viewer tracks to see tooltips with residue numbers and annotations (e.g., _"K48: Ubiquitination site, critical for protein degradation"_), so that I can assess druggability

96. **As a bioinformatician**, I want the Feature Viewer to support zoom and pan (D3-powered), so that I can inspect specific regions in detail for large proteins (>1000 amino acids)

---

## Implementation Decisions

### Architecture Overview

**Monorepo Structure** (pnpm workspace):

```
entropy-v2/
├── apps/
│   ├── api/              # Hono REST API (existing)
│   │   └── src/routes/
│   │       └── causaly.ts   # NEW: Unified search, workspaces, strategist endpoints
│   └── mastra-app/       # Mastra agents (existing)
├── packages/
│   ├── mcp-biology/      # Existing: Open Targets, UniProt, Ensembl, NCBI
│   ├── mcp-clinical/     # Existing: PubMed, ClinicalTrials.gov
│   ├── mcp-safety/       # Existing: OpenFDA, RxNav
│   ├── mcp-europepmc/    # NEW: Europe PMC (preprints, full-text)
│   ├── mcp-patents/      # NEW: PatentsView + Orange Book parser
│   ├── mcp-string/       # NEW: STRING DB (protein-protein interactions)
│   ├── mcp-pubchem/      # NEW: PubChem (chemical structures)
│   └── mcp-pathways/     # NEW: Reactome (biological pathways)
├── entropy_front/        # React 19 frontend (existing, needs connections)
│   ├── src/
│   │   ├── components/
│   │   │   ├── UnifiedSearch.tsx        # NEW
│   │   │   ├── WorkspaceSidebar.tsx     # NEW
│   │   │   ├── StrategistReport.tsx     # NEW
│   │   │   ├── UniProtFeatureViewer.tsx # NEW
│   │   │   ├── NetworkView.tsx          # MODIFY (connect to STRING)
│   │   │   ├── DendrogramView.tsx       # MODIFY (real data)
│   │   │   ├── DocumentsView.tsx        # MODIFY (real data)
│   │   │   └── SafetyVisualization.tsx  # MODIFY (real data)
│   │   ├── store/
│   │   │   └── workspaceStore.ts        # NEW (Zustand)
│   │   ├── lib/
│   │   │   ├── api.ts                   # NEW (typed API client)
│   │   │   └── queryClient.ts           # NEW (TanStack Query setup)
│   │   └── types/
│   │       └── causaly.ts               # NEW (shared interfaces)
└── amd-docs/             # NEW: Hackathon documentation
```

### Tech Stack Matrix

| Layer                         | Technology                       | Version      | Purpose                                                                 | Why Chosen                                                         | Trade-offs                                                                        |
| ----------------------------- | -------------------------------- | ------------ | ----------------------------------------------------------------------- | ------------------------------------------------------------------ | --------------------------------------------------------------------------------- |
| **Frontend Framework**        | React 19                         | 19.0         | All UI (search, tabs, workspace sidebar, strategist report)             | Concurrent rendering for smooth UX, server components future-ready | Learning curve for React 19 features; mitigated by using mostly React 18 patterns |
| **Build Tool**                | Vite                             | 8.x          | Dev server + production builds                                          | Fastest HMR, native ESM, optimized chunks                          | Requires Node 18+; already present                                                |
| **State Management (Server)** | TanStack Query v5                | 5.x          | Unified search, workspaces, strategist data fetching                    | Best-in-class caching, devtools, automatic retries                 | Overkill for simple GET; mitigated by excellent docs                              |
| **State Management (Client)** | Zustand                          | 4.x          | Workspace management (MVP: localStorage sync)                           | Minimal boilerplate, no providers, easy testing                    | No time-travel debugging; acceptable for MVP                                      |
| **Styling**                   | Tailwind CSS v3 + shadcn/ui      | 3.4 / latest | Consistent Causaly-inspired UI, workspace sidebar, strategist dashboard | Utility-first, accessible components from shadcn                   | Verbose class names; mitigated by editor autocomplete                             |
| **Network Visualization**     | Cytoscape.js + react-cytoscapejs | 3.x          | Protein-protein interaction graphs (STRING DB)                          | Industry standard for bio networks, rich layout algorithms         | Large bundle size (~500KB); mitigated by code splitting                           |
| **Data Visualization**        | D3 v7 (scales only) + Recharts   | 7.x / 2.x    | Feature Viewer (SVG tracks), Strategist timeline                        | D3 for custom SVG, Recharts for quick charts                       | D3 has steep learning curve; using only scales module                             |
| **Backend Framework**         | Hono.js                          | 4.x          | REST API gateway (causaly.ts routes)                                    | Fastest TypeScript web framework, edge-ready                       | Less mature than Express; mitigated by excellent docs                             |
| **API Schema Validation**     | Zod                              | 3.x          | All API request/response validation                                     | Type-safe runtime validation, infers TypeScript types              | Slightly verbose; acceptable for reliability                                      |
| **MCP Pattern**               | TypeScript + Zod                 | 5.7 / 3.x    | New MCPs: europepmc, patents, string, pubchem, pathways                 | Consistent with existing biology/clinical/safety MCPs              | None; proven pattern                                                              |
| **AI/LLM**                    | Mastra + Google Gemini           | existing     | Paper summaries + Strategist report generation                          | Already configured, zero new infra                                 | Gemini rate limits; mitigated by caching                                          |
| **Database (Post-MVP)**       | PostgreSQL 16                    | 16           | Workspaces, saved items, user sessions                                  | Already in docker-compose.yml, proven reliability                  | Overkill for MVP; using localStorage first                                        |
| **Package Manager**           | pnpm                             | 8.x          | Monorepo workspace management                                           | Faster than npm/yarn, strict dependencies                          | Requires pnpm installation; already present                                       |
| **Testing**                   | Vitest + React Testing Library   | 3.x / latest | Unit tests (>80% coverage target)                                       | Vite-native, fast, Jest-compatible                                 | Async test flakiness; mitigated by retry logic                                    |
| **Deployment (MVP)**          | Docker Compose (local)           | 3.8          | Demo on laptop                                                          | Simple, reproducible, no cloud costs                               | Not production-ready; acceptable for hackathon                                    |

### Data Flow Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         User (Browser)                           │
└────────────────────────────┬────────────────────────────────────┘
                             │ HTTP/S
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│                    entropy_front (React 19)                      │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ TanStack Query (Server State) + Zustand (Client State)  │  │
│  └────────────┬─────────────────────────────────────────────┘  │
│               │ Optimistic Updates                              │
│  ┌────────────▼─────────────────────────────────────────────┐  │
│  │ lib/api.ts (Typed Fetch Client)                          │  │
│  └────────────┬─────────────────────────────────────────────┘  │
└───────────────┼──────────────────────────────────────────────────┘
                │ POST/GET JSON
                ↓
┌─────────────────────────────────────────────────────────────────┐
│              apps/api (Hono REST Gateway)                        │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ routes/causaly.ts                                         │  │
│  │  ├─ GET  /api/causaly/search?q=...&types=...            │  │
│  │  ├─ POST /api/causaly/workspaces                        │  │
│  │  ├─ POST /api/causaly/strategist                        │  │
│  │  ├─ GET  /api/causaly/disease/:id/targets              │  │
│  │  ├─ GET  /api/causaly/network/:gene                    │  │
│  │  ├─ GET  /api/causaly/safety/:drug                     │  │
│  │  └─ GET  /api/causaly/timeline                         │  │
│  └────────────┬─────────────────────────────────────────────┘  │
│               │ Parallel Promise.all() for aggregation          │
└───────────────┼──────────────────────────────────────────────────┘
                │
     ┌──────────┴──────────┬──────────┬──────────┬──────────┐
     ↓                     ↓          ↓          ↓          ↓
┌─────────────┐   ┌─────────────┐   ┌────────────┐   ┌────────────┐
│ MCP Packages│   │ MCP Packages│   │  Mastra    │   │ PostgreSQL │
│  (Existing) │   │    (NEW)    │   │  Agents    │   │ (Post-MVP) │
├─────────────┤   ├─────────────┤   ├────────────┤   ├────────────┤
│ mcp-biology │   │mcp-europepmc│   │ Librarian  │   │ workspaces │
│ mcp-clinical│   │ mcp-patents │   │  (summary) │   │saved_items │
│ mcp-safety  │   │ mcp-string  │   │ Strategist │   │  users     │
│             │   │mcp-pubchem  │   │ (new prompt│   │            │
│             │   │mcp-pathways │   │  template) │   │            │
└──────┬──────┘   └──────┬──────┘   └─────┬──────┘   └────────────┘
       │                 │                 │
       │ REST/GraphQL    │ REST            │ Gemini API
       ↓                 ↓                 ↓
┌─────────────────────────────────────────────────────────────────┐
│                    External Public APIs (Free)                   │
├─────────────────────────────────────────────────────────────────┤
│ • Open Targets (GraphQL) - disease-target associations          │
│ • PubMed E-utilities - literature search                        │
│ • Europe PMC - preprints, full-text                             │
│ • UniProt - protein data                                        │
│ • STRING DB - protein-protein interactions                      │
│ • PubChem - chemical structures                                 │
│ • Reactome - pathways                                           │
│ • ClinicalTrials.gov - trial data                              │
│ • PatentsView - USPTO patents                                   │
│ • FDA Orange Book - patent expiry                              │
│ • OpenFDA FAERS - adverse events                               │
│ • RxNav - drug interactions                                     │
└─────────────────────────────────────────────────────────────────┘
```

### API Endpoint Contracts

**1. Unified Search**

```typescript
GET /api/causaly/search?q={query}&types={types}&limit={n}

Query Params:
  q: string (required) - Search term (e.g., "metformin", "EGFR", "NSCLC")
  types: string[] (optional) - Filter by type (literature,protein,compound,trial,patent,target)
  limit: number (optional) - Max results per source (default: 10)

Response: SearchResponse
{
  query: string;
  totalResults: number;
  resultsByType: {
    literature: SearchResult[];
    protein: SearchResult[];
    compound: SearchResult[];
    trial: SearchResult[];
    patent: SearchResult[];
    target: SearchResult[];
  };
  executionTime: number; // milliseconds
  sources: string[]; // ['pubmed', 'europepmc', 'uniprot', ...]
}

interface SearchResult {
  id: string; // DOI, Accession, NCT ID, Patent ID, etc.
  type: 'literature' | 'protein' | 'compound' | 'trial' | 'patent' | 'target';
  title: string;
  source: 'pubmed' | 'europepmc' | 'uniprot' | 'pubchem' | 'clinicaltrials' | 'patentsview' | 'opentargets';
  snippet: string; // First 200 chars of abstract/description
  url: string; // Deep link to source
  aiSummary?: string; // Generated by Mastra (async, may be null initially)
  metadata: Record<string, any>; // Source-specific fields
  score?: number; // Relevance score (if available)
}

Implementation (causaly.ts):
async function unifiedSearch(q: string, types?: string[], limit = 10) {
  const results = await Promise.all([
    mcpPubMed.search(q, limit),           // PubMed papers
    mcpEuropePMC.searchPreprints(q, limit), // Preprints
    mcpUniProt.search(q, limit),          // Proteins
    mcpPubChem.search(q, limit),          // Compounds
    mcpClinicalTrials.search(q, limit),   // Trials
    mcpPatents.searchPatentsByDrug(q, limit), // Patents
    mcpOpenTargets.searchTargets(q, limit), // Targets
  ]);

  return dedupeResults(results.flat(), types);
}

function dedupeResults(results: SearchResult[], types?: string[]) {
  // Deduplicate by ID (DOI, Accession, NCT, Patent ID)
  const seen = new Set<string>();
  const deduped = results.filter(r => {
    if (seen.has(r.id)) return false;
    if (types && !types.includes(r.type)) return false;
    seen.add(r.id);
    return true;
  });

  // Group by type
  return groupBy(deduped, 'type');
}

Caching: 1 hour (TanStack Query)
Rate Limiting: Parallel calls respect per-API limits (see current-platforms.md)
Error Handling: If any API fails, return partial results + error in metadata
```

**2. Workspaces (MVP: Client-Side)**

```typescript
// For hackathon MVP, workspaces are client-side only (Zustand + localStorage)
// Post-MVP: Add these backend endpoints

POST /api/causaly/workspaces
Body: { name: string; description?: string }
Response: { id: string; name: string; createdAt: string }

GET /api/causaly/workspaces
Response: { workspaces: Workspace[] }

POST /api/causaly/workspaces/:id/items
Body: { item: SearchResult }
Response: { success: boolean; workspace: Workspace }

GET /api/causaly/workspaces/:id
Response: { workspace: Workspace }

DELETE /api/causaly/workspaces/:id
Response: { success: boolean }

// Client-side implementation (workspaceStore.ts)
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface Workspace {
  id: string;
  name: string;
  items: SearchResult[];
  createdAt: string;
}

export const useWorkspaceStore = create(
  persist(
    (set, get) => ({
      workspaces: [] as Workspace[],
      activeWorkspaceId: null as string | null,

      createWorkspace: (name: string) => {
        const newWorkspace: Workspace = {
          id: crypto.randomUUID(),
          name,
          items: [],
          createdAt: new Date().toISOString(),
        };
        set(state => ({
          workspaces: [...state.workspaces, newWorkspace],
          activeWorkspaceId: newWorkspace.id,
        }));
      },

      saveItem: (item: SearchResult, workspaceId: string) => {
        set(state => ({
          workspaces: state.workspaces.map(w =>
            w.id === workspaceId
              ? { ...w, items: [...w.items, item] }
              : w
          ),
        }));
      },

      deleteWorkspace: (id: string) => {
        set(state => ({
          workspaces: state.workspaces.filter(w => w.id !== id),
          activeWorkspaceId: state.activeWorkspaceId === id ? null : state.activeWorkspaceId,
        }));
      },
    }),
    { name: 'entropy-workspaces' } // localStorage key
  )
);
```

**3. Pharma Strategist**

```typescript
POST /api/causaly/strategist
Body: { query: string; options?: { includeTimeline: boolean; includeCitations: boolean } }

Response: StrategistReport
{
  query: string;
  dominantCompanies: Array<{
    company: string;
    patentCount: number;
    earliestPatent: string; // ISO date
    latestExpiry: string;   // ISO date
    trialCount: number;
    publicationCount: number;
  }>;
  timeline: Array<{
    date: string; // ISO date
    event: string; // "Patent filed", "Trial started", "FDA approval"
    source: string; // "PatentsView", "ClinicalTrials.gov", etc.
    metadata: Record<string, any>;
  }>;
  insights: string; // AI-generated markdown (2-3 paragraphs)
  citations: Array<{
    id: string; // Patent ID, NCT ID, PMID, etc.
    type: 'patent' | 'trial' | 'paper';
    url: string;
    title: string;
  }>;
  generatedAt: string; // ISO timestamp
  dataLimitations: string[]; // e.g., ["No IQVIA market share data", "US-only patents"]
}

Implementation (causaly.ts + Mastra):
async function generateStrategistReport(query: string, options = {}) {
  // 1. Fetch data from multiple sources in parallel
  const [patents, trials, papers, orangeBook] = await Promise.all([
    mcpPatents.searchPatentsByDrug(query),
    mcpClinicalTrials.searchByDrug(query),
    mcpPubMed.search(query, { limit: 50 }),
    mcpPatents.getOrangeBookData(query),
  ]);

  // 2. Aggregate by company
  const companies = aggregateByCompany(patents, trials, papers);

  // 3. Build timeline
  const timeline = buildTimeline(patents, trials, orangeBook);

  // 4. Generate AI insights using Mastra
  const prompt = `
    You are a pharma competitive intelligence analyst. Given the following data for ${query}:

    Patents: ${JSON.stringify(patents.slice(0, 20))}
    Clinical Trials: ${JSON.stringify(trials.slice(0, 20))}
    Publications: ${JSON.stringify(papers.slice(0, 20))}

    Generate a 2-3 paragraph strategic analysis covering:
    1. Which companies dominate this space and why
    2. Key patent expiry dates and market-entry opportunities
    3. Competitive gaps or underserved therapeutic areas

    Cite specific sources using [PatentsView: US12345678] format.
  `;

  const insights = await mastraLibrarian.generate(prompt);

  // 5. Extract citations
  const citations = extractCitations(insights, patents, trials, papers);

  return {
    query,
    dominantCompanies: companies,
    timeline,
    insights,
    citations,
    generatedAt: new Date().toISOString(),
    dataLimitations: [
      "Market share data unavailable—analysis based on public patent/trial signals only",
      "US-focused patent data (PatentsView)",
      "Clinical trial sponsors may not reflect full commercial distribution",
    ],
  };
}

Caching: 24 hours (strategist reports are expensive to generate)
Async: Generation runs in background; initial response returns { jobId, status: 'pending' }
```

**4. Existing Endpoints (Unchanged)**

```typescript
GET /api/causaly/disease/:diseaseId/targets
GET /api/causaly/network/:geneSymbol
GET /api/causaly/papers
GET /api/causaly/safety/:drugName
GET /api/causaly/timeline
GET /api/causaly/drug/:drugName
GET /api/causaly/gene/:geneSymbol/pathways
```

### New MCP Packages

**1. packages/mcp-europepmc/**

```typescript
// Purpose: Better literature search than PubMed (preprints, full-text, snippets)
// API: https://europepmc.org/RestfulWebService
// Rate Limits: None documented (be respectful)
// Auth: None

// tools.ts
export const searchPreprints = tool({
  name: "searchPreprints",
  description:
    "Search Europe PMC for preprints (bioRxiv, medRxiv) and peer-reviewed papers",
  schema: z.object({
    query: z.string(),
    limit: z.number().optional().default(20),
    source: z.enum(["MED", "PMC", "PPR"]).optional(), // MED=PubMed, PMC=PMC, PPR=Preprints
  }),
  async run({ query, limit, source }) {
    const params = new URLSearchParams({
      query: query,
      format: "json",
      pageSize: limit.toString(),
      ...(source && { resultType: source }),
    });

    const res = await fetch(
      `https://www.ebi.ac.uk/europepmc/webservices/rest/search?${params}`,
    );

    if (!res.ok) throw new Error(`Europe PMC API error: ${res.status}`);

    const data = await res.json();

    return {
      results: data.resultList.result.map((paper: any) => ({
        id: paper.doi || paper.pmid || paper.id,
        type: "literature" as const,
        title: paper.title,
        source: paper.source === "PPR" ? "europepmc" : "pubmed",
        snippet: paper.abstractText?.substring(0, 200) || "",
        url: `https://europepmc.org/article/${paper.source}/${paper.id}`,
        metadata: {
          authors: paper.authorString,
          journal: paper.journalTitle,
          date: paper.firstPublicationDate,
          doi: paper.doi,
          pmid: paper.pmid,
          isPreprint: paper.source === "PPR",
        },
      })),
      totalResults: data.hitCount,
    };
  },
});

export const getFullText = tool({
  name: "getFullText",
  description: "Get full-text XML for papers with PMC IDs",
  schema: z.object({ pmcId: z.string() }),
  async run({ pmcId }) {
    const res = await fetch(
      `https://www.ebi.ac.uk/europepmc/webservices/rest/${pmcId}/fullTextXML`,
    );
    if (!res.ok) return null;
    return res.text();
  },
});
```

**2. packages/mcp-patents/**

```typescript
// Purpose: USPTO patent search + FDA Orange Book parsing
// APIs:
//   - PatentsView: https://search.patentsview.org/docs/api.html
//   - Orange Book: https://www.fda.gov/drugs/drug-approvals-and-databases/orange-book-data-files
// Rate Limits: PatentsView = unspecified (be respectful), Orange Book = static file
// Auth: None

// tools.ts
export const searchPatentsByDrug = tool({
  name: "searchPatentsByDrug",
  description: "Search USPTO patents by drug name using PatentsView API",
  schema: z.object({
    drugName: z.string(),
    limit: z.number().optional().default(20),
  }),
  async run({ drugName, limit }) {
    // PatentsView API v1 - search by patent title/abstract
    const query = {
      _text_all: { patent_title: drugName },
    };

    const fields = [
      "patent_id",
      "patent_title",
      "patent_date",
      "patent_abstract",
      "assignee_organization",
      "assignee_country",
    ];

    const res = await fetch(
      `https://search.patentsview.org/api/v1/patent/?q=${encodeURIComponent(JSON.stringify(query))}&f=${encodeURIComponent(JSON.stringify(fields))}&o={"per_page":${limit}}`,
    );

    if (!res.ok) throw new Error(`PatentsView API error: ${res.status}`);

    const data = await res.json();

    return {
      results: data.patents.map((patent: any) => ({
        id: patent.patent_id,
        type: "patent" as const,
        title: patent.patent_title,
        source: "patentsview",
        snippet: patent.patent_abstract?.substring(0, 200) || "",
        url: `https://patents.google.com/patent/${patent.patent_id}`,
        metadata: {
          patentId: patent.patent_id,
          filedDate: patent.patent_date,
          assignee: patent.assignee_organization?.[0] || "Unknown",
          country: patent.assignee_country?.[0] || "US",
        },
      })),
      totalResults: data.total_patent_count,
    };
  },
});

export const getAssigneeTimeline = tool({
  name: "getAssigneeTimeline",
  description: "Get patent timeline for a specific company",
  schema: z.object({
    company: z.string(),
    limit: z.number().optional().default(50),
  }),
  async run({ company, limit }) {
    const query = {
      assignee_organization: company,
    };

    const fields = ["patent_id", "patent_date", "patent_title"];

    const res = await fetch(
      `https://search.patentsview.org/api/v1/patent/?q=${encodeURIComponent(JSON.stringify(query))}&f=${encodeURIComponent(JSON.stringify(fields))}&o={"per_page":${limit},"sort":[{"patent_date":"desc"}]}`,
    );

    if (!res.ok) throw new Error(`PatentsView API error: ${res.status}`);

    const data = await res.json();

    return {
      company,
      patents: data.patents.map((p: any) => ({
        id: p.patent_id,
        date: p.patent_date,
        title: p.patent_title,
      })),
      totalCount: data.total_patent_count,
    };
  },
});

export const getOrangeBookData = tool({
  name: "getOrangeBookData",
  description: "Get FDA Orange Book data for drug patent expiry dates",
  schema: z.object({ drugName: z.string() }),
  async run({ drugName }) {
    // Orange Book data is a static file updated monthly
    // For MVP: Cache locally + parse on-demand
    // Format: CSV with columns [ApplNo, ProductNo, Patent, PatentExpDate, Applicant]

    const res = await fetch(
      "https://www.fda.gov/media/76860/download", // Orange Book Patent file
    );

    if (!res.ok) return { results: [], source: "orange-book-unavailable" };

    const csv = await res.text();
    const rows = parseCSV(csv); // Simple CSV parser

    const matches = rows.filter(
      (row: any) =>
        row.Applicant?.toLowerCase().includes(drugName.toLowerCase()) ||
        row.Patent?.toLowerCase().includes(drugName.toLowerCase()),
    );

    return {
      results: matches.map((row: any) => ({
        applNo: row.ApplNo,
        productNo: row.ProductNo,
        patentId: row.Patent,
        expiryDate: row.PatentExpDate,
        applicant: row.Applicant,
      })),
    };
  },
});

// Helper: Simple CSV parser
function parseCSV(csv: string) {
  const lines = csv.split("\n");
  const headers = lines[0].split(",").map((h) => h.trim());
  return lines.slice(1).map((line) => {
    const values = line.split(",");
    return headers.reduce(
      (obj, header, i) => {
        obj[header] = values[i]?.trim();
        return obj;
      },
      {} as Record<string, string>,
    );
  });
}
```

**3. packages/mcp-string/** (Already planned in original PRD)

```typescript
// Purpose: Protein-protein interaction networks
// API: https://string-db.org/api
// Rate Limits: ~1000 req/day (aggressive caching required)
// Auth: None

export const getInteractionNetwork = tool({
  name: "getInteractionNetwork",
  description: "Get protein-protein interaction network from STRING DB",
  schema: z.object({
    proteins: z.array(z.string()), // Gene symbols or UniProt IDs
    species: z.number().optional().default(9606), // Human
    minScore: z.number().optional().default(700), // High confidence
  }),
  async run({ proteins, species, minScore }) {
    const res = await fetch(
      `https://string-db.org/api/json/network?identifiers=${proteins.join("%0d")}&species=${species}&required_score=${minScore}`,
    );

    if (!res.ok) throw new Error(`STRING DB API error: ${res.status}`);

    const data = await res.json();

    return {
      nodes: data
        .map((edge: any) => [
          { id: edge.stringId_A, label: edge.preferredName_A },
          { id: edge.stringId_B, label: edge.preferredName_B },
        ])
        .flat()
        .filter((node, i, arr) => arr.findIndex((n) => n.id === node.id) === i),
      edges: data.map((edge: any) => ({
        source: edge.stringId_A,
        target: edge.stringId_B,
        score: edge.score,
        confidence:
          edge.score > 900 ? "high" : edge.score > 700 ? "medium" : "low",
      })),
    };
  },
});
```

**4. packages/mcp-pubchem/** (Already planned)
**5. packages/mcp-pathways/** (Already planned)

### Frontend Components

**1. UnifiedSearch.tsx**

```typescript
// entropy_front/src/components/UnifiedSearch.tsx
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useWorkspaceStore } from '@/store/workspaceStore';

export function UnifiedSearch() {
  const [query, setQuery] = useState('');
  const [activeType, setActiveType] = useState<'all' | 'literature' | 'protein' | 'compound' | 'trial' | 'patent' | 'target'>('all');

  const { data, isLoading, error } = useQuery({
    queryKey: ['search', query],
    queryFn: () => api.search(query),
    enabled: query.length > 2,
    staleTime: 1000 * 60 * 60, // 1 hour
  });

  const { saveItem, workspaces, activeWorkspaceId } = useWorkspaceStore();

  return (
    <div className="flex flex-col h-full">
      {/* Search Bar */}
      <div className="p-6 border-b">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search across PubMed, UniProt, Patents, Trials, and more..."
          className="w-full px-4 py-3 text-lg border rounded-lg focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {/* Type Tabs */}
      <div className="flex gap-2 px-6 py-4 border-b overflow-x-auto">
        {['all', 'literature', 'protein', 'compound', 'trial', 'patent', 'target'].map(type => (
          <button
            key={type}
            onClick={() => setActiveType(type as any)}
            className={`px-4 py-2 rounded-md text-sm font-medium whitespace-nowrap ${
              activeType === type
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {type.charAt(0).toUpperCase() + type.slice(1)}
            {data && type !== 'all' && (
              <span className="ml-2 text-xs opacity-70">
                ({data.resultsByType[type]?.length || 0})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto p-6">
        {isLoading && <div>Searching across 12 databases...</div>}
        {error && <div className="text-red-600">Error: {error.message}</div>}

        {data && (
          <div className="space-y-6">
            {Object.entries(data.resultsByType).map(([type, results]) => {
              if (activeType !== 'all' && activeType !== type) return null;
              if (!results || results.length === 0) return null;

              return (
                <div key={type}>
                  <h3 className="text-lg font-semibold mb-3 capitalize">{type}</h3>
                  <div className="space-y-3">
                    {results.map((result: SearchResult) => (
                      <ResultCard
                        key={result.id}
                        result={result}
                        onSave={() => saveItem(result, activeWorkspaceId!)}
                        canSave={!!activeWorkspaceId}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function ResultCard({ result, onSave, canSave }: { result: SearchResult; onSave: () => void; canSave: boolean }) {
  return (
    <div className="border rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-700">
              {result.source}
            </span>
            <span className="text-xs px-2 py-1 rounded bg-indigo-100 text-indigo-700">
              {result.type}
            </span>
          </div>
          <h4 className="font-medium text-gray-900 mb-2">{result.title}</h4>
          <p className="text-sm text-gray-600 mb-2">{result.snippet}</p>
          {result.aiSummary && (
            <p className="text-sm text-indigo-600 italic mb-2">
              AI Summary: {result.aiSummary}
            </p>
          )}
          <a
            href={result.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-blue-600 hover:underline"
          >
            View source →
          </a>
        </div>
        {canSave && (
          <button
            onClick={onSave}
            className="ml-4 px-3 py-1 text-sm bg-indigo-600 text-white rounded hover:bg-indigo-700"
          >
            Save
          </button>
        )}
      </div>
    </div>
  );
}
```

**2. WorkspaceSidebar.tsx**

```typescript
// entropy_front/src/components/WorkspaceSidebar.tsx
import { useState } from 'react';
import { useWorkspaceStore } from '@/store/workspaceStore';

export function WorkspaceSidebar() {
  const { workspaces, activeWorkspaceId, createWorkspace, deleteWorkspace, setActiveWorkspace } = useWorkspaceStore();
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState('');

  const handleCreate = () => {
    if (!newName.trim()) return;
    createWorkspace(newName);
    setNewName('');
    setIsCreating(false);
  };

  return (
    <div className="w-64 border-r bg-gray-50 p-4 flex flex-col h-full">
      <div className="flex justify-between items-center mb-4">
        <h2 className="font-semibold text-gray-900">Workspaces</h2>
        <button
          onClick={() => setIsCreating(true)}
          className="text-indigo-600 hover:text-indigo-800"
        >
          + New
        </button>
      </div>

      {isCreating && (
        <div className="mb-4 space-y-2">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Workspace name..."
            className="w-full px-3 py-2 border rounded"
            autoFocus
          />
          <div className="flex gap-2">
            <button
              onClick={handleCreate}
              className="flex-1 px-3 py-1 bg-indigo-600 text-white rounded text-sm"
            >
              Create
            </button>
            <button
              onClick={() => { setIsCreating(false); setNewName(''); }}
              className="flex-1 px-3 py-1 bg-gray-200 text-gray-700 rounded text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {workspaces.map(workspace => (
          <div
            key={workspace.id}
            className={`p-3 rounded cursor-pointer transition-colors ${
              activeWorkspaceId === workspace.id
                ? 'bg-indigo-100 border border-indigo-300'
                : 'bg-white border border-gray-200 hover:bg-gray-50'
            }`}
            onClick={() => setActiveWorkspace(workspace.id)}
          >
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <h3 className="font-medium text-sm text-gray-900">{workspace.name}</h3>
                <p className="text-xs text-gray-500 mt-1">
                  {workspace.items.length} items
                </p>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm(`Delete "${workspace.name}"?`)) {
                    deleteWorkspace(workspace.id);
                  }
                }}
                className="text-gray-400 hover:text-red-600"
              >
                ×
              </button>
            </div>
          </div>
        ))}
      </div>

      {workspaces.length === 0 && !isCreating && (
        <div className="text-sm text-gray-500 text-center py-8">
          No workspaces yet. Create one to start saving items!
        </div>
      )}
    </div>
  );
}
```

**3. StrategistReport.tsx**

```typescript
// entropy_front/src/components/StrategistReport.tsx
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend } from 'recharts';

export function StrategistReport() {
  const [query, setQuery] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ['strategist', query],
    queryFn: () => api.strategist(query),
    enabled: submitted && query.length > 2,
    staleTime: 1000 * 60 * 60 * 24, // 24 hours
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-6 border-b">
        <h2 className="text-2xl font-bold mb-4">Pharma Strategist</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Strategic Query
            </label>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g., What companies dominate metformin distribution?"
              className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
          >
            {isLoading ? 'Analyzing...' : 'Generate Report'}
          </button>
        </form>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {isLoading && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
            <p className="text-gray-600">
              Analyzing patents, trials, and publications...
              <br />
              <span className="text-sm text-gray-500">This may take 15-30 seconds</span>
            </p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">Error: {error.message}</p>
          </div>
        )}

        {data && (
          <div className="space-y-8">
            {/* Dominant Companies */}
            <section>
              <h3 className="text-xl font-semibold mb-4">Dominant Companies</h3>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border px-4 py-2 text-left">Company</th>
                      <th className="border px-4 py-2 text-center">Patents</th>
                      <th className="border px-4 py-2 text-center">Trials</th>
                      <th className="border px-4 py-2 text-center">Publications</th>
                      <th className="border px-4 py-2 text-left">Earliest Patent</th>
                      <th className="border px-4 py-2 text-left">Latest Expiry</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.dominantCompanies.map(company => (
                      <tr key={company.company} className="hover:bg-gray-50">
                        <td className="border px-4 py-2 font-medium">{company.company}</td>
                        <td className="border px-4 py-2 text-center">{company.patentCount}</td>
                        <td className="border px-4 py-2 text-center">{company.trialCount}</td>
                        <td className="border px-4 py-2 text-center">{company.publicationCount}</td>
                        <td className="border px-4 py-2">{new Date(company.earliestPatent).toLocaleDateString()}</td>
                        <td className="border px-4 py-2">{new Date(company.latestExpiry).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Timeline */}
            <section>
              <h3 className="text-xl font-semibold mb-4">Timeline</h3>
              <div className="bg-white p-4 rounded-lg border">
                <LineChart
                  width={800}
                  height={300}
                  data={data.timeline.map(event => ({
                    date: new Date(event.date).getFullYear(),
                    event: event.event,
                  }))}
                >
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="event" stroke="#4F46E5" />
                </LineChart>
              </div>

              <div className="mt-4 space-y-2">
                {data.timeline.map((event, i) => (
                  <div key={i} className="border-l-4 border-indigo-500 pl-4 py-2">
                    <div className="text-sm font-medium">{new Date(event.date).toLocaleDateString()}</div>
                    <div className="text-gray-700">{event.event}</div>
                    <div className="text-xs text-gray-500">{event.source}</div>
                  </div>
                ))}
              </div>
            </section>

            {/* AI Insights */}
            <section>
              <h3 className="text-xl font-semibold mb-4">Strategic Analysis</h3>
              <div className="prose max-w-none">
                <div
                  className="text-gray-700 leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: data.insights }}
                />
              </div>
            </section>

            {/* Citations */}
            <section>
              <h3 className="text-xl font-semibold mb-4">Citations ({data.citations.length})</h3>
              <div className="space-y-2">
                {data.citations.map((citation, i) => (
                  <div key={i} className="text-sm">
                    <span className="font-medium">[{i + 1}]</span>{' '}
                    <a
                      href={citation.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      {citation.title}
                    </a>
                    {' '}
                    <span className="text-gray-500">({citation.type})</span>
                  </div>
                ))}
              </div>
            </section>

            {/* Data Limitations */}
            {data.dataLimitations && data.dataLimitations.length > 0 && (
              <section className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h4 className="font-semibold text-yellow-800 mb-2">Data Limitations</h4>
                <ul className="list-disc list-inside text-sm text-yellow-700 space-y-1">
                  {data.dataLimitations.map((limitation, i) => (
                    <li key={i}>{limitation}</li>
                  ))}
                </ul>
              </section>
            )}

            {/* Export */}
            <div className="flex gap-4">
              <button
                onClick={() => {/* Export as Markdown */}}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
              >
                Export as Markdown
              </button>
              <button
                onClick={() => {/* Export as PDF */}}
                className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
              >
                Export as PDF
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
```

**4. UniProtFeatureViewer.tsx**

```typescript
// entropy_front/src/components/UniProtFeatureViewer.tsx
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import * as d3 from 'd3';
import { useEffect, useRef } from 'react';

export function UniProtFeatureViewer({ accession }: { accession: string }) {
  const svgRef = useRef<SVGSVGElement>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['uniprot-features', accession],
    queryFn: () => api.getProteinFeatures(accession),
  });

  useEffect(() => {
    if (!data || !svgRef.current) return;

    // Clear previous render
    d3.select(svgRef.current).selectAll('*').remove();

    const svg = d3.select(svgRef.current);
    const width = 800;
    const height = 300;
    const margin = { top: 20, right: 20, bottom: 30, left: 60 };

    const sequenceLength = data.sequence.length;
    const xScale = d3.scaleLinear()
      .domain([1, sequenceLength])
      .range([margin.left, width - margin.right]);

    // Sequence bar
    svg.append('rect')
      .attr('x', margin.left)
      .attr('y', 50)
      .attr('width', width - margin.left - margin.right)
      .attr('height', 20)
      .attr('fill', '#e5e7eb')
      .attr('stroke', '#9ca3af');

    // Feature tracks
    const tracks = [
      { name: 'Domains', y: 80, color: '#3b82f6', features: data.features.domains },
      { name: 'Active Sites', y: 110, color: '#10b981', features: data.features.activeSites },
      { name: 'PTMs', y: 140, color: '#8b5cf6', features: data.features.ptms },
      { name: 'Variants', y: 170, color: '#ef4444', features: data.features.variants },
    ];

    tracks.forEach(track => {
      // Track label
      svg.append('text')
        .attr('x', 10)
        .attr('y', track.y + 10)
        .attr('font-size', 12)
        .text(track.name);

      // Features
      track.features.forEach((feature: any) => {
        svg.append('rect')
          .attr('x', xScale(feature.start))
          .attr('y', track.y)
          .attr('width', Math.max(2, xScale(feature.end) - xScale(feature.start)))
          .attr('height', 15)
          .attr('fill', track.color)
          .attr('stroke', 'white')
          .attr('rx', 2)
          .append('title')
          .text(`${feature.type}: ${feature.description} (${feature.start}-${feature.end})`);
      });
    });

    // Axis
    const xAxis = d3.axisBottom(xScale).ticks(10);
    svg.append('g')
      .attr('transform', `translate(0, ${height - margin.bottom})`)
      .call(xAxis);

  }, [data]);

  if (isLoading) return <div>Loading protein features...</div>;
  if (!data) return <div>No data available</div>;

  return (
    <div className="p-4">
      <h3 className="text-lg font-semibold mb-4">
        {data.proteinName} ({accession})
      </h3>
      <p className="text-sm text-gray-600 mb-4">
        Sequence length: {data.sequence.length} amino acids
      </p>
      <svg
        ref={svgRef}
        width={800}
        height={300}
        className="border rounded"
      />
    </div>
  );
}
```

### Testing Strategy

**Unit Tests (Target: 80% coverage)**

```typescript
// Example: packages/mcp-europepmc/src/__tests__/tools.test.ts
import { describe, it, expect, vi } from "vitest";
import { searchPreprints } from "../tools";

describe("searchPreprints", () => {
  it("should return formatted results from Europe PMC API", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        resultList: {
          result: [
            {
              id: "PPR123456",
              title: "Test Preprint",
              source: "PPR",
              abstractText: "This is a test abstract.",
              doi: "10.1101/123456",
            },
          ],
        },
        hitCount: 1,
      }),
    });

    const result = await searchPreprints.run({ query: "metformin", limit: 10 });

    expect(result.results).toHaveLength(1);
    expect(result.results[0].title).toBe("Test Preprint");
    expect(result.results[0].metadata.isPreprint).toBe(true);
  });

  it("should handle API errors gracefully", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
    });

    await expect(
      searchPreprints.run({ query: "metformin", limit: 10 }),
    ).rejects.toThrow("Europe PMC API error: 500");
  });
});
```

**Integration Tests**

```typescript
// Example: apps/api/src/routes/__tests__/causaly.test.ts
import { describe, it, expect } from "vitest";
import { app } from "../index";

describe("GET /api/causaly/search", () => {
  it("should return aggregated results from multiple sources", async () => {
    const res = await app.request("/api/causaly/search?q=metformin&limit=5");
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.query).toBe("metformin");
    expect(data.resultsByType).toHaveProperty("literature");
    expect(data.resultsByType).toHaveProperty("patent");
    expect(data.sources).toContain("pubmed");
    expect(data.sources).toContain("patentsview");
  });
});
```

**Component Tests**

```typescript
// Example: entropy_front/src/components/__tests__/UnifiedSearch.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { UnifiedSearch } from '../UnifiedSearch';
import { vi } from 'vitest';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

function Wrapper({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}

describe('UnifiedSearch', () => {
  it('should render search input', () => {
    render(<UnifiedSearch />, { wrapper: Wrapper });
    expect(screen.getByPlaceholderText(/search across/i)).toBeInTheDocument();
  });

  it('should fetch results when query is entered', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        query: 'metformin',
        resultsByType: {
          literature: [{ id: '1', title: 'Test Paper', type: 'literature' }],
        },
      }),
    });

    render(<UnifiedSearch />, { wrapper: Wrapper });

    const input = screen.getByPlaceholderText(/search across/i);
    fireEvent.change(input, { target: { value: 'metformin' } });

    await waitFor(() => {
      expect(screen.getByText('Test Paper')).toBeInTheDocument();
    });
  });
});
```

### Performance Optimizations

**1. API Call Parallelization**

```typescript
// causaly.ts - Unified search uses Promise.all()
const results = await Promise.all([
  mcpPubMed.search(q, limit).catch((err) => ({ results: [], error: err })),
  mcpEuropePMC
    .searchPreprints(q, limit)
    .catch((err) => ({ results: [], error: err })),
  // ... 10 more APIs
]);

// If any API fails, return partial results
```

**2. Aggressive Caching**

```typescript
// TanStack Query cache configuration
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 60, // 1 hour for search
      cacheTime: 1000 * 60 * 60 * 24, // 24 hours in memory
      retry: 2,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
  },
});

// Per-endpoint overrides
useQuery({
  queryKey: ["patents", drug],
  staleTime: 1000 * 60 * 60 * 24 * 30, // 30 days (patents rarely change)
});
```

**3. Code Splitting**

```typescript
// App.tsx - Lazy load heavy components
const NetworkView = lazy(() => import('./components/NetworkView'));
const StrategistReport = lazy(() => import('./components/StrategistReport'));
const UniProtFeatureViewer = lazy(() => import('./components/UniProtFeatureViewer'));

<Suspense fallback={<LoadingSkeleton />}>
  <NetworkView />
</Suspense>
```

**4. Virtual Scrolling**

```typescript
// For large result lists (100+ items)
import { useVirtualizer } from '@tanstack/react-virtual';

function SearchResults({ results }: { results: SearchResult[] }) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: results.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 100, // Estimated height of each result card
  });

  return (
    <div ref={parentRef} style={{ height: '600px', overflow: 'auto' }}>
      <div style={{ height: `${virtualizer.getTotalSize()}px`, position: 'relative' }}>
        {virtualizer.getVirtualItems().map(virtualItem => (
          <div
            key={virtualItem.key}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: `${virtualItem.size}px`,
              transform: `translateY(${virtualItem.start}px)`,
            }}
          >
            <ResultCard result={results[virtualItem.index]} />
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## Testing Decisions

### What Makes a Good Test

**Test External Behavior, Not Implementation**:

- ✅ Good: Verify API response structure matches TypeScript interfaces
- ❌ Bad: Test internal cache implementation details
- ✅ Good: Test that clicking "Save" button adds item to workspace
- ❌ Bad: Test Zustand store internals directly

**Focus on User-Facing Scenarios**:

- ✅ Good: "User can search and see results from multiple sources"
- ❌ Bad: "useMemo optimization works correctly"

**Test Error Paths**:

- ✅ Good: "Shows error message when API returns 500"
- ✅ Good: "Retries failed requests with exponential backoff"

### Modules to Test

**Critical Path (90%+ coverage)**:

1. **API Endpoints** (`apps/api/src/routes/causaly.ts`)
   - Test response formats match TypeScript interfaces
   - Test error handling (404, 500, rate limits)
   - Test deduplication logic
   - Mock MCP tools, verify calls

2. **New MCP Packages**
   - `mcp-europepmc`: Test search results parsing
   - `mcp-patents`: Test PatentsView API integration + Orange Book parsing
   - Test rate limit handling (429 responses)

**High Priority (80%+ coverage)**: 3. **Frontend Data Fetching** (`lib/api.ts`, React Query hooks)

- Test API client request/response formatting
- Test error handling + retry logic
- Mock fetch, verify correct endpoints called

4. **Strategist Report Generation**
   - Test data aggregation (patents + trials + papers)
   - Test AI prompt construction
   - Test citation extraction

**Medium Priority (60%+ coverage)**: 5. **UI Components**

- Test UnifiedSearch renders search results correctly
- Test WorkspaceSidebar create/delete/switch operations
- Test StrategistReport displays tables + timeline
- Use React Testing Library + user-event

**Low Priority (nice to have)**: 6. **Zustand Store** (`workspaceStore.ts`)

- Test save/delete operations
- Test localStorage persistence

### Prior Art

- **Backend tests**: Follow patterns in `packages/mcp-biology/src/__tests__/` (Vitest + mocked fetch)
- **Frontend tests**: New pattern (first tests in `entropy_front/`)—use React Testing Library + MSW for API mocking
- **Integration tests**: Follow patterns in `apps/api/src/routes/__tests__/`

### Test Infrastructure

**Tools**:

- Vitest (test runner) - already configured in monorepo
- React Testing Library - for component tests
- MSW (Mock Service Worker) - for API mocking in frontend tests
- `@testing-library/user-event` - for realistic user interactions

**CI Pipeline** (post-MVP):

```yaml
# .github/workflows/test.yml
name: Test
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
      - run: pnpm install
      - run: pnpm test
      - run: pnpm test:e2e
      - name: Upload coverage
        uses: codecov/codecov-action@v3
```

---

## Out of Scope

The following are explicitly **NOT** included in this hackathon MVP:

### Authentication & User Management

- ❌ User accounts / login system (using demo single-user for MVP)
- ❌ Role-based access control (RBAC)
- ❌ Team collaboration features (comments, annotations)
- ❌ OAuth integration (Google, ORCID)

### Backend Workspace Persistence

- ❌ PostgreSQL tables for workspaces/saved_items (using Zustand + localStorage for MVP)
- ❌ Workspace sharing via URLs
- ❌ Workspace versioning / history

### Advanced Strategist Features

- ❌ IQVIA/EXIM market share data integration (proprietary, costly)
- ❌ Real-time patent monitoring (USPTO updates)
- ❌ Semantic Scholar citation graphs
- ❌ Competitive landscape heatmaps

### Advanced Visualizations

- ❌ 3D protein structures (AlphaFold DB)
- ❌ Interactive pathway diagrams (beyond Reactome metadata)
- ❌ Gene expression heatmaps
- ❌ Virtual screening / molecular docking

### Export & Reporting

- ❌ PDF report generation (only Markdown export for MVP)
- ❌ PowerPoint slide generation
- ❌ Jupyter notebook export

### AI Enhancements

- ❌ Multi-turn conversational Strategist (chatbot-style)
- ❌ Automatic hypothesis generation
- ❌ Local LLM inference (Gemini API only for MVP)

### Mobile & Offline

- ❌ Mobile native apps (iOS, Android)
- ❌ Progressive Web App (PWA) offline mode
- ❌ Service worker caching

### Enterprise Features

- ❌ Audit logs / compliance tracking
- ❌ Data retention policies
- ❌ SSO (SAML, LDAP)
- ❌ On-premises deployment

**Rationale**: These features are valuable but not essential for demonstrating the core value proposition at the hackathon. Scoping ruthlessly to ship a working MVP in 7 days.

---

## Further Notes

### Hackathon Demo Script (5-7 minutes)

**Setup** (30 seconds):

- Open browser to http://localhost:5174
- Show clean, polished Entropy UI with Causaly-inspired design

**Act 1: Unified Search** (90 seconds):

1. Type "metformin" in search bar
2. Show aggregated results loading in real-time from 12 sources
3. Highlight source badges (PubMed, UniProt, PatentsView, etc.)
4. Click Literature tab → show papers with AI summaries
5. Click Patent tab → show USPTO patents with assignees
6. Click Protein tab → show MTOR, AMPK proteins

**Act 2: Workspace Organization** (60 seconds):

1. Click "+ New Workspace" → name it "Metformin Competition 2026"
2. Save 3 items: 1 paper, 1 patent, 1 protein
3. Switch to "Saved Items" view → show grid with filters
4. Click saved protein → opens UniProt Feature Viewer modal

**Act 3: Strategist Intelligence** (120 seconds):

1. Switch to "Strategist" tab
2. Type: _"What companies dominate metformin distribution?"_
3. Click "Generate Report" → show loading (15-20 seconds)
4. Show report sections:
   - Dominant Companies table (Novo Nordisk, Merck, Takeda)
   - Patent timeline visualization (Recharts)
   - AI-generated insights paragraph
   - Citations (PatentsView, Orange Book, ClinicalTrials)
5. Hover over timeline events → tooltips
6. Click "Export as Markdown"

**Act 4: Network Visualization** (60 seconds):

1. From saved protein (MTOR), click "View Network"
2. Show protein-protein interaction graph (STRING DB)
3. Zoom/pan controls
4. Click node → opens UniProt Feature Viewer
5. Show color-coded feature tracks (domains, PTMs, variants)

**Closing** (30 seconds):

- Recap: "One platform, 12+ data sources, AI-powered insights, persistent workspaces"
- AMD tie-in: "Optimized for Ryzen AI laptops; future: local inference"
- Call-to-action: "Open-source, free forever, built on public APIs"

### AMD Integration Points

**For Hackathon Pitch**:

1. **Performance**: "Runs efficiently on AMD Ryzen AI laptops with integrated GPU acceleration"
2. **Future Roadmap**: "Phase 2: Local LLM inference using AMD ROCm (no API costs)"
3. **Edge Deployment**: "Deploy on AMD EPYC servers for pharma on-premises requirements"
4. **AI Acceleration**: "Strategist report generation can leverage AMD AI engines for faster synthesis"

**Technical Reality Check**:

- MVP uses Google Gemini API (cloud-based)
- Post-hackathon: Can integrate llama.cpp + AMD ROCm for local inference
- AMD Ryzen AI (Zen 5) has NPU for lightweight inference (perfect for paper summarization)

### Data Source Limitations (Disclose Transparently)

**What We CAN Get (Free)**:

- ✅ Patents: USPTO data (US-only, via PatentsView + Orange Book)
- ✅ Trials: ClinicalTrials.gov (global, but US-centric)
- ✅ Publications: PubMed + Europe PMC (comprehensive)
- ✅ Proteins: UniProt (complete)
- ✅ Safety: OpenFDA FAERS (US-only)

**What We CANNOT Get (Proprietary)**:

- ❌ Market share / sales volume (IQVIA, Symphony Health)
- ❌ Prescription data (IQVIA DDD, IMS Health)
- ❌ Global patents (requires paid EPO/WIPO access)
- ❌ Private trial data (company-sponsored, non-registered)

**Strategist "Dominance" Signals** (Proxy Metrics):

- Patent count by assignee (more patents ≈ more R&D investment)
- Trial sponsorship (more trials ≈ more clinical activity)
- Publication volume (more papers ≈ more scientific interest)
- Orange Book listings (more NDAs ≈ more approved products)

**Disclosure in UI**:

- Add banner: "Market dominance inferred from public patent/trial/publication signals. Actual sales data not available."

### Rate Limit Mitigation Strategy

**APIs with Strict Limits**:

1. **STRING DB**: ~1000 req/day
   - **Mitigation**: 7-day cache, limit network queries to 25 nodes initially
   - **Fallback**: Pre-cache common proteins (EGFR, TP53, etc.)

2. **NCBI (PubMed)**: 3 req/sec (10 with key)
   - **Mitigation**: Always include NCBI_API_KEY, batch requests
   - **Fallback**: Use Europe PMC as backup

3. **OpenFDA**: 240 req/min (without key), 120k/day (with key)
   - **Mitigation**: Include OPENFDA_API_KEY, 7-day cache for safety data

**Monitoring**:

- Log all API calls with timestamps
- Track rate limit headers (Retry-After, X-RateLimit-Remaining)
- Alert if approaching limits (80% threshold)

### Deployment Checklist

**Pre-Demo (April 6, 2026)**:

- [ ] All dependencies installed (`pnpm install`)
- [ ] Environment variables configured (`.env` with API keys)
- [ ] Docker Compose up (`docker compose up -d`)
- [ ] Frontend dev server running (`cd entropy_front && npm run dev`)
- [ ] Backend API running (`cd apps/api && npm run dev`)
- [ ] Test unified search with "metformin" query
- [ ] Test workspace create/save/delete
- [ ] Test Strategist report generation
- [ ] Record backup demo video (in case of Wi-Fi issues)

**Hardware Requirements**:

- Laptop: AMD Ryzen 7 or higher (or any modern laptop)
- RAM: 16GB minimum (32GB recommended for demo smoothness)
- Display: External monitor (1080p minimum) for judges
- Internet: Stable connection (mobile hotspot backup)

### Success Metrics

**Technical Metrics**:

- ✅ Unified search returns results <2s (with cache)
- ✅ All 12 data sources reachable
- ✅ Network graph renders 50 nodes smoothly (60fps)
- ✅ Strategist report generates in <30s
- ✅ Workspace operations instant (<100ms)
- ✅ Zero crashes during 5-7 min demo

**Functional Metrics**:

- ✅ Can search and save items across all data types
- ✅ Can create multiple workspaces
- ✅ Can generate actionable Strategist report
- ✅ Can visualize protein networks
- ✅ Can view protein features

**Judging Criteria (Estimated)**:

- **Innovation**: 30% - "First unified biomedical intelligence platform with patents + Strategist"
- **Technical Execution**: 25% - "Smooth demo, real APIs, polished UI"
- **Impact**: 25% - "Solves real pharma pain point (scattered data)"
- **AMD Integration**: 10% - "Runs on Ryzen AI, future ROCm roadmap"
- **Presentation**: 10% - "Clear, confident, time management"

### Post-Hackathon Roadmap

**Week 1-2 (April 15-28)**:

- Add PostgreSQL backend for workspace persistence
- Implement lightweight auth (magic links)
- Deploy to cloud (Vercel frontend + Railway backend)

**Week 3-4 (April 29 - May 12)**:

- Add ChEMBL API integration (bioactivity data)
- Enhance Strategist with citation graphs (Semantic Scholar)
- Add PDF export for reports

**Month 2 (May-June)**:

- Integrate AlphaFold DB (3D protein structures)
- Add COSMIC mutation data for cancer research
- Local LLM inference (llama.cpp + AMD ROCm)

**Month 3+ (June onwards)**:

- Multi-user collaboration (comments, sharing)
- Workspace versioning
- Admin dashboard + analytics
- Mobile-responsive design
- Open-source release (GitHub)

---

**Document Version**: 4.0  
**Last Updated**: March 30, 2026  
**Status**: ✅ Build-Ready - Start Implementation

**Next Action**: Reply with "Start Day 1" and I will provide:

1. Exact file/folder creation commands
2. Complete code for `mcp-europepmc` package
3. Complete code for `mcp-patents` package
4. Unified search aggregator implementation
5. Workspace store implementation

🚀 Let's build the winning hackathon entry!
