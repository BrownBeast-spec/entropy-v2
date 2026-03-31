# Current Platforms & Services in Entropy v2

**Last Updated**: 2026-03-30  
**Status**: Production

---

## 🎯 Overview

Entropy v2 currently integrates with **9 external biomedical data platforms** through Model Context Protocol (MCP) packages, plus internal infrastructure services.

---

## 🧬 Biomedical Data Sources (External APIs)

### 1. **Open Targets Platform**

- **Purpose**: Disease-target associations, drug information, genetic evidence
- **API Type**: GraphQL
- **Base URL**: `https://api.platform.opentargets.org/api/v4/graphql`
- **Authentication**: None (public API)
- **Rate Limits**: None officially documented
- **MCP Package**: `packages/mcp-biology/`
- **Key Tools**:
  - `validate_target` - Gene → disease associations
  - `get_drug_info` - ChEMBL drug data
  - `get_disease_info` - EFO disease data

**Data Retrieved**:

- Gene-disease association scores
- Evidence types (genetics, literature, animal models)
- Drug clinical phases and disease indications

---

### 2. **UniProt (Universal Protein Resource)**

- **Purpose**: Protein sequence, function, and annotation data
- **API Type**: REST
- **Base URL**: `https://rest.uniprot.org/uniprotkb`
- **Authentication**: None
- **Rate Limits**: 429 status with Retry-After header
- **MCP Package**: `packages/mcp-biology/`
- **Key Tools**:
  - `get_protein_data` - Protein info by accession
  - `search_proteins` - Search by gene/organism
  - `get_protein_interactions` - Interaction data

**Data Retrieved**:

- Protein name, gene symbol, organism
- Amino acid sequence length
- Function descriptions
- Catalytic activity, subcellular location

---

### 3. **Ensembl**

- **Purpose**: Genomic data, gene coordinates, variations, homology
- **API Type**: REST
- **Base URL**: `https://rest.ensembl.org`
- **Authentication**: None
- **Rate Limits**: 15 requests/sec per IP
- **MCP Package**: `packages/mcp-biology/`
- **Key Tools**:
  - `get_gene_info` - Gene lookup by symbol
  - `get_sequence` - Genomic sequences (500bp limit)
  - `get_variation` - SNP/variant data
  - `get_homology` - Orthologs/paralogs
  - `get_xrefs` - Cross-database references

**Data Retrieved**:

- Ensembl gene IDs, biotypes, chromosomal coordinates
- Variation consequences and allele frequencies
- Homology relationships across species

---

### 4. **NCBI Gene & Protein**

- **Purpose**: Gene information, protein sequences
- **API Type**: REST (E-utilities)
- **Base URLs**:
  - Gene: `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/`
  - Protein: Same E-utilities endpoints
- **Authentication**: Optional (NCBI API key + email recommended)
- **Rate Limits**:
  - Without key: 3 req/sec
  - With key: 10 req/sec
- **MCP Package**: `packages/mcp-biology/`
- **Key Tools**:
  - `get_ncbi_gene_info` - Gene symbol → ID + description
  - `get_ncbi_protein_info` - Protein accession data

**Data Retrieved**:

- Gene IDs, official symbols, descriptions
- Protein sequences and metadata

---

### 5. **PubMed (NCBI Literature Database)**

- **Purpose**: Biomedical literature search and retrieval
- **API Type**: REST (E-utilities XML)
- **Base URLs**:
  - Search: `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi`
  - Fetch: `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi`
- **Authentication**: Optional (NCBI API key + email)
- **Rate Limits**: Same as NCBI Gene (3/sec without key, 10/sec with key)
- **MCP Package**: `packages/mcp-clinical/`
- **Key Tools**:
  - `search_literature` - Search papers by topic/disease/year
  - `search_preprints` - bioRxiv/medRxiv preprints
  - `get_abstract` - Fetch abstract by PMID
  - `get_paper_metadata` - Full metadata (authors, journal, MeSH)

**Data Retrieved**:

- Paper titles, abstracts, PMIDs
- Authors, journal names, publication dates
- MeSH terms (Medical Subject Headings)
- Structured abstracts (Background, Methods, Results, Conclusions)

---

### 6. **ClinicalTrials.gov**

