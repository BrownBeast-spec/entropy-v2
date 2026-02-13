import httpx
import logging
import json
from typing import Dict, Any, Optional, List
from mastra.tools.uniprot_client import UniProtClient

# Configure logging
logger = logging.getLogger(__name__)

class OpenTargetsAgent:
    def __init__(self):
        self.base_url = "https://api.platform.opentargets.org/api/v4/graphql"
        self.client = httpx.AsyncClient(timeout=30.0)
        self.up_client = UniProtClient()

    async def close(self):
        """Close the underlying HTTP client."""
        await self.client.aclose()
        await self.up_client.close()

    async def run_query(self, query: str, variables: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Generic handler for GraphQL requests."""
        payload = {"query": query}
        if variables:
            payload["variables"] = variables
            
        try:
            response = await self.client.post(self.base_url, json=payload)
            if response.status_code == 400:
                logger.error(f"GraphQL Bad Request: {response.text}")
                return {"error": "Bad Request", "details": response.json()}
                
            response.raise_for_status()
            return response.json()
        except httpx.HTTPError as e:
            logger.error(f"GraphQL query failed: {e}")
            return {"error": str(e)}
        except Exception as e:
            logger.error(f"Unexpected error in BiologistAgent: {e}")
            return {"error": str(e)}

    async def resolve_target_id(self, gene_symbol: str) -> Optional[str]:
        """
        Resolves a gene symbol (e.g., 'EGFR') to its Ensembl ID (e.g., 'ENSG00000146648').
        """
        logger.info(f"Looking up ID for: {gene_symbol}")
        
        query = """
        query Search($term: String!) {
          search(queryString: $term, entityNames: ["target"], page: {index: 0, size: 1}) {
            hits {
              id
            }
          }
        }
        """
        
        result = await self.run_query(query, variables={"term": gene_symbol})
        
        # Extract the ID safely
        hits = result.get("data", {}).get("search", {}).get("hits", [])
        if hits:
            return hits[0]["id"]
        return None

    def _generate_insight(self, locations: List[str], pathways: List[Dict[str, Any]]) -> str:
        """
        Generates druaggability insight based on cellular location.
        """
        if any("membrane" in loc.lower() for loc in locations) or "Secreted" in locations:
            insight = "Good drug target (Accessible via Cell Membrane/Secreted)."
        elif any("nucleus" in loc.lower() for loc in locations):
            insight = "Challenging target (Intracellular/Nuclear - requires advanced delivery)."
        elif "Cytoplasm" in locations:
            insight = "Moderate target (Intracellular)."
        else:
            insight = "Location analysis inconclusive."

        # Pathway Check
        if len(pathways) > 20:
             insight += " High Pleiotropy Risk: Target is involved in many pathways (Potential Side Effects)."
        
        return insight

    async def validate_target(self, gene_symbol: str) -> Dict[str, Any]:
        """
        Validates a target by first resolving its ID and then fetching metadata.
        Input: Gene Symbol (e.g., "EGFR")
        """
        # 1. Get the ID automatically
        ensembl_id = await self.resolve_target_id(gene_symbol)
        
        if not ensembl_id:
            return {"error": f"Gene '{gene_symbol}' not found."}

        logger.info(f"Validating Target ID: {ensembl_id} (Symbol: {gene_symbol})")
        
        # 2. Parallel Fetch: Open Targets (Genetics) + UniProt (Protein)
        query = """
        query TargetInfo($id: String!) {
          target(ensemblId: $id) {
            id
            approvedSymbol
            associatedDiseases(page: {index: 0, size: 5}) {
              rows {
                disease {
                  name
                }
                score
              }
            }
          }
        }
        """
        
        # We await sequentially for simplicity, but could be gathered
        ot_result = await self.run_query(query, variables={"id": ensembl_id})
        up_result = await self.up_client.get_protein_data(gene_symbol)
        
        pathways = []
        if up_result and "pathways" in up_result:
             pathways = up_result['pathways']

        if "error" in ot_result:
            return ot_result

        # Simplify the output
        if "data" in ot_result and ot_result.get("data") and ot_result["data"].get("target"):
            data = ot_result["data"]["target"]
            
            associations = [
                f"{row['disease']['name']} (Score: {row['score']:.2f})"
                for row in data.get("associatedDiseases", {}).get("rows", [])
            ]
            
            # UniProt Data
            locations = up_result.get("locations", []) if up_result else []
            function = up_result.get("function", "N/A") if up_result else "N/A"
            
            
            insight = self._generate_insight(locations, pathways)

            return {
                "agent": "Biologist",
                "gene_symbol": gene_symbol,
                "target_id": ensembl_id,
                "cellular_locations": locations,
                "key_pathways": [p['name'] for p in pathways[:5]],
                "all_pathways": [p['name'] for p in pathways],
                "total_pathways": len(pathways),
                "mechanism_of_action": function[:500] + "..." if len(function) > 500 else function,
                "analysis": insight,
                "top_associations": associations
            }
        
        return {"error": "Target not found or API error.", "raw": ot_result}
