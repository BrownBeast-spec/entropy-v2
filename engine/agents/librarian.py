import httpx
import logging
import os
import xml.etree.ElementTree as ET
from typing import List, Dict, Any, Optional
from tenacity import retry, stop_after_attempt, wait_exponential

# Configure logging
logger = logging.getLogger(__name__)

class LibrarianAgent:
    def __init__(self):
        # Base URLs for NCBI E-utilities
        self.search_url = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi"
        self.fetch_url = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi"
        
        # NCBI requires an email for API access
        self.email = os.getenv("NCBI_EMAIL", "surajharlekar@gmail.com")
        self.api_key = os.getenv("NCBI_API_KEY")
        # FORCE IPv4: Workaround for environment network issues preferring IPv6 which fails
        self.client = httpx.AsyncClient(
            timeout=20.0, 
            transport=httpx.AsyncHTTPTransport(local_address="0.0.0.0")
        )

    async def close(self):
        """Close the underlying HTTP client."""
        await self.client.aclose()

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
    async def _make_request(self, url: str, params: Dict[str, Any]) -> httpx.Response:
        """
        Production Wrapper: Handles retries, timeouts, and API keys automatically.
        """
        if self.api_key:
            params['api_key'] = self.api_key
        
        response = await self.client.get(url, params=params)
        response.raise_for_status()
        return response

    async def search_literature(self, disease: str, year: int = 2024, limit: int = 5) -> Dict[str, Any]:
        logger.info(f"Librarian searching PubMed for: {disease} ({year})")
        
        # --- STEP 1: Search for IDs ---
        search_params = {
            "db": "pubmed",
            "term": f"{disease}[Title/Abstract] AND {year}[pdat]", # pdat = Publication Date
            "retmode": "json",
            "retmax": limit,
            "email": self.email
        }
        
        try:
            # 1. Get the list of IDs
            response = await self._make_request(self.search_url, search_params)
            data = response.json()
            
            id_list = data.get("esearchresult", {}).get("idlist", [])
            
            if not id_list:
                return {"error": "No papers found."}
            
            # --- STEP 2: Fetch Details for these IDs (XML Batch) ---
            fetch_params = {
                "db": "pubmed",
                "id": ",".join(id_list),
                "retmode": "xml",
                "email": self.email
            }
            
            # 2. Get the raw XML content
            xml_response = await self._make_request(self.fetch_url, fetch_params)
            
            # 3. Parse XML
            return self._parse_pubmed_xml(xml_response.text, disease, data.get("esearchresult", {}).get("count"))

        except httpx.HTTPError as e:
            logger.error(f"Librarian HTTP Error: {e}")
            return {"error": f"Librarian failed: {str(e)}"}
        except Exception as e:
            logger.error(f"Librarian Error: {e}")
            return {"error": f"Librarian failed: {str(e)}"}

    def _parse_pubmed_xml(self, xml_content: str, topic: str, total_found: str) -> Dict[str, Any]:
        """
        Robust parser that handles different Abstract formats using ElementTree.
        """
        papers = []
        try:
            root = ET.fromstring(xml_content)
            
            for article in root.findall(".//PubmedArticle"):
                # Safe Title Extraction
                title = article.findtext(".//ArticleTitle") or "No Title"
                
                # --- ROBUST ABSTRACT PARSING ---
                # Abstracts can be plain text OR multiple labeled sections (Background, Methods, etc.)
                abstract_texts = []
                abstract_node = article.find(".//Abstract")
                if abstract_node is not None:
                    for elem in abstract_node.findall("AbstractText"):
                        section = elem.get("Label", "") # Get "BACKGROUND", "RESULTS", etc.
                        text = elem.text or ""
                        if section:
                            abstract_texts.append(f"**{section}:** {text}")
                        else:
                            abstract_texts.append(text)
                
                full_abstract = "\n\n".join(abstract_texts) if abstract_texts else "No Abstract Available."
                # -------------------------------

                # ID Parsing
                pmid = article.findtext(".//PMID")
                
                # Journal Parsing
                journal = article.findtext(".//Journal/Title") or "Unknown Journal"
                
                # Date Parsing - Try PubDate first
                pub_date_node = article.find(".//PubDate")
                pub_date = "Unknown Date"
                if pub_date_node is not None:
                    year = pub_date_node.findtext("Year") or ""
                    month = pub_date_node.findtext("Month") or ""
                    day = pub_date_node.findtext("Day") or ""
                    pub_date = f"{year} {month} {day}".strip() or article.findtext(".//MedlineDate") or "Unknown Date"

                papers.append({
                    "id": pmid,
                    "title": title,
                    "journal": journal,
                    "pub_date": pub_date,
                    "abstract": full_abstract,
                    "link": f"https://pubmed.ncbi.nlm.nih.gov/{pmid}/"
                })
                
        except ET.ParseError as e:
            logger.error(f"XML Parse Error: {e}")
            return {"error": "Failed to parse PubMed XML response"}
            
        return {
            "agent": "Librarian",
            "topic": topic,
            "total_found": total_found,
            "top_papers": papers
        }