- **Purpose**: Clinical trial data, study designs, eligibility criteria
- **API Type**: REST (JSON)
- **Base URL**: `https://clinicaltrials.gov/api/v2/` (assumed based on patterns)
- **Authentication**: None
- **Rate Limits**: Unspecified (conservative usage recommended)
- **MCP Package**: `packages/mcp-clinical/`
- **Key Tools**:
  - `search_studies` - Search trials by term
  - `get_study_details` - Full trial data by NCT ID
  - `get_eligibility_criteria` - Inclusion/exclusion criteria

**Data Retrieved**:

- NCT IDs, trial titles, statuses (recruiting, completed, etc.)
- Study phases (Phase 1/2/3/4)
- Intervention types, outcome measures
- Eligibility criteria, locations, sponsors
- Start dates, completion dates

---

### 7. **OpenFDA (U.S. Food & Drug Administration)**

- **Purpose**: Drug safety, adverse events, labeling, recalls
- **API Type**: REST (JSON)
- **Base URL**: `https://api.fda.gov`
- **Authentication**: Optional (API key increases rate limits)
- **Rate Limits**:
  - Without key: 240 req/min, 1000 req/day
  - With key: 240 req/min, 120,000 req/day
- **MCP Package**: `packages/mcp-safety/`
- **Key Tools**:
  - `check_drug_safety` - Labels, warnings, contraindications
  - `check_adverse_events` - FAERS adverse reactions
  - `check_recalls` - FDA enforcement actions
  - `get_ndc_info` - National Drug Code directory
  - `search_drugs_fda` - Approved drug products
  - `get_drug_shortages` - Supply chain data

**Data Retrieved**:

- Drug labels (boxed warnings, indications, contraindications)
- Adverse event reports from FAERS (MedDRA terms, frequency)
- FDA enforcement actions (recalls, market withdrawals)
- NDC codes, dosage forms, manufacturers
- Drug shortage alerts

---

### 8. **RxNav (NIH Drug Information)**

- **Purpose**: Drug interaction data, RxNorm terminology
- **API Type**: REST (JSON)
- **Base URL**: `https://rxnav.nlm.nih.gov/REST`
- **Authentication**: None
- **Rate Limits**: Unspecified (conservative usage)
- **MCP Package**: `packages/mcp-safety/`
- **Key Tools**:
  - `get_drug_interactions` - Drug-drug interactions by RxCUI or name

**Data Retrieved**:

- RxCUI (RxNorm Concept Unique Identifiers)
- Drug interaction descriptions from FDA labels
- Severity levels of interactions

---

### 9. **bioRxiv / medRxiv (Preprint Servers)**

- **Purpose**: Preprint publications (non-peer-reviewed)
- **API Type**: REST (accessed via PubMed Central tools)
- **Base URL**: Integrated through NCBI E-utilities
- **Authentication**: None
- **Rate Limits**: Same as PubMed
- **MCP Package**: `packages/mcp-clinical/`
- **Key Tools**:
  - `search_preprints` - Search preprints by topic

**Data Retrieved**:

- Preprint titles, abstracts, DOIs
- Authors, submission dates
- bioRxiv/medRxiv identifiers

---

## 🖥️ Infrastructure Services (Internal)

### 10. **PostgreSQL**

- **Purpose**: Audit trail, session storage, provenance tracking
- **Version**: 16-alpine (Docker)
- **Connection**: `postgresql://entropy:entropy@localhost:5432/entropy`
- **Port**: 5432
- **Package**: `packages/audit/`
- **Usage**: Stores LLM prompts, agent outputs, session states, timestamps

---

### 11. **Hono API Server**

- **Purpose**: REST API gateway exposing research pipeline
- **Framework**: Hono.js (lightweight TypeScript framework)
- **Port**: 3001
- **Location**: `apps/api/`
- **Endpoints**:
  - `POST /api/research` - Start research session
  - `GET /api/research/:sessionId` - Get session status
  - `GET /api/research/:sessionId/agents` - Per-agent status
  - `POST /api/research/:sessionId/review` - HITL review decision
  - `GET /api/research/:sessionId/report` - Download report

---

### 12. **Mastra Agent Framework**

- **Purpose**: Orchestrate LLM agents for research workflows
- **Location**: `apps/mastra-app/`
- **Agents**:
  - Planner (PICO decomposition)
  - Biologist (Open Targets, UniProt, Ensembl)
  - Clinical Scout (ClinicalTrials.gov, PubMed)
  - Hawk (OpenFDA safety)
  - Librarian (PubMed literature)
  - Gap Analyst (TPP checklist)
  - Verifier (fact-checking)

