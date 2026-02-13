from fastapi.testclient import TestClient
from engine.main import app
import logging
import os
import sys

# Configure logging
logging.basicConfig(level=logging.INFO)

# Ensure engine is in path
sys.path.append(os.path.abspath("engine"))

def test_librarian_endpoint():
    print("--- Testing /literature Endpoint (PubMed) ---")
    
    with TestClient(app) as client:
        term = "Glioblastoma"
        year = 2024
        print(f"Searching Literature for: {term} ({year})")
        
        response = client.get(f"/literature?term={term}&year={year}&limit=3")
        
        if response.status_code != 200:
            print(f"FAILED: Status Code {response.status_code}")
            print(f"Response: {response.text}")
            return

        data = response.json()
        
        if "error" in data:
            print(f"API Error: {data['error']}")
            return

        print(f"SUCCESS: Search completed")
        print(f"Agent: {data.get('agent')}")
        print(f"Total Papers Found in PubMed: {data.get('total_found')}")
        
        papers = data.get('top_papers', [])
        print(f"Papers Returned: {len(papers)}")
        
        for i, p in enumerate(papers, 1):
            print(f"\n[{i}] {p.get('title')}")
            print(f"    Journal: {p.get('journal')}")
            print(f"    Date: {p.get('pub_date')}")
            print(f"    Abstract: {p.get('abstract')[:200]}..." if p.get('abstract') else "    Abstract: None")
            print(f"    Link: {p.get('link')}")

if __name__ == "__main__":
    test_librarian_endpoint()
