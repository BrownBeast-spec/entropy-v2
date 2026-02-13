import httpx
import logging
from typing import Dict, Any, Optional, List

# Configure logging
logger = logging.getLogger(__name__)

class PubChemAgent:
    def __init__(self):
        self.pubchem_data_url = "https://pubchem.ncbi.nlm.nih.gov/rest/pug"
        self.pubchem_view_url = "https://pubchem.ncbi.nlm.nih.gov/rest/pug_view"
        self.chembl_url = "https://www.ebi.ac.uk/chembl/api/data"
        self.client = httpx.AsyncClient(timeout=30.0)

    async def close(self):
        """Close the underlying HTTP client."""
        await self.client.aclose()

    async def get_compound_props(self, name: str) -> Dict[str, Any]:
        """
        Get compound properties from PubChem.
        First searches for CID by name, then fetches properties.
        """
        logger.info(f"Chemist searching PubChem for: {name}")
        
        try:
            # 1. Search for CID
            search_url = f"{self.pubchem_data_url}/compound/name/{name}/cids/JSON"
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
                "agent": "Chemist",
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
        logger.info(f"Chemist searching ChEMBL for: {query}")
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
                "agent": "Chemist",
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
