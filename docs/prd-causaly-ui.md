# PRD: Entropy Causaly-Style Biomedical Intelligence Platform

**Status**: Draft  
**Created**: 2026-03-30  
**Owner**: Development Team  
**Epic Label**: `causaly-ui`

---

## Problem Statement

Entropy v2 currently operates as a backend research pipeline with CLI/API interfaces. Pharma researchers and translational scientists lack a visual, interactive way to explore biomedical relationships. They must:

- Manually query multiple databases (Open Targets, PubMed, UniProt, STRING DB) separately
- Parse JSON/XML responses without visual context
- Cannot see protein-protein interaction networks graphically
- Cannot quickly assess disease-target associations at a glance
- Have no way to visualize drug safety profiles across organ systems
- Spend hours reviewing literature without AI-generated summaries

The existing frontend (`entropy_front/`) has a beautifully designed Causaly-inspired UI with dendrograms, network views, and safety visualizations—but all using mock data. Researchers cannot use it for actual research because it's disconnected from real biomedical data sources.

---

## Solution

Transform the existing Entropy frontend into a **functional biomedical intelligence platform** by connecting it to real-time data from public APIs (Open Targets, PubMed, UniProt, STRING DB, PubChem, Reactome, OpenFDA).

The platform will provide:

1. **Interactive disease-target dendrograms** showing association scores from Open Targets
2. **Protein-protein interaction network graphs** powered by STRING DB
3. **Literature browser** with AI-generated summaries and entity highlighting
4. **Organ safety visualizations** mapping adverse events to anatomical systems
5. **Timeline views** of clinical trials, publications, and regulatory events
6. **AI Copilot sidebar** with contextual insights and quick actions

All existing UI components remain unchanged—we're replacing the mock data layer with a real API integration layer, plus adding 3 new MCP packages for data sources not yet available (STRING DB, PubChem, Reactome pathways).

---

## User Stories

### Discovery & Target Identification

1. As a translational researcher, I want to search for a disease by name, so that I can see all gene targets associated with it
2. As a target identification scientist, I want to see association scores for each target, so that I can prioritize which ones to investigate further
3. As a drug discovery team lead, I want to view targets in a hierarchical dendrogram, so that I can understand the biological relationships at a glance
4. As a computational biologist, I want to click on a gene target node, so that I can see detailed information about that protein
5. As a researcher, I want to hover over dendrogram connections, so that I can see the evidence types supporting each association
6. As a portfolio manager, I want to filter targets by minimum association score, so that I only see high-confidence candidates
7. As a bioinformatician, I want to export the target list as CSV, so that I can import it into my analysis pipeline

### Protein Interaction Networks

8. As a systems biologist, I want to visualize protein-protein interactions for a gene, so that I can understand its biological context
9. As a pathway researcher, I want to see interaction confidence scores on network edges, so that I can trust the relationships
10. As a network analyst, I want to zoom and pan the network graph, so that I can explore dense interaction clusters
11. As a researcher, I want to click on a protein node, so that I can see its UniProt details and related pathways
12. As a computational scientist, I want to filter interactions by confidence threshold, so that I can focus on high-quality data
13. As a pathway biologist, I want to overlay Reactome pathway annotations on the network, so that I can see which proteins belong to which pathways
14. As a drug target validator, I want to see which proteins in the network are druggable, so that I can assess therapeutic opportunities
15. As a team member, I want to export the network as PNG or SVG, so that I can include it in presentations
16. As a researcher, I want to click on an interaction edge, so that I can see the experimental evidence supporting it
17. As a bioinformatician, I want to expand the network by adding interaction partners, so that I can explore second-degree connections
18. As a systems biologist, I want to see protein complex annotations, so that I can identify functional modules

### Literature Discovery

19. As a literature reviewer, I want to search PubMed by disease and topic, so that I can find relevant research papers
20. As a busy scientist, I want to see AI-generated 2-3 sentence summaries of papers, so that I can quickly assess relevance without reading full abstracts
21. As a researcher, I want to see highlighted entities (genes, drugs, diseases) in paper summaries, so that I can quickly identify key concepts
22. As a literature analyst, I want to click on a paper card, so that I can read the full abstract in a slide-in panel
23. As a systematic reviewer, I want to see MeSH terms for each paper, so that I can understand the paper's classification
24. As a scientist, I want to click "View in PubMed" links, so that I can access the full text article
25. As a researcher, I want to filter papers by publication year, so that I can focus on recent findings
26. As a team lead, I want to filter by journal name, so that I can prioritize high-impact publications
27. As a researcher, I want to see author information, so that I can identify key opinion leaders in the field
28. As a literature reviewer, I want pagination controls, so that I can browse through hundreds of results efficiently
29. As a knowledge manager, I want to see preprints separately from peer-reviewed papers, so that I can assess evidence quality

