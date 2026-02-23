# Entropy Engine

Entropy Engine is a multi-agent system designed to automate biomedical research tasks. It aggregates data from multiple authoritative sources including ClinicalTrials.gov, OpenFDA, Open Targets, UniProt, PubChem, Ensembl, and PubMed to provide comprehensive insights into drugs, genes, proteins, variants, and scientific literature.

## Architecture

The system follows a **Co-Scientist architecture** with specialized agents, each focused on specific data domains:

- **OpenFDAAgent** (Regulatory Scout) - Drug safety, recalls, approvals, shortages
- **OpenTargetsAgent** (Biologist) - Target validation, drug MoA, disease associations, NCBI data
- **PubChemAgent** (Chemist) - Compound properties, bioassays, chemical structures
- **EnsemblAgent** (Genomic Specialist) - Gene sequences, variations, homology, cross-references
- **PubMedAgent** (Librarian) - Scientific literature and preprints

### Key Features

- **Rate-Limited API Calls** - Respects all API provider limits  
- **Multi-Source Integration** - Aggregates data from 8+ databases  
- **26 API Endpoints** - Comprehensive biomedical data access  
- **Graceful Error Handling** - Robust fallback mechanisms  
- **Clean Architecture** - Separation of concerns (Literature vs. Biology)

## Getting Started

Follow these steps to set up and run the engine locally.

### Prerequisites

- Python 3.10 or higher
- `pip` package manager

### Installation

1. Navigate to the `engine` directory.
2. Create a virtual environment:
   ```bash
   python3 -m venv venv
   ```
3. Activate the virtual environment:
   ```bash
   source venv/bin/activate
   ```
4. Install the dependencies:
   ```bash
   pip install fastapi uvicorn httpx tenacity pydantic markdownify
   ```

### Environment Variables (Optional)

Create a `.env` file in the `engine/` directory:

```bash
# NCBI E-utilities (PubMed, Gene, Protein)
NCBI_EMAIL=your.email@example.com
NCBI_API_KEY=your_ncbi_api_key  # Optional, increases rate limit

# OpenFDA
OPENFDA_API_KEY=your_openfda_key  # Optional, increases rate limit
```

### Running the Engine

To start the server, ensure you are in the project root directory and the virtual environment is active.

1. Set the python path to the current directory:
   ```bash
   export PYTHONPATH=$PWD
   ```
2. Run the main application:
   ```bash
   python3 engine/main.py
   ```

The server will start listening on `http://0.0.0.0:8000`.

## API Documentation

The engine exposes 26 endpoints organized by agent functionality. All endpoints return JSON responses.

**Base URL**: `http://localhost:8000`  
**Interactive Docs**: `http://localhost:8000/docs` (FastAPI Swagger UI)

---

### System Health

#### Health Check
- **Endpoint**: `GET /`
- **Purpose**: Verify server status
- **Output**: `{"message": "Entropy Engine is running"}`

---

### Clinical Trials

#### Search Clinical Trials
- **Endpoint**: `GET /search`
- **Parameters**:
  - `term` (required): Search keyword (e.g., "Diabetes")
  - `limit` (optional, default=10): Max results
- **Example**: `/search?term=Cancer&limit=5`
- **Source**: ClinicalTrials.gov

---

### OpenFDA Agent (Regulatory Scout)

**Rate Limit**: 240 requests/minute

#### 1. Drug Safety & Labels
- **Endpoint**: `GET /safety`
- **Parameters**: `drug` (required) - Brand name
- **Example**: `/safety?drug=Keytruda`
- **Returns**: Boxed warnings, contraindications, dosage, indications

#### 2. Adverse Events
- **Endpoint**: `GET /safety/events`
- **Parameters**: 
  - `drug` (required)
  - `limit` (optional, default=10)
- **Example**: `/safety/events?drug=Tylenol&limit=5`
- **Returns**: Top reported adverse reactions

#### 3. Drug Recalls
- **Endpoint**: `GET /safety/recalls`
- **Parameters**: `drug` (required)
- **Example**: `/safety/recalls?drug=Amoxicillin`
- **Returns**: Recent enforcement reports

#### 4. NDC Directory Lookup
- **Endpoint**: `GET /safety/ndc`
- **Parameters**: `ndc` (required) - National Drug Code
- **Example**: `/safety/ndc?ndc=0173-0715`
- **Returns**: Manufacturer, labeler, dosage form, ingredients

#### 5. Drugs@FDA Search
- **Endpoint**: `GET /safety/drugsfda`
- **Parameters**: 
  - `query` (required)
  - `limit` (optional, default=10)
