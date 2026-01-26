from fastapi.testclient import TestClient
from engine.main import app
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)

def test_validate_endpoint():
    print("--- Testing /validate Endpoint ---")
    
    # Use TestClient (creates a synchronous wrapper around the async app)
    # Note: Because the app uses lifespan events for initialization, we need to ensure they run.
    # TestClient handles lifespan events by default.
    
    with TestClient(app) as client:
        gene = "EGFR"
        print(f"Requesting validation for: {gene}")
        
        response = client.get(f"/validate?gene={gene}")
        
        if response.status_code != 200:
            print(f"FAILED: Status Code {response.status_code}")
            print(f"Response: {response.text}")
            return

        data = response.json()
        
        if "error" in data:
            print(f"API Error: {data['error']}")
            return

        print(f"SUCCESS: Validated {gene}")
        print(f"Agent: {data.get('agent')}")
        
        # Check for all_pathways
        all_pathways = data.get('all_pathways', [])
        print(f"Total Pathways Returned: {len(all_pathways)}")
        
        if all_pathways:
            print("First 5 pathways from API:")
            for p in all_pathways[:5]:
                print(f"- {p}")
            
            # Check for specific known pathway
            expected = "Signaling by ERBB2"
            if expected in all_pathways:
                print(f"Confirmed presence of '{expected}'")
            else:
                print(f"WARNING: '{expected}' not found in API response")
        else:
            print("WARNING: No pathways returned in 'all_pathways'")

if __name__ == "__main__":
    test_validate_endpoint()
