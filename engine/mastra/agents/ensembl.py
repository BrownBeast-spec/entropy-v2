import httpx
import logging
import asyncio
from typing import Dict, Any, Optional, List

# Configure logging
logger = logging.getLogger(__name__)

class EnsemblAgent:
    """
    Ensembl Agent (Genomic Specialist)
    
    API Capabilities:
    - Gene Lookup: Gene info by symbol or ID
    - Sequences: Genomic, transcript, protein sequences
    - Variation: SNPs, variants by rsID
    - Homology: Orthologs/paralogs across species
    - Cross-references: Links to external databases
    
    Rate Limit: 15 requests/second (recommended)
    """
    def __init__(self):
        self.base_url = "https://rest.ensembl.org"
        self.client = httpx.AsyncClient(timeout=30.0)
        
        # Rate limiting: 15 req/sec is safe
        self._rate_limit_delay = 0.067  # ~67ms between requests
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

    async def get_gene_info(self, symbol: str) -> Dict[str, Any]:
        """
        Lookup gene information by symbol.
        Endpoint: /lookup/symbol/homo_sapiens/{symbol}
        """
        await self._rate_limit()
        logger.info(f"Ensembl Agent searching for: {symbol}")
        url = f"{self.base_url}/lookup/symbol/homo_sapiens/{symbol}"
        headers = {"Content-Type": "application/json"}
        
        try:
            response = await self.client.get(url, headers=headers)
            if response.status_code == 404:
                return {"error": f"Gene '{symbol}' not found in Ensembl (Human)."}
            response.raise_for_status()
            
            data = response.json()
            return {
                "agent": "Ensembl",
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
        await self._rate_limit()
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
    
    async def get_variation(self, variant_id: str, species: str = "human") -> Dict[str, Any]:
        """
        Get variation information by variant ID (e.g., rs ID).
        Endpoint: /variation/:species/:id
        
        Args:
            variant_id: Variant identifier (e.g., "rs56116432")
            species: Species name (default: "human")
            
        Returns:
            Dict with variant information, population frequencies, consequences
        """
        await self._rate_limit()
        logger.info(f"Ensembl Agent fetching variation: {variant_id}")
        
        url = f"{self.base_url}/variation/{species}/{variant_id}"
        headers = {"Content-Type": "application/json"}
        
        try:
            response = await self.client.get(url, headers=headers)
            
            if response.status_code == 404:
                return {"error": f"Variant {variant_id} not found"}
            
            response.raise_for_status()
            data = response.json()
            
            # Extract key information
            return {
                "agent": "Ensembl",
                "variant_id": variant_id,
                "name": data.get("name"),
                "source": data.get("source"),
                "most_severe_consequence": data.get("most_severe_consequence"),
                "minor_allele": data.get("minor_allele"),
                "minor_allele_freq": data.get("minor_allele_freq"),
                "clinical_significance": data.get("clinical_significance", []),
                "mappings": data.get("mappings", [])[:3],  # Limit mappings
                "synonyms": data.get("synonyms", [])[:5]
            }
            
        except httpx.HTTPError as e:
            logger.error(f"Ensembl variation lookup failed: {e}")
            return {"error": str(e), "variant_id": variant_id}
    
    async def get_homology(self, gene_id: str, species: str = "human", target_species: Optional[str] = None) -> Dict[str, Any]:
        """
        Get homology information (orthologs/paralogs) for a gene.
        Endpoint: /homology/id/:species/:id
        
        Args:
            gene_id: Ensembl gene ID (e.g., "ENSG00000139618" for BRCA2)
            species: Source species (default: "human")
            target_species: Filter for specific target species (optional)
            
        Returns:
            Dict with homology data across species
        """
        await self._rate_limit()
        logger.info(f"Ensembl Agent fetching homology for: {gene_id}")
        
        url = f"{self.base_url}/homology/id/{species}/{gene_id}"
        headers = {"Content-Type": "application/json"}
        params = {}
        
        if target_species:
            params["target_species"] = target_species
        
        try:
            response = await self.client.get(url, headers=headers, params=params)
            
            if response.status_code == 404:
                return {"error": f"Gene {gene_id} not found or no homology data"}
            
            response.raise_for_status()
            data = response.json()
            
            if "data" not in data or not data["data"]:
                return {"message": "No homology data available", "gene_id": gene_id}
            
            # Parse homology data
            homologs = []
            for entry in data["data"][0].get("homologies", [])[:10]:  # Limit to 10
                homologs.append({
                    "type": entry.get("type"),  # ortholog_one2one, paralog, etc.
                    "species": entry.get("target", {}).get("species"),
                    "gene_id": entry.get("target", {}).get("id"),
                    "protein_id": entry.get("target", {}).get("protein_id"),
                    "identity": entry.get("target", {}).get("perc_id"),  # % identity
                    "coverage": entry.get("target", {}).get("perc_cov"),  # % coverage
                    "method": entry.get("method_link_type")
                })
            
            return {
                "agent": "Ensembl",
                "gene_id": gene_id,
                "species": species,
                "total_homologs": len(homologs),
                "homologs": homologs
            }
            
        except httpx.HTTPError as e:
            logger.error(f"Ensembl homology lookup failed: {e}")
            return {"error": str(e), "gene_id": gene_id}
    
    async def get_xrefs(self, gene_id: str, species: str = "human") -> Dict[str, Any]:
        """
        Get cross-references for a gene (links to other databases).
        Endpoint: /xrefs/id/:species/:id
        
        Args:
            gene_id: Ensembl gene ID
            species: Species name (default: "human")
            
        Returns:
            Dict with external database references
        """
        await self._rate_limit()
        logger.info(f"Ensembl Agent fetching cross-references for: {gene_id}")
        
        url = f"{self.base_url}/xrefs/id/{gene_id}"
        headers = {"Content-Type": "application/json"}
        
        try:
            response = await self.client.get(url, headers=headers)
            
            if response.status_code == 404:
                return {"error": f"Gene {gene_id} not found"}
            
            response.raise_for_status()
            data = response.json()
            
            # Group xrefs by database
            xrefs_by_db = {}
            for xref in data:
                db_name = xref.get("dbname")
                if db_name not in xrefs_by_db:
                    xrefs_by_db[db_name] = []
                
                xrefs_by_db[db_name].append({
                    "primary_id": xref.get("primary_id"),
                    "display_id": xref.get("display_id"),
                    "description": xref.get("description", "")[:100]  # Truncate
                })
            
            return {
                "agent": "Ensembl",
                "gene_id": gene_id,
                "total_xrefs": len(data),
                "databases": list(xrefs_by_db.keys()),
                "xrefs": xrefs_by_db
            }
            
        except httpx.HTTPError as e:
            logger.error(f"Ensembl xref lookup failed: {e}")
            return {"error": str(e), "gene_id": gene_id}