### Drug Safety Assessment

30. As a safety scientist, I want to search for a drug by name, so that I can see its adverse event profile
31. As a pharmacovigilance analyst, I want to see organ systems color-coded by safety severity, so that I can quickly identify risk areas
32. As a toxicologist, I want to hover over organ diagrams, so that I can see the top 3 adverse events for that system
33. As a clinical development lead, I want to click on an organ, so that I can see a detailed table of all adverse events
34. As a regulatory affairs specialist, I want to see the data source and last update date, so that I can trust the information
35. As a safety reviewer, I want to see event frequency counts, so that I can assess the magnitude of risk
36. As a risk manager, I want to compare safety profiles across multiple drugs, so that I can make informed decisions
37. As a medical affairs director, I want to export safety data as a report, so that I can share with stakeholders

### Timeline & Historical Context

38. As a competitive intelligence analyst, I want to see a chronological timeline of clinical trials, so that I can understand the development history
39. As a portfolio strategist, I want to see publication dates on the timeline, so that I can identify when interest in a target emerged
40. As a regulatory analyst, I want to see FDA approval dates, so that I can understand the regulatory history
41. As a researcher, I want to filter timeline events by type (trial, paper, approval), so that I can focus on specific event categories
42. As a project manager, I want to zoom the timeline view, so that I can see decade, year, or month-level detail
43. As a scientist, I want to click on timeline event cards, so that I can see expanded details

### AI Copilot & Insights

44. As a researcher, I want to see an AI-generated overview of my current query, so that I can get a high-level summary
45. As a scientist, I want to see inline citations in AI text, so that I can verify claims
46. As a user, I want to click citations, so that I can open the source document
47. As a researcher, I want to see a mini dendrogram widget in the sidebar, so that I have quick reference while reading details
48. As a pathway biologist, I want to see top pathways for the current gene, so that I can understand its biological role
49. As a safety analyst, I want to see a safety summary widget, so that I can quickly assess risk
50. As a scientist, I want quick action buttons for "Generate Report" and "Export", so that I can save my findings efficiently

### Navigation & User Experience

51. As a user, I want a persistent top navigation bar, so that I can access key features from anywhere
52. As a researcher, I want to switch between Dendrogram, Network, Documents, Timeline, and Grid views using tabs, so that I can explore data in different formats
53. As a user, I want smooth animations when loading visualizations, so that the interface feels polished and responsive
54. As a researcher, I want loading skeletons while data fetches, so that I understand the system is working
55. As a user, I want clear error messages when API calls fail, so that I know what went wrong
56. As a scientist, I want the sidebar to be collapsible, so that I can maximize screen space for visualizations
57. As a user, I want keyboard shortcuts for common actions, so that I can work more efficiently
58. As a researcher, I want a search bar always accessible, so that I can quickly pivot to new queries

### Performance & Reliability

59. As a user, I want pages to load in under 2 seconds, so that I don't waste time waiting
60. As a researcher, I want network graphs with 50+ nodes to render smoothly, so that I can explore complex interactions
61. As a user, I want the system to cache frequently accessed data, so that repeated queries are instant
62. As a scientist, I want the UI to remain responsive even when AI summarization is running, so that I can continue exploring
63. As a researcher, I want graceful degradation when external APIs are slow, so that I can still use other features
64. As a user, I want to see progress indicators for long-running operations, so that I know the system hasn't frozen

### Data Quality & Trust

65. As a scientist, I want to see data source labels on every piece of information, so that I can assess credibility
66. As a researcher, I want to see timestamps on cached data, so that I know if information is stale
67. As a quality analyst, I want entity extraction to be accurate (>80% precision), so that highlighted terms are relevant
68. As a user, I want AI-generated summaries to include citations, so that I can verify claims
69. As a researcher, I want association scores from Open Targets to match their official platform, so that I trust the data
70. As a scientist, I want STRING DB interaction scores to reflect actual confidence levels, so that I don't overinterpret weak evidence