- **Example**: `/safety/drugsfda?query=aspirin`
- **Returns**: FDA approval status, marketing info, sponsor

#### 6. Drug Shortages
- **Endpoint**: `GET /safety/shortages`
- **Parameters**: `drug` (optional)
- **Example**: `/safety/shortages?drug=Amoxicillin`
- **Returns**: Current supply issues, availability status

---

### OpenTargets Agent (Biologist)

**Rate Limit**: 10 requests/second

#### 1. Target Validation
- **Endpoint**: `GET /validate`
- **Parameters**: `gene` (required) - Gene symbol
- **Example**: `/validate?gene=EGFR`
- **Returns**: Cellular locations, pathways, mechanism of action, disease associations
- **Sources**: Open Targets GraphQL + UniProt

#### 2. Drug Information
- **Endpoint**: `GET /drug/info`
- **Parameters**: `drug_id` (required) - ChEMBL ID
- **Example**: `/drug/info?drug_id=CHEMBL1743081`
- **Returns**: Mechanism of action, indications, pharmacovigilance, withdrawal status

#### 3. Disease Information
- **Endpoint**: `GET /disease/info`
- **Parameters**: `disease_id` (required) - EFO ID
- **Example**: `/disease/info?disease_id=EFO_0000685`
- **Returns**: Disease ontology, synonyms, known drugs, associated targets

#### 4. NCBI Gene Data
- **Endpoint**: `GET /biology/gene`
- **Parameters**: `gene` (required) - Gene symbol
- **Example**: `/biology/gene?gene=BRCA1`
- **Returns**: Gene description, chromosome, map location, summary
- **Source**: NCBI Gene database

#### 5. NCBI Protein Data
- **Endpoint**: `GET /biology/protein`
- **Parameters**: `protein_id` (required) - Protein accession
- **Example**: `/biology/protein?protein_id=NP_000483`
- **Returns**: Protein title, sequence info, organism
- **Source**: NCBI Protein database

---

### Ensembl Agent (Genomic Specialist)

**Rate Limit**: 15 requests/second

#### 1. Gene Information
- **Endpoint**: `GET /gene/info`
- **Parameters**: `symbol` (required) - Gene symbol
- **Example**: `/gene/info?symbol=BRCA1`
- **Returns**: Ensembl ID, biotype, genomic location, description

#### 2. Genomic Sequence
- **Endpoint**: `GET /gene/sequence`
- **Parameters**: `id` (required) - Ensembl gene ID
- **Example**: `/gene/sequence?id=ENSG00000012048`
- **Returns**: Genomic sequence (truncated for display)

#### 3. Variation Lookup
- **Endpoint**: `GET /gene/variation`
- **Parameters**: 
  - `variant_id` (required) - rsID
  - `species` (optional, default="human")
- **Example**: `/gene/variation?variant_id=rs56116432`
- **Returns**: Allele frequencies, clinical significance, consequences

#### 4. Homology (Orthologs/Paralogs)
- **Endpoint**: `GET /gene/homology`
- **Parameters**: 
  - `gene_id` (required) - Ensembl gene ID
  - `species` (optional, default="human")
  - `target_species` (optional)
- **Example**: `/gene/homology?gene_id=ENSG00000139618`
- **Returns**: Cross-species homologs with identity/coverage percentages

#### 5. Cross-References
- **Endpoint**: `GET /gene/xrefs`
- **Parameters**: 
  - `gene_id` (required)
  - `species` (optional, default="human")
- **Example**: `/gene/xrefs?gene_id=ENSG00000139618`
- **Returns**: Links to external databases (UniProt, RefSeq, etc.)

---

### PubChem Agent (Chemist)

**Rate Limit**: 5 requests/second

#### 1. Compound by Name
- **Endpoint**: `GET /compound/props`
- **Parameters**: `name` (required)
- **Example**: `/compound/props?name=Aspirin`
- **Returns**: Formula, molecular weight, SMILES, InChIKey

#### 2. Compound by CID
- **Endpoint**: `GET /compound/cid`
- **Parameters**: `cid` (required) - PubChem Compound ID
- **Example**: `/compound/cid?cid=2244`
- **Returns**: IUPAC name, structure, properties

#### 3. Compound by SMILES
- **Endpoint**: `GET /compound/smiles`
- **Parameters**: `smiles` (required) - SMILES string
- **Example**: `/compound/smiles?smiles=CC(=O)OC1=CC=CC=C1C(=O)O`
- **Returns**: Compound properties for matching structure

