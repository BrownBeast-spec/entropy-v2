
import asyncio
import os
import sys

# Ensure src path is available
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from engine.deep_research.graph import run_research
from engine.deep_research.config import config

try:
    from dotenv import load_dotenv
    # Load environment variables
    load_dotenv()
    load_dotenv("engine/.env")
except ImportError:
    print("Warning: python-dotenv not installed. Relying on system environment variables.")


async def main():
    print("Testing Deep Research Refactor (Medical Topic)...")
    
    # Configure for faster test run
    config.max_search_queries = 2
    config.max_search_results_per_query = 2
    config.max_report_sections = 2
    config.min_section_words = 50 
    
    # Topic that should trigger Hawk (Ibuprofen) and Librarian (Liver Toxicity)
    topic = "Safety profile of Ibuprofen and recent studies on liver toxicity 2024"
    
    try:
        print(f"Starting research on: {topic}")
        print(f"Provider: {config.model_provider}")
        
        result = await run_research(topic, verbose=True, use_cache=False)
        
        if result.get("error"):
            print(f"❌ Error occurred: {result['error']}")
        else:
            print("✅ Research completed successfully")
            print(f"Report length: {len(result.get('final_report', ''))} chars")
            
            # Verify we got specific agent results
            search_results = result.get('search_results', [])
            hawk_hits = sum(1 for r in search_results if "open.fda.gov" in r.url)
            librarian_hits = sum(1 for r in search_results if "pubmed" in r.url or "ncbi" in r.url)
            
            print(f"Hawk Hits (FDA): {hawk_hits}")
            print(f"Librarian Hits (PubMed): {librarian_hits}")
            
            if hawk_hits > 0 and librarian_hits > 0:
                print("✅ SUCCESS: Both Hawk and Librarian agents were utilized.")
            else:
                print("⚠️ WARNING: One or more agents were not utilized as expected.")

            # Verify PDF Generation
            pdf_path = result.get("pdf_path")
            if pdf_path and os.path.exists(pdf_path):
                print(f"✅ SUCCESS: PDF generated at: {pdf_path}")
            else:
                print(f"❌ FAILURE: PDF not generated. Path: {pdf_path}")

            print("-" * 50)
            print(result.get("final_report", "")[:500] + "...")
            
    except Exception as e:
        print(f"❌ Exception occurred: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(main())
