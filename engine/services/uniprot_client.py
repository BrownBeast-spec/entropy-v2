import httpx
import logging
from typing import Dict, Any, Optional

logger = logging.getLogger(__name__)

class UniProtClient:
    def __init__(self):
        self.base_url = "https://rest.uniprot.org/uniprotkb/search"
        self.client = httpx.AsyncClient(timeout=30.0)
        
    async def close(self):
        """Close the underlying HTTP client."""
        await self.client.aclose()

    def _parse_response(self, result: Dict[str, Any]) -> Dict[str, Any]:
        """
        Parses the complex nested JSON from UniProt (Corrected for 2024 API).
        """
        parsed = {
            "id": result.get("primaryAccession"),
            "name": result.get("proteinDescription", {}).get("recommendedName", {}).get("fullName", {}).get("value"),
            "locations": [],
            "pathways": [],
            "function": "N/A"
        }

        # UniProt returns a list of comments. We must iterate through them.
        for comment in result.get("comments", []):
            
            # 1. Extract Subcellular Location
            # Key difference: API uses "commentType", not "type"
            # Value is "SUBCELLULAR LOCATION" (with space), not underscore
            if comment.get("commentType") == "SUBCELLULAR LOCATION":
                for loc_entry in comment.get("subcellularLocations", []):
                    # Each entry has a 'location' object with a 'value'
                    if "location" in loc_entry:
                        loc_value = loc_entry["location"].get("value")
                        if loc_value:
                            parsed["locations"].append(loc_value)

            # 2. Extract Function
            if comment.get("commentType") == "FUNCTION":
                # Function text is stored inside a 'texts' list
                texts = comment.get("texts", [])
                if texts:
                    parsed["function"] = texts[0].get("value")

        # 3. Extract Reactome Pathways
        # Found in uniProtKBCrossReferences where database == "Reactome"
        for xref in result.get("uniProtKBCrossReferences", []):
            if xref.get("database") == "Reactome":
                # Extract pathway name from properties
                pathway_name = None
                for prop in xref.get("properties", []):
                    if prop.get("key") == "PathwayName":
                        pathway_name = prop.get("value")
                        break
                
                if pathway_name:
                    parsed["pathways"].append({
                        "name": pathway_name,
                        "id": xref.get("id"),
                        "type": "Pathway" # UniProt doesn't specify type, assume generic
                    })

        return parsed

    async def get_protein_data(self, gene_symbol: str) -> Optional[Dict[str, Any]]:
        """
        Fetches subcellular location and function for a given gene.
        """
        logger.info(f"UniProt searching for: {gene_symbol}")
        
        # Query: Exact gene name + Human (9606) + Reviewed (Swiss-Prot only)
        # We request specific fields to keep the payload light
        params = {
            "query": f"gene_exact:{gene_symbol} AND organism_id:9606 AND reviewed:true",
            "fields": "accession,protein_name,cc_subcellular_location,cc_function,xref_reactome",
            "format": "json",
            "size": 1
        }


        try:
            response = await self.client.get(self.base_url, params=params)
            response.raise_for_status()
            data = response.json()

            if not data.get("results"):
                return None

            return self._parse_response(data["results"][0])

        except httpx.HTTPError as e:
            logger.error(f"UniProt API request failed: {e}")
            return {"error": str(e)}
        except Exception as e:
            logger.error(f"Unexpected error in UniProtClient: {e}")
            return {"error": str(e)}