---

## 🤖 LLM Providers (Configurable)

Entropy supports multiple LLM providers via environment variables:

1. **Google Gemini** (default)
   - API Key: `GOOGLE_GENERATIVE_AI_API_KEY`
   - Models: `gemini-2.5-flash`, `gemini-2.0-flash-exp`

2. **OpenAI** (optional)
   - API Key: `OPENAI_API_KEY`
   - Models: `gpt-4o`, `gpt-4o-mini`

3. **Anthropic** (optional)
   - API Key: `ANTHROPIC_API_KEY`
   - Models: `claude-sonnet-4-20250514`

4. **Perplexity** (optional)
   - Configured via Mastra framework

5. **Hugging Face** (optional)
   - API Key: `HUGGINGFACE_API_KEY`

6. **OpenRouter** (optional)
   - API Key: `OPENROUTER_API_KEY`

---

## 📊 Summary Table

| Platform               | Type       | Auth Required | Rate Limits          | MCP Package  | Key Data                    |
| ---------------------- | ---------- | ------------- | -------------------- | ------------ | --------------------------- |
| **Open Targets**       | GraphQL    | No            | None                 | mcp-biology  | Disease-target associations |
| **UniProt**            | REST       | No            | Soft (429)           | mcp-biology  | Protein functions           |
| **Ensembl**            | REST       | No            | 15 req/sec           | mcp-biology  | Genomic data                |
| **NCBI Gene/Protein**  | REST       | Optional      | 3-10 req/sec         | mcp-biology  | Gene info                   |
| **PubMed**             | REST (XML) | Optional      | 3-10 req/sec         | mcp-clinical | Literature                  |
| **ClinicalTrials.gov** | REST       | No            | Unspecified          | mcp-clinical | Clinical trials             |
| **OpenFDA**            | REST       | Optional      | 240/min, 1k-120k/day | mcp-safety   | Adverse events              |
| **RxNav**              | REST       | No            | Unspecified          | mcp-safety   | Drug interactions           |
| **bioRxiv/medRxiv**    | REST       | No            | 3-10 req/sec         | mcp-clinical | Preprints                   |
| **PostgreSQL**         | Database   | Local         | N/A                  | audit        | Provenance                  |
| **LLMs**               | API        | Yes (keys)    | Varies               | mastra       | Reasoning                   |

---

## 🚀 Planned Additions (Per PRD)

The following platforms will be added for the Causaly-style UI:

1. **STRING DB** (CRITICAL - Phase 2)
   - Protein-protein interaction networks
   - URL: `https://string-db.org/api`
   - No auth required, ~1000 req/day limit

2. **PubChem** (HIGH - Phase 3)
   - Chemical structures, molecular properties
   - URL: `https://pubchem.ncbi.nlm.nih.gov/rest/pug`
   - No auth, 5 req/sec limit

3. **Reactome** (HIGH - Phase 3)
   - Biological pathway annotations
   - URL: `https://reactome.org/ContentService`
   - No auth, no strict limits

---

## 🔑 API Keys Required

**Currently Required**:

- `GOOGLE_GENERATIVE_AI_API_KEY` (for LLM agents)

**Recommended (improve rate limits)**:

- `NCBI_API_KEY` + `NCBI_EMAIL` (10x rate limit increase)
- `OPENFDA_API_KEY` (120x daily limit increase)

**Optional (multi-LLM support)**:

- `OPENAI_API_KEY`
- `ANTHROPIC_API_KEY`
- `HUGGINGFACE_API_KEY`
- `OPENROUTER_API_KEY`

---

## 📝 Notes

- All biomedical APIs are **public and free** (no subscription costs)
- Rate limits are generous for research use cases
- MCP packages handle retries, rate limiting (429 responses), and error handling
- PostgreSQL is the only self-hosted dependency (runs in Docker)
- No proprietary/licensed databases required
- All APIs provide JSON responses (except PubMed which uses XML, parsed internally)

---

**See also**:

- [PRD: Causaly-Style UI](./prd-causaly-ui.md)
- [Architecture Documentation](../entropy_architecture.md)
- [Product Vision](../product-plan.md)
