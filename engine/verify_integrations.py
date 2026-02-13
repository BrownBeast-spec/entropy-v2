import asyncio
import logging
from mastra.agents.pubchem import PubChemAgent
from mastra.agents.ensembl import EnsemblAgent
from mastra.agents.openfda import OpenFDAAgent
from mastra.agents.pubmed import PubMedAgent

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def verify_chemist():
    logger.info("--- Verifying PubChem Agent ---")
    agent = PubChemAgent()
    try:
        # PubChem
        logger.info("1. PubChem: Searching for Aspirin...")
        props = await agent.get_compound_props("Aspirin")
        logger.info(f"PubChem Props: {props.get('properties', {}).get('formula')}")
        
        # ChEMBL
        logger.info("2. ChEMBL: Searching for Imatinib...")
        chembl = await agent.search_chembl("Imatinib")
        logger.info(f"ChEMBL Found: {chembl.get('found')} molecules")
    except Exception as e:
        logger.error(f"Chemist Failed: {e}")
    finally:
        await agent.close()

async def verify_geneticist():
    logger.info("\n--- Verifying Ensembl Agent ---")
    agent = EnsemblAgent()
    try:
        # Info
        logger.info("1. Gene Info: Searching for BRCA1...")
        info = await agent.get_gene_info("BRCA1")
        gene_id = info.get("id")
        logger.info(f"Gene ID: {gene_id}")
        
        if gene_id:
            # Sequence
            logger.info(f"2. Sequence: Fetching for {gene_id}...")
            seq = await agent.get_sequence(gene_id)
            logger.info(f"Sequence Length: {len(seq.get('sequence', ''))}")
    except Exception as e:
        logger.error(f"Geneticist Failed: {e}")
    finally:
        await agent.close()

async def verify_hawk_extras():
    logger.info("\n--- Verifying OpenFDA Extras ---")
    agent = OpenFDAAgent()
    try:
        # Adverse Events
        logger.info("1. Adverse Events: Tylenol...")
        events = await agent.get_adverse_events("Tylenol", limit=5)
        logger.info(f"Top Reactions: {events.get('top_reactions')}")
        
        # Recalls
        logger.info("2. Recalls: Tylenol...")
        recalls = await agent.get_recalls("Tylenol")
        logger.info(f"Recalls Found: {recalls.get('found')}")
    except Exception as e:
        logger.error(f"Hawk Failed: {e}")
    finally:
        await agent.close()

async def verify_librarian_extras():
    logger.info("\n--- Verifying PubMed Extras ---")
    agent = PubMedAgent()
    try:
        # Preprints
        logger.info("1. Preprints: Searching medRxiv for 'Diabetes'...")
        preprints = await agent.get_preprints("Diabetes", server="medrxiv", days=10)
        logger.info(f"Preprints Scanned: {preprints.get('total_scanned')}")
        logger.info(f"Matches Found: {preprints.get('matched')}")
        if preprints.get("top_papers"):
             logger.info(f"First Match: {preprints['top_papers'][0]['title']}")
    except Exception as e:
        logger.error(f"Librarian Failed: {e}")
    finally:
        await agent.close()

async def main():
    await verify_chemist()
    await verify_geneticist()
    await verify_hawk_extras()
    await verify_librarian_extras()

if __name__ == "__main__":
    asyncio.run(main())