#### 4. Compound by Formula
- **Endpoint**: `GET /compound/formula`
- **Parameters**: `formula` (required)
- **Example**: `/compound/formula?formula=C9H8O4`
- **Returns**: List of matching CIDs

#### 5. Bioassay Data
- **Endpoint**: `GET /compound/bioassays`
- **Parameters**: 
  - `cid` (required)
  - `limit` (optional, default=5)
- **Example**: `/compound/bioassays?cid=2244&limit=5`
- **Returns**: IC50, Ki values, activity outcomes from screening assays

#### 6. ChEMBL Search
- **Endpoint**: `GET /compound/search`
- **Parameters**: `query` (required)
- **Example**: `/compound/search?query=Imatinib`
- **Returns**: ChEMBL molecules with structures

---

### PubMed Agent (Librarian)

**Rate Limit**: 3 requests/second (10 with API key)

#### 1. Literature Search
- **Endpoint**: `GET /literature`
- **Parameters**: 
  - `term` (required) - Disease or topic
  - `year` (optional, default=2024)
  - `limit` (optional, default=5)
- **Example**: `/literature?term=Glioblastoma&year=2024&limit=3`
- **Returns**: PubMed papers with titles, journals, abstracts, links

#### 2. Preprints Search
- **Endpoint**: `GET /literature/preprints`
- **Parameters**: 
  - `topic` (required)
  - `server` (optional, default="biorxiv") - "biorxiv" or "medrxiv"
  - `days` (optional, default=30)
- **Example**: `/literature/preprints?topic=CRISPR&server=biorxiv&days=7`
- **Returns**: Recent preprints matching topic

---

## Testing

You can test the API using `curl` or any API client like Postman.

**Example 1: NDC Drug Lookup**
```bash
curl "http://localhost:8000/safety/ndc?ndc=0173-0715"
```

**Example 2: Target Validation**
```bash
curl "http://localhost:8000/validate?gene=EGFR"
```

**Example 3: Bioassay Data**
```bash
curl "http://localhost:8000/compound/bioassays?cid=2244&limit=5"
```

**Example 4: Gene Variation**
```bash
curl "http://localhost:8000/gene/variation?variant_id=rs56116432"
```

**Example 5: Literature Search**
```bash
curl "http://localhost:8000/literature?term=Immunotherapy&year=2024&limit=3"
```

**Interactive API Documentation**: Visit `http://localhost:8000/docs` for Swagger UI with all 26 endpoints

---

## Agent Capabilities Summary

| Agent | Primary Focus | Key Methods | Rate Limit | Data Sources |
|-------|---------------|-------------|------------|--------------|
| **OpenFDAAgent** | Regulatory & Safety | `get_drug_safety()`, `get_adverse_events()`, `get_recalls()`, `get_ndc_info()`, `search_drugs_fda()`, `get_drug_shortages()` | 240/min | OpenFDA API |
| **OpenTargetsAgent** | Target Biology | `validate_target()`, `get_drug_info()`, `get_disease_info()`, `get_ncbi_gene_info()`, `get_ncbi_protein_info()` | 10/sec | Open Targets GraphQL, UniProt, NCBI |
| **PubChemAgent** | Chemistry & Bioactivity | `get_compound_properties()`, `get_compound_by_cid()`, `get_compound_by_smiles()`, `get_compound_by_formula()`, `get_bioassays()`, `search_chembl()` | 5/sec | PubChem REST, ChEMBL |
| **EnsemblAgent** | Genomics | `get_gene_info()`, `get_sequence()`, `get_variation()`, `get_homology()`, `get_xrefs()` | 15/sec | Ensembl REST |
| **PubMedAgent** | Literature | `search_literature()`, `get_preprints()` | 3-10/sec | NCBI E-utilities, bioRxiv, medRxiv |

### Feature Highlights
- **26 REST Endpoints** covering 5 agent domains
- **18+ Agent Methods** with comprehensive API integration
- **Rate Limiting** built into all agents for production safety
- **Multi-source Integration**: FDA, Open Targets, PubChem, Ensembl, NCBI, ChEMBL
- **GraphQL Support** for Open Targets complex queries
- **Clean Architecture** with async/await patterns
- **Pydantic Validation** for all API responses

---

## License

This project is open-source and available for research purposes.

For detailed implementation notes and Phase 1 enhancement summary, see [phase1_summary.md](engine/phase1_summary.md).
For a list of technical challenges encountered and resolved during the V2 TypeScript rewrite, see [SOLVED_PROBLEMS.md](SOLVED_PROBLEMS.md).