---

## Implementation Decisions

### Architecture

- **Backend**: Create new API routes in `apps/api/src/routes/causaly.ts` that aggregate data from existing MCP tools
- **Frontend**: Connect existing React 19 components in `entropy_front/` to real API endpoints via React Query
- **State Management**: Use TanStack Query (React Query) for server state, local React state for UI interactions
- **Caching Strategy**: Implement in-memory LRU cache with TTLs (disease-target: 24h, PPI networks: 7 days, literature: 1h)
- **Error Handling**: Comprehensive error boundaries, retry logic with exponential backoff, fallback to cached data

### New API Endpoints

Create RESTful endpoints that abstract MCP tool complexity:

1. **`GET /api/causaly/disease/:diseaseId/targets`** - Disease-target associations
   - Query Open Targets GraphQL `disease.associatedTargets`
   - Return: Array of {gene, ensemblId, score, evidenceCount, topEvidence}
   - Cache: 24 hours
   - Support query params: `limit`, `minScore`

2. **`GET /api/causaly/network/:geneSymbol`** - Protein-protein interactions
   - Query STRING DB `/json/network` API
   - Optionally query Reactome `/data/pathways/low/entity` for pathway overlays
   - Return: {nodes: [{id, label, type}], edges: [{source, target, score, confidence}], pathways: [...]}
   - Cache: 7 days
   - Support query params: `minScore`, `maxNodes`, `includePathways`

3. **`GET /api/causaly/papers`** - Literature search
   - Query PubMed via existing `search_literature` tool
   - Fetch metadata via existing `get_paper_metadata` tool
   - Use Mastra Librarian Agent to generate AI summaries
   - Extract entities using regex patterns (genes: all caps 3-6 letters, drugs: lowercase with -suffix)
   - Return: {papers: [{id, title, authors, journal, date, abstract, meshTerms, aiSummary, highlightedEntities, url}]}
   - Cache: 1 hour
   - Support query params: `query`, `year`, `limit`, `source`

4. **`GET /api/causaly/safety/:drugName`** - Drug safety profile
   - Query OpenFDA FAERS via existing `check_adverse_events` tool
   - Map MedDRA SOC terms to organ systems using static lookup table
   - Calculate severity: green (<10 events), amber (10-100), red (>100), gray (no data)
   - Return: {drug, organSystems: {cardiovascular: {severity, eventCount, topEvents}}, totalAdverseEvents}
   - Cache: 7 days

5. **`GET /api/causaly/drug/:drugName`** - Drug information
   - Query existing OpenFDA + ChEMBL tools
   - Query PubChem for chemical properties (new tool)
   - Return: {drug, chemicalProperties: {molecularFormula, weight, smiles}, safety, interactions, clinicalPhase}
   - Cache: 7 days

6. **`GET /api/causaly/gene/:geneSymbol/pathways`** - Pathway annotations
   - Query Reactome API for pathway membership (new tool)
   - Return: {gene, pathways: [{id, name, description, participants}]}
   - Cache: 7 days

7. **`GET /api/causaly/timeline`** - Chronological events
   - Aggregate data from ClinicalTrials.gov (start/completion dates), PubMed (publication dates), Drugs@FDA (approval dates)
   - Sort chronologically, deduplicate
   - Return: {events: [{date, type, title, description, source}]}
   - Cache: 1 hour
   - Support query params: `query`, `eventTypes`

### New MCP Packages

Create 3 new packages following existing patterns in `packages/mcp-*/`:

1. **`packages/mcp-string/`** - STRING DB protein interactions (CRITICAL)
   - Tools: `get_interaction_network`, `get_interaction_partners`, `get_pathway_enrichment`
   - API: `https://string-db.org/api/json/`
   - No API key required
   - Rate limit: ~1000 req/day (implement aggressive caching)

2. **`packages/mcp-pubchem/`** - Chemical structures and properties
   - Tools: `get_compound_properties`, `get_chemical_structure`, `search_similar_compounds`
   - API: `https://pubchem.ncbi.nlm.nih.gov/rest/pug`
   - No API key (include NCBI email in headers)
   - Rate limit: 5 req/sec

3. **`packages/mcp-pathways/`** - Reactome biological pathways
   - Tools: `get_gene_pathways`, `get_pathway_details`, `get_pathway_participants`
   - API: `https://reactome.org/ContentService`
   - No API key required
   - No strict rate limits

