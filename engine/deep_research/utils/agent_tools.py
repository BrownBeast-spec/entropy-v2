"""Wrappers for internal agents (Hawk, Librarian) to be used as tools."""

import logging
from typing import Dict, Any, List
from engine.agents.hawk import HawkAgent
from engine.agents.librarian import LibrarianAgent
from engine.deep_research.config import config

logger = logging.getLogger(__name__)

# Initialize agents
hawk_agent = HawkAgent()
librarian_agent = LibrarianAgent()

# Since LibrarianAgent takes params in __init__ but we should respect config
librarian_agent.email = config.ncbi_email
librarian_agent.api_key = config.ncbi_api_key
hawk_agent.api_key = config.openfda_api_key

async def consult_hawk(drug_name: str) -> Dict[str, Any]:
    """
    Consult Hawk Agent for drug safety information.
    
    Args:
        drug_name (str): The brand name of the drug.
        
    Returns:
        Dict: Safety analysis from Hawk Agent.
    """
    try:
        logger.info(f"Consulting Hawk for: {drug_name}")
        # HawkAgent.check_safety expects drug_name
        return await hawk_agent.check_safety(drug_name)
    except Exception as e:
        logger.error(f"Error consulting Hawk: {e}")
        return {"error": str(e)}

async def consult_librarian(disease_or_topic: str, year: int = 2024, limit: int = 5) -> Dict[str, Any]:
    """
    Consult Librarian Agent for medical literature from PubMed.
    
    Args:
        disease_or_topic (str): The disease or topic to search for.
        year (int): Publication year to filter by.
        limit (int): Max papers to retrieve.
        
    Returns:
        Dict: Literature search results from Librarian Agent.
    """
    try:
        logger.info(f"Consulting Librarian for: {disease_or_topic} ({year})")
        return await librarian_agent.search_literature(disease_or_topic, year, limit)
    except Exception as e:
        logger.error(f"Error consulting Librarian: {e}")
        return {"error": str(e)}

async def close_agents():
    """Close connections for all agents."""
    await hawk_agent.close()
    await librarian_agent.close()
