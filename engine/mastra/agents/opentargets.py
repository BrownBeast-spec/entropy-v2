import httpx
import logging
import json
import asyncio
import os
from typing import Dict, Any, Optional, List
from mastra.tools.uniprot_client import UniProtClient

# Configure logging
logger = logging.getLogger(__name__)

class OpenTargetsAgent:
    """
    Open Targets Agent (Biologist)
    
    API Capabilities:
    - Target Validation: Gene → Disease associations, tractability
    - Drug Information: MoA, indications, pharmacovigilance
    - Disease Information: Ontology, known drugs, clinical signs
    - NCBI Integration: Gene and Protein data from NCBI databases
    - UniProt: Protein localization, pathways, function
    
    Rate Limit: No official limit, but be respectful (~10 req/sec)
    """
    def __init__(self):
        self.base_url = "https://api.platform.opentargets.org/api/v4/graphql"
        self.ncbi_gene_url = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils"
        self.ncbi_email = os.getenv("NCBI_EMAIL", "surajharlekar@gmail.com")
        self.ncbi_api_key = os.getenv("NCBI_API_KEY")
        self.client = httpx.AsyncClient(timeout=30.0)
        self.up_client = UniProtClient()
        
        # Rate limiting: 10 req/sec is conservative
        self._rate_limit_delay = 0.1  # 100ms between requests
        self._last_request_time = 0.0

    async def close(self):
        """Close the underlying HTTP client."""
        await self.client.aclose()
        await self.up_client.close()
    
    async def _rate_limit(self):
        """Enforce rate limiting between API calls."""
        current_time = asyncio.get_event_loop().time()
        time_since_last = current_time - self._last_request_time
        if time_since_last < self._rate_limit_delay:
            await asyncio.sleep(self._rate_limit_delay - time_since_last)
        self._last_request_time = asyncio.get_event_loop().time()

    async def run_query(self, query: str, variables: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Generic handler for GraphQL requests."""
        await self._rate_limit()
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
            logger.error(f"Unexpected error in OpenTargetsAgent: {e}")
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
                "agent": "OpenTargets",
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
    
    async def get_drug_info(self, drug_id: str) -> Dict[str, Any]:
        """
        Get drug information including MoA, indications, and pharmacovigilance.
        
        Args:
            drug_id: Drug identifier (ChEMBL ID, e.g., "CHEMBL1743081")
            
        Returns:
            Dict with drug information
        """
        logger.info(f"OpenTargets Agent fetching drug info: {drug_id}")
        
        query = """
        query DrugInfo($id: String!) {
          drug(chemblId: $id) {
            id
            name
            description
            drugType
            maximumClinicalTrialPhase
            hasBeenWithdrawn
            withdrawnNotice {
              reasons
              countries
            }
            linkedDiseases {
              rows {
                name
                id
              }
            }
            linkedTargets {
              rows {
                approvedSymbol
                id
              }
            }
            mechanismsOfAction {
              rows {
                mechanismOfAction
                targetName
                targets {
                  id
                  approvedSymbol
                }
              }
            }
          }
        }
        """
        
        result = await self.run_query(query, variables={"id": drug_id})
        
        if "error" in result:
            return result
        
        if "data" in result and result.get("data") and result["data"].get("drug"):
            data = result["data"]["drug"]
            
            return {
                "agent": "OpenTargets",
                "drug_id": drug_id,
                "name": data.get("name"),
                "description": data.get("description"),
                "drug_type": data.get("drugType"),
                "max_clinical_phase": data.get("maximumClinicalTrialPhase"),
                "withdrawn": data.get("hasBeenWithdrawn"),
                "withdrawal_info": data.get("withdrawnNotice", {}),
                "linked_diseases": [d["name"] for d in data.get("linkedDiseases", {}).get("rows", [])[:5]],
                "linked_targets": [t["approvedSymbol"] for t in data.get("linkedTargets", {}).get("rows", [])[:5]],
                "mechanisms_of_action": [
                    {
                        "moa": m["mechanismOfAction"],
                        "target": m["targetName"]
                    }
                    for m in data.get("mechanismsOfAction", {}).get("rows", [])[:5]
                ]
            }
        
        return {"error": "Drug not found", "drug_id": drug_id}
    
    async def get_disease_info(self, disease_id: str) -> Dict[str, Any]:
        """
        Get disease information including ontology, known drugs, and clinical signs.
        
        Args:
            disease_id: Disease identifier (EFO ID, e.g., "EFO_0000685")
            
        Returns:
            Dict with disease information
        """
        logger.info(f"OpenTargets Agent fetching disease info: {disease_id}")
        
        query = """
        query DiseaseInfo($id: String!) {
          disease(efoId: $id) {
            id
            name
            description
            synonyms {
              relation
              terms
            }
            therapeuticAreas {
              id
              name
            }
            knownDrugs(page: {index: 0, size: 5}) {
              rows {
                drug {
                  name
                  id
                }
                drugType
                status
                phase
              }
            }
            associatedTargets(page: {index: 0, size: 5}) {
              rows {
                target {
                  approvedSymbol
                  id
                }
                score
              }
            }
          }
        }
        """
        
        result = await self.run_query(query, variables={"id": disease_id})
        
        if "error" in result:
            return result
        
        if "data" in result and result.get("data") and result["data"].get("disease"):
            data = result["data"]["disease"]
            
            return {
                "agent": "OpenTargets",
                "disease_id": disease_id,
                "name": data.get("name"),
                "description": data.get("description"),
                "synonyms": [s for syn in data.get("synonyms", []) for s in syn.get("terms", [])[:3]],
                "therapeutic_areas": [ta["name"] for ta in data.get("therapeuticAreas", [])],
                "known_drugs": [
                    {
                        "name": row["drug"]["name"],
                        "type": row["drugType"],
                        "status": row["status"],
                        "phase": row["phase"]
                    }
                    for row in data.get("knownDrugs", {}).get("rows", [])
                ],
                "associated_targets": [
                    {
                        "symbol": row["target"]["approvedSymbol"],
                        "score": row["score"]
                    }
                    for row in data.get("associatedTargets", {}).get("rows", [])
                ]
            }
        
        return {"error": "Disease not found", "disease_id": disease_id}
    
    async def get_ncbi_gene_info(self, gene_symbol: str) -> Dict[str, Any]:
        """
        Get gene information from NCBI Gene database.
        Architectural separation: This is structured biological data, not literature.
        
        Args:
            gene_symbol: Gene symbol (e.g., "BRCA1")
            
        Returns:
            Dict with NCBI gene information
        """
        await self._rate_limit()
        logger.info(f"OpenTargets Agent fetching NCBI Gene: {gene_symbol}")
        
        try:
            # Step 1: Search for gene ID
            search_params = {
                "db": "gene",
                "term": f"{gene_symbol}[Gene Name] AND Homo sapiens[Organism]",
                "retmode": "json",
                "email": self.ncbi_email
            }
            
            if self.ncbi_api_key:
                search_params["api_key"] = self.ncbi_api_key
            
            search_url = f"{self.ncbi_gene_url}/esearch.fcgi"
            response = await self.client.get(search_url, params=search_params)
            response.raise_for_status()
            
            data = response.json()
            id_list = data.get("esearchresult", {}).get("idlist", [])
            
            if not id_list:
                return {"error": f"Gene {gene_symbol} not found in NCBI Gene"}
            
            gene_id = id_list[0]
            
            # Step 2: Fetch gene summary
            await self._rate_limit()
            summary_params = {
                "db": "gene",
                "id": gene_id,
                "retmode": "json",
                "email": self.ncbi_email
            }
            
            if self.ncbi_api_key:
                summary_params["api_key"] = self.ncbi_api_key
            
            summary_url = f"{self.ncbi_gene_url}/esummary.fcgi"
            summary_response = await self.client.get(summary_url, params=summary_params)
            summary_response.raise_for_status()
            
            summary_data = summary_response.json()
            gene_data = summary_data.get("result", {}).get(gene_id, {})
            
            return {
                "agent": "OpenTargets",
                "source": "NCBI Gene",
                "gene_id": gene_id,
                "symbol": gene_data.get("name"),
                "description": gene_data.get("description"),
                "summary": gene_data.get("summary"),
                "chromosome": gene_data.get("chromosome"),
                "map_location": gene_data.get("maplocation"),
                "gene_type": gene_data.get("geneticsource"),
                "organism": gene_data.get("organism", {}).get("scientificname")
            }
            
        except httpx.HTTPError as e:
            logger.error(f"NCBI Gene lookup failed: {e}")
            return {"error": str(e), "gene": gene_symbol}
    
    async def get_ncbi_protein_info(self, protein_id: str) -> Dict[str, Any]:
        """
        Get protein information from NCBI Protein database.
        
        Args:
            protein_id: Protein accession (e.g., "NP_000483" or search term)
            
        Returns:
            Dict with NCBI protein information
        """
        await self._rate_limit()
        logger.info(f"OpenTargets Agent fetching NCBI Protein: {protein_id}")
        
        try:
            # Fetch protein summary
            summary_params = {
                "db": "protein",
                "id": protein_id,
                "retmode": "json",
                "email": self.ncbi_email
            }
            
            if self.ncbi_api_key:
                summary_params["api_key"] = self.ncbi_api_key
            
            summary_url = f"{self.ncbi_gene_url}/esummary.fcgi"
            response = await self.client.get(summary_url, params=summary_params)
            
            if response.status_code == 400:
                return {"error": f"Protein {protein_id} not found in NCBI Protein"}
            
            response.raise_for_status()
            data = response.json()
            
            # NCBI Protein esummary response structure
            protein_data = data.get("result", {}).get(protein_id, {})
            
            return {
                "agent": "OpenTargets",
                "source": "NCBI Protein",
                "protein_id": protein_id,
                "title": protein_data.get("title"),
                "accession": protein_data.get("accessionversion"),
                "organism": protein_data.get("organism"),
                "length": protein_data.get("slen"),
                "create_date": protein_data.get("createdate"),
                "update_date": protein_data.get("updatedate")
            }
            
        except httpx.HTTPError as e:
            logger.error(f"NCBI Protein lookup failed: {e}")
            return {"error": str(e), "protein_id": protein_id}
