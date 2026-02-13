import httpx
import logging
import asyncio
from typing import Dict, Any, Optional, List
from urllib.parse import quote

# Configure logging
logger = logging.getLogger(__name__)

class PubChemAgent:
    """
    PubChem Agent (Chemist)
    
    API Capabilities:
    - Compound Search: By name, CID, SMILES, InChI, Formula
    - Properties: Molecular weight, formula, structure
    - Bioassays: Activity data from screening assays
    - ChEMBL Integration: Drug-like molecules and targets
    
    Rate Limit: 5 requests/second
    """
    def __init__(self):
        self.pubchem_data_url = "https://pubchem.ncbi.nlm.nih.gov/rest/pug"
        self.pubchem_view_url = "https://pubchem.ncbi.nlm.nih.gov/rest/pug_view"
        self.chembl_url = "https://www.ebi.ac.uk/chembl/api/data"
        self.client = httpx.AsyncClient(timeout=30.0)
        
        # Rate limiting: 5 req/sec
        self._rate_limit_delay = 0.2  # 200ms between requests
        self._last_request_time = 0.0

    async def close(self):
        """Close the underlying HTTP client."""
        await self.client.aclose()
    
    async def _rate_limit(self):
        """Enforce rate limiting between API calls."""
        current_time = asyncio.get_event_loop().time()
        time_since_last = current_time - self._last_request_time
        if time_since_last < self._rate_limit_delay:
            await asyncio.sleep(self._rate_limit_delay - time_since_last)
        self._last_request_time = asyncio.get_event_loop().time()

    async def get_compound_props(self, name: str) -> Dict[str, Any]:
        """
        Get compound properties from PubChem.
        First searches for CID by name, then fetches properties.
        """
        await self._rate_limit()
        logger.info(f"PubChem Agent searching for: {name}")
        
        try:
            # 1. Search for CID
            search_url = f"{self.pubchem_data_url}/compound/name/{quote(name)}/cids/JSON"
            response = await self.client.get(search_url)
            if response.status_code == 404:
                return {"error": "Compound not found in PubChem"}
            response.raise_for_status()
            
            data = response.json()
            cid_list = data.get("IdentifierList", {}).get("CID", [])
            if not cid_list:
                 return {"error": "No CID found"}
            
            cid = cid_list[0]
            
            # 2. Get Properties
            # Request MolecularFormula, MolecularWeight, IsomericSMILES, InChIKey
            props_url = f"{self.pubchem_data_url}/compound/cid/{cid}/property/MolecularFormula,MolecularWeight,IsomericSMILES,InChIKey/JSON"
            prop_response = await self.client.get(props_url)
            prop_response.raise_for_status()
            
            props = prop_response.json().get("PropertyTable", {}).get("Properties", [])[0]
            
            # 3. Get Summary (Safety/Toxicity) from View API
            # Note: This returns a large JSON, we might want to extract just headings or specific sections in a real app
            # For this PoC, we'll fetch it but just return a link or minimal info to avoid massive payloads
            view_url = f"{self.pubchem_view_url}/data/compound/{cid}/JSON"
            # We won't fetch the full view in this call to keep it fast, unless requested.
            
            return {
                "agent": "PubChem",
                "source": "PubChem",
                "compound_name": name,
                "cid": cid,
                "properties": {
                    "formula": props.get("MolecularFormula"),
                    "molecular_weight": props.get("MolecularWeight"),
                    "smiles": props.get("IsomericSMILES"),
                    "inchikey": props.get("InChIKey")
                },
                "pubchem_link": f"https://pubchem.ncbi.nlm.nih.gov/compound/{cid}"
            }

        except httpx.HTTPError as e:
            logger.error(f"PubChem API Error: {e}")
            return {"error": f"PubChem request failed: {str(e)}"}
        except Exception as e:
            logger.error(f"Chemist Error: {e}")
            return {"error": str(e)}

    async def get_compound_summary(self, cid: int) -> Dict[str, Any]:
         """
         Retrieves full Compound Summary from PubChem View API (Safety, Toxicity).
         """
         url = f"{self.pubchem_view_url}/data/compound/{cid}/JSON"
         try:
            response = await self.client.get(url)
            response.raise_for_status()
            data = response.json()
            
            # Extract Safety Summary if available
            # This is a complex nested structure, for PoC we return the Record Title and basic sections
            record = data.get("Record", {})
            sections = record.get("Section", [])
            
            # Simple extraction of section headers
            available_sections = [s.get("TOCHeading") for s in sections]
            
            return {
                "cid": cid,
                "title": record.get("RecordTitle"),
                "available_sections": available_sections
                # Full parsing would go here (e.g. looking for 'Safety and Hazards')
            }
         except Exception as e:
             return {"error": f"Failed to get summary: {e}"}

    async def search_chembl(self, query: str) -> Dict[str, Any]:
        """
        Search for molecules in ChEMBL.
        Ref: molecule endpoint.
        """
        logger.info(f"PubChem Agent searching ChEMBL for: {query}")
        params = {
            "q": query,
            "format": "json",
            "limit": 5
        }
        # Note: ChEMBL 'search' might be distinct from 'molecule' filtering.
        # The /molecule endpoint supports filtering (e.g. molecule_structures__canonical_smiles__flexmatch)
        # But commonly we use the connection to EBI search or just filter by name if supported.
        # ChEMBL API is complex. The user guide suggests filtering on fields.
        # For simple text search, we use the 'search' endpoint usually, but here user specifies /molecule.
        # We will try filtering by pref_name__icontains
        
        url = f"{self.chembl_url}/molecule"
        filter_params = {
            "pref_name__icontains": query,
            "format": "json",
            "limit": 5
        }

        try:
            response = await self.client.get(url, params=filter_params)
            response.raise_for_status()
            data = response.json()
            
            molecules = []
            for mol in data.get("molecules", []):
                molecules.append({
                    "chembl_id": mol.get("molecule_chembl_id"),
                    "name": mol.get("pref_name"),
                    "type": mol.get("molecule_type"),
                    "structure": mol.get("molecule_structures", {}).get("canonical_smiles")
                })
                
            return {
                "agent": "PubChem",
                "source": "ChEMBL",
                "query": query,
                "found": len(molecules),
                "molecules": molecules
            }
            
        except httpx.HTTPError as e:
             # ChEMBL might return 404 if empty or other errors
             logger.error(f"ChEMBL Error: {e}")
             return {"error": f"ChEMBL request failed: {str(e)}"}

    async def get_drug_activity(self, target_chembl_id: str) -> Dict[str, Any]:
        """
        Get bioactivity data for a target from ChEMBL.
        """
        url = f"{self.chembl_url}/activity"
        params = {
            "target_chembl_id": target_chembl_id,
            "format": "json",
            "limit": 10
        }
        try:
             response = await self.client.get(url, params=params)
             response.raise_for_status()
             data = response.json()
             return {"activities": data.get("activities", [])}
        except Exception as e:
            return {"error": str(e)}
    
    async def get_compound_by_cid(self, cid: int) -> Dict[str, Any]:
        """
        Get compound properties directly by CID (PubChem Compound ID).
        
        Args:
            cid: PubChem Compound ID
            
        Returns:
            Dict with compound properties
        """
        await self._rate_limit()
        logger.info(f"PubChem Agent fetching CID: {cid}")
        
        try:
            props_url = f"{self.pubchem_data_url}/compound/cid/{cid}/property/MolecularFormula,MolecularWeight,IsomericSMILES,InChIKey,IUPACName/JSON"
            response = await self.client.get(props_url)
            
            if response.status_code == 404:
                return {"error": f"CID {cid} not found"}
            
            response.raise_for_status()
            props = response.json().get("PropertyTable", {}).get("Properties", [])[0]
            
            return {
                "agent": "PubChem",
                "cid": cid,
                "properties": {
                    "iupac_name": props.get("IUPACName"),
                    "formula": props.get("MolecularFormula"),
                    "molecular_weight": props.get("MolecularWeight"),
                    "smiles": props.get("IsomericSMILES"),
                    "inchikey": props.get("InChIKey")
                },
                "pubchem_link": f"https://pubchem.ncbi.nlm.nih.gov/compound/{cid}"
            }
        except httpx.HTTPError as e:
            logger.error(f"PubChem CID lookup failed: {e}")
            return {"error": str(e), "cid": cid}
    
    async def get_compound_by_smiles(self, smiles: str) -> Dict[str, Any]:
        """
        Get compound information by SMILES structure.
        
        Args:
            smiles: SMILES string (e.g., "CC(=O)OC1=CC=CC=C1C(=O)O" for aspirin)
            
        Returns:
            Dict with compound properties
        """
        await self._rate_limit()
        logger.info(f"PubChem Agent searching by SMILES")
        
        try:
            # First get CID from SMILES
            search_url = f"{self.pubchem_data_url}/compound/smiles/{quote(smiles)}/cids/JSON"
            response = await self.client.get(search_url)
            
            if response.status_code == 404:
                return {"error": "No compound found for this SMILES"}
            
            response.raise_for_status()
            data = response.json()
            cid_list = data.get("IdentifierList", {}).get("CID", [])
            
            if not cid_list:
                return {"error": "No CID found for SMILES"}
            
            cid = cid_list[0]
            
            # Get properties
            return await self.get_compound_by_cid(cid)
            
        except httpx.HTTPError as e:
            logger.error(f"SMILES search failed: {e}")
            return {"error": str(e)}
    
    async def get_compound_by_formula(self, formula: str) -> Dict[str, Any]:
        """
        Search compounds by molecular formula.
        
        Args:
            formula: Molecular formula (e.g., "C9H8O4" for aspirin)
            
        Returns:
            Dict with matching compounds
        """
        await self._rate_limit()
        logger.info(f"PubChem Agent searching by formula: {formula}")
        
        try:
            search_url = f"{self.pubchem_data_url}/compound/formula/{formula}/cids/JSON"
            response = await self.client.get(search_url)
            
            if response.status_code == 404:
                return {"error": f"No compounds found with formula {formula}"}
            
            response.raise_for_status()
            data = response.json()
            cid_list = data.get("IdentifierList", {}).get("CID", [])
            
            if not cid_list:
                return {"error": "No compounds found"}
            
            # Return first 5 CIDs
            return {
                "agent": "PubChem",
                "formula": formula,
                "total_found": len(cid_list),
                "cids": cid_list[:5],
                "note": "Use get_compound_by_cid() to fetch details for specific CIDs"
            }
            
        except httpx.HTTPError as e:
            logger.error(f"Formula search failed: {e}")
            return {"error": str(e)}
    
    async def get_bioassays(self, cid: int, limit: int = 5) -> Dict[str, Any]:
        """
        Get bioassay data for a compound (IC50, Ki, activity).
        Critical for drug discovery - shows biological activity.
        
        Args:
            cid: PubChem Compound ID
            limit: Max number of assays to return
            
        Returns:
            Dict with bioassay activity data
        """
        await self._rate_limit()
        logger.info(f"PubChem Agent fetching bioassays for CID: {cid}")
        
        try:
            # Get list of AIDs (Assay IDs) for this compound
            aids_url = f"{self.pubchem_data_url}/compound/cid/{cid}/aids/JSON"
            response = await self.client.get(aids_url)
            
            if response.status_code == 404:
                return {"error": f"No bioassays found for CID {cid}"}
            
            response.raise_for_status()
            data = response.json()
            aid_list = data.get("InformationList", {}).get("Information", [{}])[0].get("AID", [])
            
            if not aid_list:
                return {
                    "agent": "PubChem",
                    "cid": cid,
                    "message": "No bioassay data available"
                }
            
            # Get summary for first few assays
            assays = []
            for aid in aid_list[:limit]:
                await self._rate_limit()
                assay_url = f"{self.pubchem_data_url}/assay/aid/{aid}/summary/JSON"
                
                try:
                    assay_response = await self.client.get(assay_url)
                    assay_response.raise_for_status()
                    assay_data = assay_response.json()
                    
                    if "AssaySummaries" in assay_data:
                        summary = assay_data["AssaySummaries"][0]
                        assays.append({
                            "aid": aid,
                            "name": summary.get("AssayName"),
                            "description": summary.get("AssayDescription", "")[:200],  # Truncate
                            "target": summary.get("Target", []),
                            "activity_outcome": summary.get("ActivityOutcome")
                        })
                except Exception as e:
                    logger.warning(f"Failed to fetch assay {aid}: {e}")
                    continue
            
            return {
                "agent": "PubChem",
                "cid": cid,
                "total_assays": len(aid_list),
                "returned_assays": len(assays),
                "assays": assays
            }
            
        except httpx.HTTPError as e:
            logger.error(f"Bioassay search failed: {e}")
            return {"error": str(e), "cid": cid}
