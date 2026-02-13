import asyncio
import logging
from engine.mastra.agents.opentargets import OpenTargetsAgent

# Configure logging
logging.basicConfig(level=logging.INFO)

async def test_biologist_agent():
    print("--- Testing Async OpenTargets Agent with UniProt Integration ---")
    agent = OpenTargetsAgent()
    
    try:
        # Test with a known target (EGFR)
        gene_symbol = "EGFR"
        print(f"Validating Gene: {gene_symbol}")
        
        result = await agent.validate_target(gene_symbol)
        
        if "error" in result:
            print(f"Error: {result['error']}")
        else:
            # DEBUG: Use a temporary print to see raw locations if empty
            if not result.get('cellular_locations'):
                import json
                print(f"DEBUG: No locations found. Full result: {json.dumps(result, indent=2)}")
            
            print(f"Successfully validated '{gene_symbol}'")
            print(f"Agent: {result.get('agent')}")
            print(f"Resolved ID: {result.get('target_id')}")
            
            print("\n--- Protein Data (UniProt) ---")
            print(f"Locations: {', '.join(result.get('cellular_locations', []))}")
            print(f"Analysis: {result.get('analysis')}")
            
            print(f"\n--- Reactome Pathways (Found {result.get('total_pathways')} total) ---")
            for p in result.get('all_pathways', []):
                print(f"- {p}")

            print(f"\nMechanism: {result.get('mechanism_of_action')}")
            
            print("\n--- Top Disease Associations (Open Targets) ---")
            for assoc in result.get('top_associations', []):
                print(f"- {assoc}")
            
    finally:
        await agent.close()

if __name__ == "__main__":
    asyncio.run(test_biologist_agent())
