from fastapi import FastAPI, Query, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Any, Dict
from mastra.core.clinical_trials import ClinicalTrialsV2
from mastra.agents.openfda import OpenFDAAgent
from mastra.agents.opentargets import OpenTargetsAgent
from mastra.agents.pubmed import PubMedAgent
from mastra.agents.pubchem import PubChemAgent
from mastra.agents.ensembl import EnsemblAgent
import uvicorn
import logging
from contextlib import asynccontextmanager

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Global clients
ct_client = None
openfda_agent = None
opentargets_agent = None
pubmed_agent = None
pubchem_agent = None
ensembl_agent = None

class BiologistResponse(BaseModel):
    agent: str
    gene_symbol: str
    target_id: Optional[str] = None
    cellular_locations: List[str] = []
    key_pathways: List[str] = []
    all_pathways: List[str] = []
    total_pathways: int = 0
    mechanism_of_action: str = "N/A"
    analysis: str
    top_associations: List[str] = []

class ErrorResponse(BaseModel):
    error: str
    details: Optional[Any] = None

class Paper(BaseModel):
    id: str
    title: str
    journal: str
    pub_date: str
    abstract: Optional[str] = None
    link: str

class LibrarianResponse(BaseModel):
    agent: str
    topic: str
    total_found: int
    top_papers: List[Paper]

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    global ct_client, openfda_agent, opentargets_agent, pubmed_agent, pubchem_agent, ensembl_agent
    logger.info("Initializing ClinicalTrialsV2 client...")
    ct_client = ClinicalTrialsV2()
    
    logger.info("Initializing OpenFDAAgent...")
    openfda_agent = OpenFDAAgent()
    
    logger.info("Initializing OpenTargetsAgent...")
    opentargets_agent = OpenTargetsAgent()
    
    logger.info("Initializing PubMedAgent...")
    pubmed_agent = PubMedAgent()

    logger.info("Initializing PubChemAgent...")
    pubchem_agent = PubChemAgent()

    logger.info("Initializing EnsemblAgent...")
    ensembl_agent = EnsemblAgent()
    
    yield
    # Shutdown
    logger.info("Closing clients...")
    if ct_client:
        await ct_client.close()
    if openfda_agent:
        await openfda_agent.close()
    if opentargets_agent:
        await opentargets_agent.close()
    if pubmed_agent:
        await pubmed_agent.close()
    if pubchem_agent:
        await pubchem_agent.close()
    if ensembl_agent:
        await ensembl_agent.close()

app = FastAPI(lifespan=lifespan)

@app.get("/")
async def root():
    return {"message": "Entropy Engine is running"}

@app.get("/search")
async def search_studies(term: str = Query(..., description="The search term for clinical trials"), limit: int = 10):
    """
    Search for clinical trials by term (Async).
    """
    if not ct_client:
        return {"error": "Client not initialized"}
    return await ct_client.search_studies(term, limit=limit)

@app.get("/safety")
async def check_drug_safety(drug: str = Query(..., description="Brand name of the drug")):
    """
    Check drug safety (Label + Boxed Warning) using OpenFDA (Async).
    """
    if not openfda_agent:
        return {"error": "OpenFDAAgent not initialized"}
    return await openfda_agent.check_safety(drug)

@app.get("/safety/events")
async def check_adverse_events(drug: str = Query(..., description="Drug Name"), limit: int = 10):
    """
    Get top adverse events for a drug (OpenFDA Agent).
    """
    if not openfda_agent:
        return {"error": "OpenFDAAgent not initialized"}
    return await openfda_agent.get_adverse_events(drug, limit)

@app.get("/safety/recalls")
async def check_recalls(drug: str = Query(..., description="Drug Name")):
    """
    Get recent recalls for a drug (OpenFDA Agent).
    """
    if not openfda_agent:
        return {"error": "OpenFDAAgent not initialized"}
    return await openfda_agent.get_recalls(drug)

