import httpx
import logging
from typing import List, Optional, Dict, Any
from pydantic import BaseModel

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

BASE_URL = "https://clinicaltrials.gov/api/v2"

class IdentificationModule(BaseModel):
    nctId: Optional[str] = None
    briefTitle: Optional[str] = None
    officialTitle: Optional[str] = None
    acronym: Optional[str] = None
    orgStudyIdInfo: Optional[Dict[str, Any]] = None
    organization: Optional[Dict[str, Any]] = None

class StatusModule(BaseModel):
    overallStatus: Optional[str] = None
    statusVerifiedDate: Optional[str] = None
    whyStopped: Optional[str] = None
    startDateStruct: Optional[Dict[str, str]] = None
    completionDateStruct: Optional[Dict[str, str]] = None

class DescriptionModule(BaseModel):
    briefSummary: Optional[str] = None
    detailedDescription: Optional[str] = None

class ConditionsModule(BaseModel):
    conditions: Optional[List[str]] = None
    keywords: Optional[List[str]] = None

class DesignModule(BaseModel):
    studyType: Optional[str] = None
    phases: Optional[List[str]] = None
    designInfo: Optional[Dict[str, Any]] = None
    enrollmentInfo: Optional[Dict[str, Any]] = None

class EligibilityModule(BaseModel):
    eligibilityCriteria: Optional[str] = None
    healthyVolunteers: Optional[bool] = None
    sex: Optional[str] = None
    minimumAge: Optional[str] = None
    maximumAge: Optional[str] = None
    stdAges: Optional[List[str]] = None

class ContactsLocationsModule(BaseModel):
    overallOfficials: Optional[List[Dict[str, Any]]] = None
    locations: Optional[List[Dict[str, Any]]] = None

class ProtocolSection(BaseModel):
    identificationModule: Optional[IdentificationModule] = None
    statusModule: Optional[StatusModule] = None
    descriptionModule: Optional[DescriptionModule] = None
    conditionsModule: Optional[ConditionsModule] = None
    designModule: Optional[DesignModule] = None
    eligibilityModule: Optional[EligibilityModule] = None
    contactsLocationsModule: Optional[ContactsLocationsModule] = None
    # Add other modules as needed (sponsorCollaborators, oversight, armsInterventions, outcomes, etc.)
    sponsorCollaboratorsModule: Optional[Dict[str, Any]] = None
    oversightModule: Optional[Dict[str, Any]] = None
    armsInterventionsModule: Optional[Dict[str, Any]] = None
    outcomesModule: Optional[Dict[str, Any]] = None

class DerivedSection(BaseModel):
    miscInfoModule: Optional[Dict[str, Any]] = None
    conditionBrowseModule: Optional[Dict[str, Any]] = None
    interventionBrowseModule: Optional[Dict[str, Any]] = None

class Study(BaseModel):
    protocolSection: Optional[ProtocolSection] = None
    derivedSection: Optional[DerivedSection] = None
    hasResults: Optional[bool] = None

class ClinicalTrialsResponse(BaseModel):
    studies: List[Study]
    nextPageToken: Optional[str] = None

class ClinicalTrialsV2:
    def __init__(self):
        self.base_url = BASE_URL
        self.client = httpx.AsyncClient(base_url=self.base_url, timeout=30.0)

    async def close(self):
        await self.client.aclose()

    async def get_version(self) -> Dict[str, Any]:
        """
        Check dataTimestamp field in the returned JSON.
        Ref: GET /api/info/data_vrs
        """
        try:
            response = await self.client.get("/version")
            response.raise_for_status()
            return response.json()
        except httpx.HTTPError as e:
            logger.error(f"Failed to get version: {e}")
            raise

    async def search_studies(self, term: str, limit: int = 10, page_token: Optional[str] = None) -> Dict[str, Any]:
        """
        Performs a search with dynamic pagination to reach the requested limit.
        Ref: GET /api/query/full_studies — Full studies
        """
        all_studies = []
        next_page_token = page_token

        try:
            while len(all_studies) < limit:
                # Calculate how many items needed, capped by API max (assuming 1000 or reasonable chunk)
                remaining = limit - len(all_studies)
                # API max page size is 1000. Let's request what we need up to 1000.
                request_size = min(remaining, 1000)

                params = {
                    "query.term": term,
                    "pageSize": request_size
                }
                if next_page_token:
                    params['pageToken'] = next_page_token

                response = await self.client.get("/studies", params=params)
                response.raise_for_status()
                data = response.json()
                
                studies = data.get("studies", [])
                all_studies.extend(studies)
                
                next_page_token = data.get("nextPageToken")
                
                # If no next page, break
                if not next_page_token:
                    break
            
            # Construct final response. Note: We return the last seen nextPageToken 
            # so the user can continue from where we left off if they want MORE than 'limit'.
            return {
                "studies": all_studies[:limit], # Ensure we don't return more than requested if the last page overshot
                "nextPageToken": next_page_token
            }

        except httpx.HTTPError as e:
            logger.error(f"Failed to search studies with term '{term}': {e}")
            raise

    async def get_specific_fields(self, term: str, fields_list: List[str]) -> Dict[str, Any]:
        """
        Returns values from selected API fields.
        Ref: GET /api/query/study_fields — Study fields
        """
        # Join list into comma-separated string
        fields_param = ",".join(fields_list)
        
        params = {
            "query.term": term,
            "fields": fields_param
        }
        try:
            response = await self.client.get("/studies", params=params)
            response.raise_for_status()
            return response.json()
        except httpx.HTTPError as e:
            logger.error(f"Failed to get specific fields for term '{term}': {e}")
            raise

    async def get_single_study(self, nct_id: str) -> Dict[str, Any]:
        """
        Returns single study record data.
        Ref: GET /ct2/show/{nctId}?displayxml=true
        """
        try:
            response = await self.client.get(f"/studies/{nct_id}")
            response.raise_for_status()
            return response.json()
        except httpx.HTTPError as e:
            logger.error(f"Failed to get study {nct_id}: {e}")
            raise

# --- Execution for testing ---
if __name__ == "__main__":
    import asyncio

    async def main():
        client = ClinicalTrialsV2()
        try:
            # 1. Test Version
            print("--- API Version ---")
            version = await client.get_version()
            print(version)

            # 2. Test Search (Full Studies)
            print("\n--- Search Results (Heart Failure) ---")
            search_results = await client.search_studies("heart failure", limit=5)
            # Limit output to prevent flooding
            import json
            print(json.dumps(search_results, indent=2)[:500] + "...") 

        except Exception as e:
            logger.error(f"An error occurred during testing: {e}")
        finally:
            await client.close()

    asyncio.run(main())
