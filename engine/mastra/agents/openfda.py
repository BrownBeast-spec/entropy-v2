import httpx
import logging
import os
import asyncio
from typing import Dict, Any, Optional, Union, List
from markdownify import markdownify as md

# Configure logging
logger = logging.getLogger(__name__)

class OpenFDAAgent:
    """
    OpenFDA Agent (Regulatory Scout)
    
    API Capabilities:
    - Drug Labels: /drug/label (prescribing info)
    - Adverse Events: /drug/event (side effects)
    - Recalls: /drug/enforcement (safety recalls)
    - NDC Directory: /drug/ndc (National Drug Code)
    - Drugs@FDA: /drug/drugsfda (approved drugs database)
    - Drug Shortages: /drug/drugshortages (supply issues)
    
    Rate Limit: 240 requests/min (40 requests/min without API key)
    """
    def __init__(self):
        self.base_url = "https://api.fda.gov"
        self.api_key = os.getenv("OPENFDA_API_KEY")
        self.client = httpx.AsyncClient(timeout=30.0)
        
        # Rate limiting: 240 req/min = 4 req/sec
        self._rate_limit_delay = 0.25  # 250ms between requests
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
    
    def _add_api_key(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Add API key to request parameters if available."""
        if self.api_key:
            params["api_key"] = self.api_key
        return params
        
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
        logger.info(f"OpenFDA Agent analyzing safety for: {drug_name}")
        await self._rate_limit()
        
        params = self._add_api_key({
            "search": f"openfda.brand_name:{drug_name}",
            "limit": 1
        })

        try:
            url = f"{self.base_url}/drug/label.json"
            response = await self.client.get(url, params=params)
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
                "agent": "OpenFDA",
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
            return {"error": str(e), "agent": "OpenFDA"}
        except Exception as e:
            logger.error(f"Unexpected error in OpenFDAAgent for '{drug_name}': {str(e)}")
            return {"error": f"Unexpected error: {str(e)}", "agent": "OpenFDA"}

    async def get_adverse_events(self, drug_name: str, limit: int = 10) -> Dict[str, Any]:
        """
        Get adverse event associated with a drug.
        Uses the 'count' feature to return top reported reactions.
        """
        await self._rate_limit()
        url = f"{self.base_url}/drug/event.json"
        
        # We assume the drug name is the medicinal product
        params = self._add_api_key({
            "search": f"patient.drug.medicinalproduct:{drug_name}",
            "count": "patient.reaction.reactionmeddrapt.exact",
            "limit": limit
        })
            
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
        await self._rate_limit()
        url = f"{self.base_url}/drug/enforcement.json"
        params = self._add_api_key({
            "search": f"product_description:{drug_name}",
            "limit": 5,
            "sort": "report_date:desc"
        })
            
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
    
    async def get_ndc_info(self, product_ndc: str) -> Dict[str, Any]:
        """
        Get National Drug Code (NDC) Directory information.
        Links product to manufacturer, labeler, dosage form.
        
        Args:
            product_ndc: The NDC code (e.g., "0173-0715")
            
        Returns:
            Dict with NDC directory information
        """
        await self._rate_limit()
        logger.info(f"OpenFDA Agent looking up NDC: {product_ndc}")
        
        url = f"{self.base_url}/drug/ndc.json"
        params = self._add_api_key({
            "search": f"product_ndc:{product_ndc}",
            "limit": 1
        })
        
        try:
            response = await self.client.get(url, params=params)
            response.raise_for_status()
            data = response.json()
            
            if "results" not in data or not data["results"]:
                return {"error": "NDC not found", "ndc": product_ndc}
            
            result = data["results"][0]
            
            return {
                "agent": "OpenFDA",
                "ndc": product_ndc,
                "brand_name": result.get("brand_name"),
                "generic_name": result.get("generic_name"),
                "labeler_name": result.get("labeler_name"),
                "dosage_form": result.get("dosage_form"),
                "route": result.get("route", []),
                "product_type": result.get("product_type"),
                "marketing_category": result.get("marketing_category"),
                "active_ingredients": result.get("active_ingredients", [])
            }
            
        except httpx.HTTPError as e:
            logger.error(f"NDC lookup failed: {e}")
            return {"error": str(e), "ndc": product_ndc}
    
    async def search_drugs_fda(self, query: str, limit: int = 10) -> Dict[str, Any]:
        """
        Search Drugs@FDA database for approved drug products.
        Provides regulatory history and marketing status.
        
        Args:
            query: Drug name or active ingredient
            limit: Max results to return
            
        Returns:
            Dict with Drugs@FDA information
        """
        await self._rate_limit()
        logger.info(f"OpenFDA Agent searching Drugs@FDA for: {query}")
        
        url = f"{self.base_url}/drug/drugsfda.json"
        params = self._add_api_key({
            "search": f"openfda.brand_name:{query}",
            "limit": limit
        })
        
        try:
            response = await self.client.get(url, params=params)
            response.raise_for_status()
            data = response.json()
            
            if "results" not in data:
                return {"error": "No drugs found in Drugs@FDA", "query": query}
            
            drugs = []
            for result in data["results"]:
                products = result.get("products", [])
                for product in products:
                    drugs.append({
                        "application_number": result.get("application_number"),
                        "sponsor_name": result.get("sponsor_name"),
                        "brand_name": product.get("brand_name"),
                        "active_ingredients": product.get("active_ingredients", []),
                        "dosage_form": product.get("dosage_form"),
                        "route": product.get("route"),
                        "marketing_status": product.get("marketing_status")
                    })
            
            return {
                "agent": "OpenFDA",
                "query": query,
                "total_found": len(drugs),
                "drugs": drugs
            }
            
        except httpx.HTTPError as e:
            logger.error(f"Drugs@FDA search failed: {e}")
            return {"error": str(e), "query": query}
    
    async def get_drug_shortages(self, drug_name: Optional[str] = None) -> Dict[str, Any]:
        """
        Get current drug shortage information.
        Critical for supply chain and availability context.
        
        Args:
            drug_name: Optional drug name to filter by
            
        Returns:
            Dict with drug shortage data
        """
        await self._rate_limit()
        logger.info(f"OpenFDA Agent checking drug shortages")
        
        url = f"{self.base_url}/drug/drugshortages.json"
        
        if drug_name:
            params = self._add_api_key({
                "search": f"product_description:{drug_name}",
                "limit": 10
            })
        else:
            params = self._add_api_key({"limit": 20})
        
        try:
            response = await self.client.get(url, params=params)
            response.raise_for_status()
            data = response.json()
            
            if "results" not in data:
                return {"message": "No drug shortages found", "query": drug_name}
            
            shortages = []
            for result in data["results"]:
                shortages.append({
                    "product_description": result.get("product_description"),
                    "status": result.get("status"),
                    "shortage_status": result.get("shortage_status"),
                    "reason": result.get("reason", []),
                    "current_supply": result.get("current_supply"),
                    "availability": result.get("availability")
                })
            
            return {
                "agent": "OpenFDA",
                "query": drug_name,
                "total_shortages": len(shortages),
                "shortages": shortages
            }
            
        except httpx.HTTPError as e:
            if e.response.status_code == 404:
                return {"message": "No shortages found", "query": drug_name}
            logger.error(f"Drug shortage search failed: {e}")
            return {"error": str(e)}