@app.get("/safety/ndc")
async def get_ndc_info(ndc: str = Query(..., description="National Drug Code (e.g., '0173-0715')")):
    """
    Get NDC Directory information (labeler, dosage form, ingredients).
    """
    if not openfda_agent:
        return {"error": "OpenFDAAgent not initialized"}
    return await openfda_agent.get_ndc_info(ndc)

@app.get("/safety/drugsfda")
async def search_drugs_fda(query: str = Query(..., description="Drug name"), limit: int = 10):
    """
    Search Drugs@FDA database for approved drug products and regulatory history.
    """
    if not openfda_agent:
        return {"error": "OpenFDAAgent not initialized"}
    return await openfda_agent.search_drugs_fda(query, limit)

@app.get("/safety/shortages")
async def get_drug_shortages(drug: Optional[str] = Query(None, description="Drug name (optional)")):
    """
    Get current drug shortage information.
    """
    if not openfda_agent:
        return {"error": "OpenFDAAgent not initialized"}
    return await openfda_agent.get_drug_shortages(drug)

@app.get("/validate", response_model=BiologistResponse | ErrorResponse)
async def validate_target(gene: str = Query(..., description="Gene symbol (e.g., EGFR)")):
    """
    Validate target using Open Targets (GraphQL) and UniProt.
    Returns comprehensive target analysis including pathways.
    """
    if not opentargets_agent:
        return {"error": "OpenTargetsAgent not initialized"}
    return await opentargets_agent.validate_target(gene)

@app.get("/drug/info")
async def get_drug_info(drug_id: str = Query(..., description="ChEMBL Drug ID (e.g., 'CHEMBL1743081')")):
    """
    Get drug information including mechanism of action, indications, and pharmacovigilance.
    """
    if not opentargets_agent:
        return {"error": "OpenTargetsAgent not initialized"}
    return await opentargets_agent.get_drug_info(drug_id)

@app.get("/disease/info")
async def get_disease_info(disease_id: str = Query(..., description="Disease ID (e.g., 'EFO_0000685')")):
    """
    Get disease information including ontology, known drugs, and associated targets.
    """
    if not opentargets_agent:
        return {"error": "OpenTargetsAgent not initialized"}
    return await opentargets_agent.get_disease_info(disease_id)

@app.get("/biology/gene")
async def get_ncbi_gene(gene: str = Query(..., description="Gene Symbol (e.g., 'BRCA1')")):
    """
    Get structured gene information from NCBI Gene database.
    """
    if not opentargets_agent:
        return {"error": "OpenTargetsAgent not initialized"}
    return await opentargets_agent.get_ncbi_gene_info(gene)

@app.get("/biology/protein")
async def get_ncbi_protein(protein_id: str = Query(..., description="Protein Accession (e.g., 'NP_000483')")):
    """
    Get structured protein information from NCBI Protein database.
    """
    if not opentargets_agent:
        return {"error": "OpenTargetsAgent not initialized"}
    return await opentargets_agent.get_ncbi_protein_info(protein_id)

@app.get("/gene/info")
async def get_gene_info(symbol: str = Query(..., description="Gene Symbol")):
    """
    Get Gene Information from Ensembl (Ensembl Agent).
    """
    if not ensembl_agent:
         return {"error": "EnsemblAgent not initialized"}
    return await ensembl_agent.get_gene_info(symbol)

@app.get("/gene/sequence")
async def get_gene_sequence(id: str = Query(..., description="Gene ID (ENSG...)")):
    """
    Get Genomic Sequence from Ensembl (Ensembl Agent).
    """
    if not ensembl_agent:
         return {"error": "EnsemblAgent not initialized"}
    return await ensembl_agent.get_sequence(id)

@app.get("/gene/variation")
async def get_variation(variant_id: str = Query(..., description="Variant ID (e.g., 'rs56116432')"), species: str = "human"):
    """
    Get variation information including population frequencies and consequences.
    """
    if not ensembl_agent:
        return {"error": "EnsemblAgent not initialized"}
    return await ensembl_agent.get_variation(variant_id, species)