Each package follows the MCP server pattern with TypeScript, Zod schemas, and error handling consistent with existing packages.

### Frontend Integration

Modify existing components to fetch real data:

1. **API Client Library** (`entropy_front/src/lib/api.ts`)
   - Create typed API client using Fetch API
   - Centralize base URL configuration
   - Handle authentication headers (future)
   - Implement request/response interceptors for logging

2. **React Query Setup** (`entropy_front/src/main.jsx`)
   - Install `@tanstack/react-query`
   - Configure QueryClient with default staleTime, retry logic
   - Add QueryClientProvider wrapper
   - Add React Query DevTools in development

3. **Component Connections**
   - `DendrogramView`: Use `useQuery(['targets', disease])` hook, replace `MOCK_TARGETS`
   - `NetworkView`: NEW component using Cytoscape.js library, fetches `/network/:gene`
   - `DocumentsView`: Replace `MOCK_DOCUMENTS` with `/papers` query
   - `SafetyVisualization`: Replace `MOCK_SAFETY` with `/safety/:drug` query
   - `TimelineView`: NEW component, fetches `/timeline`
   - All components: Add loading skeletons, error states, empty states

4. **Network Visualization Library**
   - Decision: Use **Cytoscape.js** (industry standard for biological networks)
   - Alternative considered: React Flow (modern but less bio-specific)
   - Install `cytoscape`, `react-cytoscapejs`
   - Implement zoom, pan, node selection, edge tooltips
   - Color-code edges by confidence: green (>0.7), yellow (0.4-0.7), gray (<0.4)

### Data Models

Define TypeScript interfaces for API responses (no specific file paths, but these interfaces will be shared):

```typescript
interface Target {
  gene: string;
  ensemblId: string;
  score: number;
  evidenceCount: number;
  topEvidence: string[];
}

interface NetworkNode {
  id: string;
  label: string;
  type: "query_protein" | "interaction_partner";
  uniprotId?: string;
}

interface NetworkEdge {
  source: string;
  target: string;
  score: number;
  confidence: "high" | "medium" | "low";
  evidenceTypes: string[];
}

interface Paper {
  id: string;
  title: string;
  authors: string[];
  journal: string;
  date: string;
  source: string;
  abstract: string;
  meshTerms: string[];
  aiSummary: {
    text: string;
    highlightedEntities: string[];
  };
  url: string;
}

interface OrganSafety {
  severity: "green" | "amber" | "red" | "gray";
  eventCount: number;
  topEvents: string[];
}
```

### LLM Integration for Summaries

- Use existing Mastra Librarian Agent to generate paper summaries
- Prompt template: "Summarize this abstract in 2-3 sentences, focusing on findings and implications: {abstract}"
- Extract entities from summary using simple regex (genes: /\b[A-Z]{3,6}\b/, drugs: /\b[a-z]+(-[a-z]+)?\b/)
- Run summarization async to avoid blocking UI
- Show "Generating summary..." placeholder with spinner
- Cache summaries in memory with paper ID as key

### MedDRA SOC Mapping Table

Create static JSON file for adverse event to organ mapping:

```json
{
  "Cardiac disorders": "cardiovascular",
  "Vascular disorders": "cardiovascular",
  "Hepatobiliary disorders": "liver",
  "Respiratory, thoracic and mediastinal disorders": "respiratory",
  "Nervous system disorders": "nervousSystem",
  "Endocrine disorders": "endocrine",
  "Musculoskeletal and connective tissue disorders": "muscle",
  "Renal and urinary disorders": "kidney"
}
```

Store this in API layer, not frontend (single source of truth).

### Performance Optimizations

- Implement request batching: Fetch multiple genes in single STRING DB call
- Use React.memo() for expensive components (SVG dendrogram, network graph)
- Implement virtual scrolling for large paper lists (use `react-window`)
- Debounce search inputs (300ms delay)
- Lazy load timeline and grid views (code splitting)
- Optimize SVG rendering: Use CSS transforms instead of re-rendering paths
- Add service worker for offline caching of static assets (future)

---

## Testing Decisions

### What Makes a Good Test

Tests should verify **external behavior**, not implementation details. Focus on:

- API response formats match expected interfaces
- Frontend components render correctly with various data states (loading, error, success, empty)
- User interactions trigger correct API calls
- Error states are handled gracefully
- Network graph interactions work (zoom, pan, click)

Do NOT test:

- Internal React state management
- Specific CSS class names
- Implementation of LRU cache (test API response times instead)
- Mocked API responses that don't match reality

### Modules to Test

1. **API Endpoints** (`apps/api/src/routes/causaly.ts`)
   - Unit tests: Mock MCP tools, verify response transformation
   - Integration tests: Hit real APIs (rate-limited, use fixtures)
   - Prior art: Existing tests in `apps/api/src/routes/__tests__/`

2. **MCP Packages** (`packages/mcp-string/`, `mcp-pubchem/`, `mcp-pathways/`)
   - Unit tests: Mock HTTP responses, verify tool output formats
   - Integration tests: Hit real APIs with known inputs, snapshot responses
   - Prior art: Existing tests in `packages/mcp-biology/src/__tests__/`

3. **Frontend Components** (`entropy_front/src/`)
   - Component tests: Render with mock data, verify UI elements exist
   - Interaction tests: Simulate clicks, verify callbacks fired
   - Visual regression tests: Screenshot comparisons (future)
   - Prior art: Would be first tests in entropy_front/ (follow React Testing Library patterns)

4. **API Client Library** (`entropy_front/src/lib/api.ts`)
   - Unit tests: Mock fetch, verify request headers/body
   - Error handling tests: Simulate network failures, timeouts
   - Prior art: None yet (new module)

### Testing Infrastructure

- **Backend**: Use existing Vitest setup in monorepo
- **Frontend**: Install Vitest + React Testing Library + jsdom
- **E2E Tests**: Consider Playwright for critical user flows (Phase 2)
- **API Mocking**: Use MSW (Mock Service Worker) for frontend tests
- **CI**: Run tests on every PR, fail if coverage drops below 70%

### Test Priority

1. **Critical Path** (must have 90%+ coverage):
   - API endpoint response formats
   - MCP tool error handling
   - Network graph rendering with valid data

2. **High Priority** (80%+ coverage):
   - Frontend data fetching hooks
   - API client error handling
   - LLM summarization pipeline

3. **Medium Priority** (60%+ coverage):
   - UI interactions (clicks, hovers)
   - Loading/error states

4. **Low Priority** (nice to have):
   - Visual styling
   - Animation timing

---

## Out of Scope

The following are explicitly **NOT** part of this PRD:

- **User authentication and accounts** - No login system, single-user demo mode
- **Workspace persistence** - No saving queries, "Recent Searches" list only
- **Document upload** - No internal PDF ingestion (separate "NotebookLM pivot" feature)
- **Neo4j knowledge graph** - Not needed for Causaly-style UI (uses APIs directly)
- **AI agent workflows** - Existing Mastra research pipeline remains separate
- **Report generation** - No LaTeX/PDF exports (may add simple markdown export later)
- **Collaboration features** - No comments, annotations, or sharing
- **Mobile native apps** - Web-responsive only, no iOS/Android apps
- **Real-time collaboration** - No WebSocket sync between users
- **Admin dashboard** - No user management, usage analytics, or billing
- **Multi-language support** - English-only interface
- **Accessibility WCAG AAA** - Aim for AA compliance, AAA is stretch goal
- **AlphaFold 3D structures** - Future enhancement, not MVP
- **COSMIC mutation data** - Future enhancement for cancer research
- **Drug-drug interaction checker** - Already exists in mcp-safety, not surfaced in UI yet
- **Comparative analysis** - No side-by-side comparison of drugs/targets (future)

---

## Further Notes

### Critical Dependencies

All required APIs are **free and public**—no API keys needed for MVP:

- Open Targets Platform (GraphQL, no key)
- PubMed E-utilities (no key, but NCBI email recommended)
- STRING DB (no key, rate-limited to ~1000 req/day)
- PubChem (no key, 5 req/sec limit)
- Reactome (no key, no limits)
- OpenFDA (no key, no strict limits)

Only existing dependency: **Google Gemini API key** for LLM summarization (already configured).

### Phased Rollout Recommendation

**Phase 1 (Days 1-4)**: Core features with existing tools

- Connect Dendrogram, Documents, Safety views to real APIs
- Add LLM summarization for papers
- Deliverable: 3/5 UI tabs functional

