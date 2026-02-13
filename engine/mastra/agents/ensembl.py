import httpx
import logging
from typing import Dict, Any, Optional, List

# Configure logging
logger = logging.getLogger(__name__)

class EnsemblAgent:
    def __init__(self):
        self.base_url = "https://rest.ensembl.org"
        self.client = httpx.AsyncClient(timeout=30.0)

    async def close(self):
        """Close the underlying HTTP client."""
        await self.client.aclose()

    async def get_gene_info(self, symbol: str) -> Dict[str, Any]:
        """
        Lookup gene information by symbol.
        Endpoint: /lookup/symbol/homo_sapiens/{symbol}
        """
        logger.info(f"Geneticist searching Ensembl for: {symbol}")
        url = f"{self.base_url}/lookup/symbol/homo_sapiens/{symbol}"
        headers = {"Content-Type": "application/json"}
        
        try:
            response = await self.client.get(url, headers=headers)
            if response.status_code == 404:
                return {"error": f"Gene '{symbol}' not found in Ensembl (Human)."}
            response.raise_for_status()
            
            data = response.json()
            return {
                "agent": "Geneticist",
                "source": "Ensembl",
                "id": data.get("id"),
                "display_name": data.get("display_name"),
                "description": data.get("description"),
                "biotype": data.get("biotype"),
                "assembly_name": data.get("assembly_name"),
                "logic_name": data.get("logic_name"),
                "start": data.get("start"),
                "end": data.get("end"),
                "strand": data.get("strand"),
                "seq_region_name": data.get("seq_region_name")
            }
            
        except httpx.HTTPError as e:
            logger.error(f"Ensembl API Error: {e}")
            return {"error": str(e)}

    async def get_sequence(self, gene_id: str) -> Dict[str, Any]:
        """
        Retrieve genomic sequence by ID.
        Endpoint: /sequence/id/{id}
        """
        url = f"{self.base_url}/sequence/id/{gene_id}"
        headers = {"Content-Type": "application/json"}
        
        try:
            response = await self.client.get(url, headers=headers)
            response.raise_for_status()
            data = response.json()
            
            return {
                "id": gene_id,
                "sequence": data.get("seq", "")[:500] + "..." if data.get("seq") else "No Sequence",
                "desc": data.get("desc")
            }
        except httpx.HTTPError as e:
            logger.error(f"Ensembl Sequence Error: {e}")
            return {"error": str(e)}
