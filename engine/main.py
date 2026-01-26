from fastapi import FastAPI, Query, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Any, Dict
from core.clinical_trials import ClinicalTrialsV2
from agents.hawk import HawkAgent
from agents.biologist import BiologistAgent
from agents.librarian import LibrarianAgent
import uvicorn
import logging
from contextlib import asynccontextmanager

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Global clients
ct_client = None
hawk_agent = None
biologist_agent = None
librarian_agent = None

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
    global ct_client, hawk_agent, biologist_agent, librarian_agent
    logger.info("Initializing ClinicalTrialsV2 client...")
    ct_client = ClinicalTrialsV2()
    
    logger.info("Initializing HawkAgent...")
    hawk_agent = HawkAgent()
    
    logger.info("Initializing BiologistAgent...")
    biologist_agent = BiologistAgent()
    
    logger.info("Initializing LibrarianAgent...")
    librarian_agent = LibrarianAgent()
    
    yield
    # Shutdown
    logger.info("Closing clients...")
    if ct_client:
        await ct_client.close()
    if hawk_agent:
        await hawk_agent.close()
    if biologist_agent:
        await biologist_agent.close()
    if librarian_agent:
        await librarian_agent.close()

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
    Check drug safety using OpenFDA (Async).
    """
    if not hawk_agent:
        return {"error": "HawkAgent not initialized"}
    return await hawk_agent.check_safety(drug)

@app.get("/validate", response_model=BiologistResponse | ErrorResponse)
async def validate_target(gene: str = Query(..., description="Gene symbol (e.g., EGFR)")):
    """
    Validate target using Open Targets (GraphQL) and UniProt.
    Returns comprehensive target analysis including pathways.
    """
    if not biologist_agent:
        return {"error": "BiologistAgent not initialized"}
    return await biologist_agent.validate_target(gene)

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
    if not librarian_agent:
        return {"error": "LibrarianAgent not initialized"}
    return await librarian_agent.search_literature(term, year, limit)

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