**Phase 2 (Days 5-7)**: STRING DB integration

- Create mcp-string package
- Build Network View with Cytoscape.js
- Deliverable: Network visualization working

**Phase 3 (Days 8-9)**: Chemical & pathway data

- Create mcp-pubchem and mcp-pathways packages
- Enhance drug cards and network overlays
- Deliverable: Rich data integrations

**Phase 4 (Days 10-11)**: Timeline & polish

- Build Timeline View
- Performance optimizations (caching, virtual scrolling)
- Error handling and loading states
- Deliverable: Production-ready UI

**Total Estimate**: 10-11 days for complete platform

### Known Technical Risks

1. **STRING DB rate limits** (HIGH probability, HIGH impact)
   - Mitigation: Aggressive 7-day caching, request batching, consider paid tier if needed

2. **Open Targets GraphQL performance** (HIGH probability, MEDIUM impact)
   - Some queries take 5-10s for large disease sets
   - Mitigation: 24-hour caching, paginate results, show loading skeleton

3. **Network rendering performance** (MEDIUM probability, MEDIUM impact)
   - 100+ node graphs may lag on low-end machines
   - Mitigation: Limit initial nodes to 25, use Cytoscape.js performance mode, add "expand network" button

4. **LLM summarization latency** (MEDIUM probability, LOW impact)
   - 5-10s per paper with Gemini
   - Mitigation: Generate async, show "Generating..." state, cache forever

5. **Browser compatibility** (LOW probability, LOW impact)
   - Older Safari versions may not support Cytoscape.js
   - Mitigation: Document supported browsers (Chrome 100+, Firefox 100+, Safari 15+)

### Future Enhancements (Post-MVP)

1. **Workspace persistence** - Save queries, build "notebooks" (aligns with NotebookLM pivot)
2. **Export features** - PNG/SVG for networks, CSV for target lists, PDF reports
3. **AlphaFold integration** - 3D protein structures in sidebar on protein click
4. **COSMIC mutations** - Overlay cancer-relevant mutations on networks
5. **Multi-target comparison** - Side-by-side dendrogram comparison
6. **Collaboration** - Share specific visualizations via URL, add comments
7. **Advanced filtering** - Filter networks by pathway, disease, tissue expression
8. **Europe PMC integration** - Full-text search, citation graphs
9. **BioGRID integration** - Complement STRING with curated interactions
10. **Real-time updates** - WebSocket notifications when new papers match saved queries

### Success Metrics

**Technical Metrics**:

- API response time <2s (95th percentile)
- Frontend First Contentful Paint <3s
- Network graph renders 50 nodes in <3s
- Lighthouse accessibility score >90

**Functional Metrics**:

- All 5 view tabs functional with real data
- Zero mock data in production
- Accurate entity extraction (>80% precision)
- Graceful error handling (no blank screens)

**User Experience** (Beta Testing):

- Users complete "find targets for disease" in <2 min
- Users visualize PPI network in <3 clicks
- 3+ pharma researchers provide positive feedback
- Users understand safety visualization without training

### Deployment Plan

**Environment**: Docker Compose for local development

- Frontend: Vite dev server on port 5174
- API: Hono server on port 3001
- PostgreSQL: Port 5432 (existing audit trail)
- Redis: Port 6379 (optional, for caching)

**Production**: Future consideration

- Frontend: Vercel or Netlify (static build)
- API: Railway or Render (container deployment)
- Database: Existing PostgreSQL instance
- CDN: Cloudflare for static assets

### Documentation Requirements

- **API Documentation**: OpenAPI/Swagger spec for `/api/causaly/*` endpoints
- **Component Documentation**: Storybook for React components (optional)
- **User Guide**: Markdown guide in `/docs` explaining each view
- **Developer Setup**: README with clear "Getting Started" steps
- **Architecture Diagram**: Visual diagram showing data flow from APIs → MCP → API layer → Frontend

### Open Questions Requiring User Input

1. **Network library final decision**: Cytoscape.js (recommended) or React Flow?
2. **Phase priority**: All 4 phases (10-11 days) or MVP only (Phases 1-2, 6-7 days)?
3. **Testing priority**: 90% coverage from start, or add tests iteratively?
4. **Deployment target**: Docker Compose local only, or cloud deployment needed?

---

**Next Steps**: Await approval and answers to open questions, then begin Phase 1 implementation.
