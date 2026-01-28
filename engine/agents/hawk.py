import httpx
import logging
import os
from typing import Dict, Any, Optional, Union, List
from markdownify import markdownify as md

# Configure logging
logger = logging.getLogger(__name__)

class HawkAgent:
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
                },
                "link": f"https://open.fda.gov/drug/label?search=openfda.brand_name:{drug_name}"
            }
            
        except httpx.HTTPError as e:
            logger.error(f"OpenFDA API request failed for '{drug_name}': {str(e)}")
            return {"error": str(e)}
        except Exception as e:
            logger.error(f"Unexpected error in HawkAgent for '{drug_name}': {str(e)}")
            return {"error": f"Unexpected error: {str(e)}"}