@app.get("/gene/homology")
async def get_homology(
    gene_id: str = Query(..., description="Ensembl Gene ID (e.g., 'ENSG00000139618')"),
    species: str = "human",
    target_species: Optional[str] = None
):
    """
    Get homology information (orthologs/paralogs) across species.
    """
    if not ensembl_agent:
        return {"error": "EnsemblAgent not initialized"}
    return await ensembl_agent.get_homology(gene_id, species, target_species)

@app.get("/gene/xrefs")
async def get_xrefs(gene_id: str = Query(..., description="Ensembl Gene ID"), species: str = "human"):
    """
    Get cross-references to external databases.
    """
    if not ensembl_agent:
        return {"error": "EnsemblAgent not initialized"}
    return await ensembl_agent.get_xrefs(gene_id, species)

@app.get("/compound/props")
async def get_compound_props(name: str = Query(..., description="Compound Name")):
    """
    Get Compound Properties from PubChem (PubChem Agent).
    """
    if not pubchem_agent:
        return {"error": "PubChemAgent not initialized"}
    return await pubchem_agent.get_compound_props(name)

@app.get("/compound/search")
async def search_chembl(query: str = Query(..., description="Molecule Name")):
    """
    Search for molecules in ChEMBL (PubChem Agent).
    """
    if not pubchem_agent:
        return {"error": "PubChemAgent not initialized"}
    return await pubchem_agent.search_chembl(query)

@app.get("/compound/cid")
async def get_compound_by_cid(cid: int = Query(..., description="PubChem Compound ID")):
    """
    Get compound properties by CID (PubChem Compound ID).
    """
    if not pubchem_agent:
        return {"error": "PubChemAgent not initialized"}
    return await pubchem_agent.get_compound_by_cid(cid)

@app.get("/compound/smiles")
async def get_compound_by_smiles(smiles: str = Query(..., description="SMILES string")):
    """
    Get compound information by SMILES structure.
    """
    if not pubchem_agent:
        return {"error": "PubChemAgent not initialized"}
    return await pubchem_agent.get_compound_by_smiles(smiles)

@app.get("/compound/formula")
async def get_compound_by_formula(formula: str = Query(..., description="Molecular formula (e.g., 'C9H8O4')")):
    """
    Search compounds by molecular formula.
    """
    if not pubchem_agent:
        return {"error": "PubChemAgent not initialized"}
    return await pubchem_agent.get_compound_by_formula(formula)

@app.get("/compound/bioassays")
async def get_bioassays(cid: int = Query(..., description="PubChem Compound ID"), limit: int = 5):
    """
    Get bioassay data (IC50, Ki, activity) for a compound - critical for drug discovery.
    """
    if not pubchem_agent:
        return {"error": "PubChemAgent not initialized"}
    return await pubchem_agent.get_bioassays(cid, limit)

@app.get("/literature", response_model=LibrarianResponse | ErrorResponse)
async def search_literature(
    term: str = Query(..., description="Disease or Topic (e.g., Glioblastoma)"), 
    year: int = Query(2024, description="Publication Year"),
    limit: int = 5
):
    """
    Search PubMed for scientific papers (Async).
    Returns formatted list of papers with direct links.
    """
    if not pubmed_agent:
        return {"error": "PubMedAgent not initialized"}
    return await pubmed_agent.search_literature(term, year, limit)

@app.get("/literature/preprints")
async def search_preprints(
    topic: str = Query(..., description="Topic"),
    server: str = Query("biorxiv", description="biorxiv or medrxiv"),
    days: int = 30
):
    """
    Search recent preprints on bioRxiv/medRxiv.
    """
    if not pubmed_agent:
        return {"error": "PubMedAgent not initialized"}
    return await pubmed_agent.get_preprints(topic, server, days)

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
