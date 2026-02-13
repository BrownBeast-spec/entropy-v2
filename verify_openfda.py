import asyncio
import logging
from engine.mastra.agents.openfda import OpenFDAAgent
from dotenv import load_dotenv

# Configure logging to see agent output
logging.basicConfig(level=logging.INFO)

# Load environment variables
load_dotenv("./engine/.env")

async def test_hawk_agent():
    print("--- Testing Async OpenFDA Agent with Markdown Sanitization ---")
    agent = OpenFDAAgent()
    
    try:
        # Test with a known drug
        drug_name = "Keytruda"
        result = await agent.check_safety(drug_name)
        
        if "error" in result:
            print(f"Error: {result['error']}")
        else:
            print(f"Successfully fetched and cleaned data for '{result.get('drug')}'")
            print(f"Agent: {result.get('agent')}")
            print(f"Risk Level: {result.get('risk_level')}")
            
            summary = result.get('safety_summary', {})
            clinical = result.get('clinical_data', {})
            
            print("\n--- Boxed Warning (Markdown) ---")
            print(summary.get('boxed_warning', 'N/A')[:300] + "...")
            
            print("\n--- Dosage Instructions (Check for Markdown Table) ---")
            print(clinical.get('dosage_instructions', 'N/A')[:500] + "...")
            
            print("\n--- Indications (Markdown) ---")
            print(clinical.get('indications', 'N/A')[:300] + "...")
            
    finally:
        await agent.close()

if __name__ == "__main__":
    asyncio.run(test_hawk_agent())
