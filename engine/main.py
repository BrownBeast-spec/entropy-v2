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

@app.get("/validate", response_model=BiologistResponse | ErrorResponse)
async def validate_target(gene: str = Query(..., description="Gene symbol (e.g., EGFR)")):
    """
    Validate target using Open Targets (GraphQL) and UniProt.
    Returns comprehensive target analysis including pathways.
    """
    if not opentargets_agent:
        return {"error": "OpenTargetsAgent not initialized"}
    return await opentargets_agent.validate_target(gene)

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
