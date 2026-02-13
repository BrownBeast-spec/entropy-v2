import httpx
import logging
import os
from typing import Dict, Any, Optional, Union, List
from markdownify import markdownify as md

# Configure logging
logger = logging.getLogger(__name__)

class OpenFDAAgent:
    def __init__(self):
        self.base_url = "https://api.fda.gov/drug/label.json"
        self.api_key = os.getenv("OPENFDA_API_KEY")
        self.client = httpx.AsyncClient(timeout=30.0)
        
    async def close(self):
        """Close the underlying HTTP client."""
        await self.client.aclose()
        
    def clean_html_to_markdown(self, raw_data: Union[str, List[str], None]) -> str:
        """
        Converts OpenFDA HTML fragments into clean Markdown.
        Preserves Tables, Lists, and Bolding.
        """
        if not raw_data:
            return "N/A"
        
        # OpenFDA returns lists of strings. Join them first.
        if isinstance(raw_data, list):
            raw_text = "".join(raw_data)
        else:
            raw_text = str(raw_data)

        # Convert to Markdown
        # heading_style="ATX" ensures headers use # instead of underlining
        # strip=['style'] removes the CSS junk like 'width="100%"'
        clean_text = md(raw_text, heading_style="ATX", strip=["style", "script", "meta"])
        
        # Remove extra whitespace
        return clean_text.strip()

    async def check_safety(self, drug_name: str) -> Dict[str, Any]:
        """
        Check drug safety using OpenFDA API and sanitize the output to Markdown.
        
        Args:
            drug_name: Brand name of the drug to check
            
        Returns:
            Dict containing cleaned safety information
        """
        logger.info(f"Hawk Agent analyzing safety for: {drug_name}")
        
        params = {
            "search": f"openfda.brand_name:{drug_name}",
            "limit": 1
        }
        
        if self.api_key:
            params["api_key"] = self.api_key

        try:
            response = await self.client.get(self.base_url, params=params)
            response.raise_for_status()
            data = response.json()
            
            if "results" not in data:
                return {"risk": "Unknown", "details": "Drug not found in FDA database."}

            result = data["results"][0]
            
            # --- INTELLIGENT EXTRACTION ---
            
            # 1. Boxed Warning (The most critical safety data)
            boxed_warning = self.clean_html_to_markdown(result.get("boxed_warning"))
            
            # 2. Dosage: Prefer the TABLE version if it exists, otherwise use text
            if "dosage_and_administration_table" in result:
                dosage = self.clean_html_to_markdown(result.get("dosage_and_administration_table"))
            else:
                dosage = self.clean_html_to_markdown(result.get("dosage_and_administration"))

            # 3. Indications (What is it for?)
            indications = self.clean_html_to_markdown(result.get("indications_and_usage"))

            # 4. Contraindications (Who shouldn't take it?)
            contraindications = self.clean_html_to_markdown(result.get("contraindications"))

            # Determine High Level Risk
            risk_flag = "HIGH_RISK" if boxed_warning != "N/A" else "Standard"

            return {
                "agent": "Hawk",
                "drug": drug_name,
                "risk_level": risk_flag,
                "safety_summary": {
                    "boxed_warning": boxed_warning,
                    "contraindications": contraindications
                },
                "clinical_data": {
                    "dosage_instructions": dosage,
                    "indications": indications
                }
            }
            
        except httpx.HTTPError as e:
            logger.error(f"OpenFDA API request failed for '{drug_name}': {str(e)}")
            return {"error": str(e)}
        except Exception as e:
            logger.error(f"Unexpected error in HawkAgent for '{drug_name}': {str(e)}")
            return {"error": f"Unexpected error: {str(e)}"}

    async def get_adverse_events(self, drug_name: str, limit: int = 10) -> Dict[str, Any]:
        """
        Get adverse event associated with a drug.
        Uses the 'count' feature to return top reported reactions.
        """
        url = "https://api.fda.gov/drug/event.json"
        
        # We assume the drug name is the medicinal product
        params = {
            "search": f"patient.drug.medicinalproduct:{drug_name}",
            "count": "patient.reaction.reactionmeddrapt.exact",
            "limit": limit
        }
        
        if self.api_key:
            params["api_key"] = self.api_key
            
        try:
            response = await self.client.get(url, params=params)
            response.raise_for_status()
            data = response.json()
            
            # OpenFDA count results are in 'results' as a list of {term, count}
            events = [
                {"reaction": item["term"], "count": item["count"]}
                for item in data.get("results", [])
            ]
            
            return {
                "drug": drug_name,
                "total_events_analyzed": "Count Query",
                "top_reactions": events
            }
            
        except httpx.HTTPError as e:
            logger.error(f"OpenFDA Event count failed: {e}")
            return {"error": str(e)}

    async def get_recalls(self, drug_name: str) -> Dict[str, Any]:
        """
        Get recent enforcement reports (recalls).
        """
        url = "https://api.fda.gov/drug/enforcement.json"
        params = {
            "search": f"product_description:{drug_name}",
            "limit": 5,
            "sort": "report_date:desc"
        }
        
        if self.api_key:
            params["api_key"] = self.api_key
            
        try:
            response = await self.client.get(url, params=params)
            response.raise_for_status()
            data = response.json()
            
            recalls = []
            for item in data.get("results", []):
                recalls.append({
                    "reason": item.get("reason_for_recall"),
                    "status": item.get("status"),
                    "date": item.get("report_date"),
                    "product_description": item.get("product_description"),
                    "classification": item.get("classification")
                })
                
            return {
                "drug": drug_name,
                "found": len(recalls),
                "recalls": recalls
            }
            
        except httpx.HTTPError as e:
            # Often 404 if no recalls
            if e.response.status_code == 404:
                return {"drug": drug_name, "found": 0, "recalls": []}
            logger.error(f"OpenFDA Enforcement failed: {e}")
            return {"error": str(e)}
