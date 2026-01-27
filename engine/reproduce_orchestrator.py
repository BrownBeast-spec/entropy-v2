import asyncio
import os
import logging
from engine.middleware.planner import Planner
from engine.middleware.llm import LLMService
from engine.agents.hawk import HawkAgent
from engine.agents.biologist import BiologistAgent
from engine.agents.librarian import LibrarianAgent
from engine.orchestrator import Orchestrator

# Setup basic logging
logging.basicConfig(level=logging.INFO)

class MockLLM(LLMService):
    """Mock LLM to avoid API costs during verification and deterministic testing."""
    def __init__(self):
        pass
        
    def generate(self, prompt: str, system_prompt: str = None, temperature: float = 0.0) -> str:
        # Simple mock response based on keyword presence
        if "Keytruda" in prompt:
            return '''```json
            [
                {"agent": "Hawk", "function": "check_safety", "args": {"drug_name": "Keytruda"}},
                {"agent": "Librarian", "function": "search_literature", "args": {"disease": "Pembrolizumab", "year": 2024}}
            ]
            ```'''
        elif "EGFR" in prompt:
             return '''```json
            [
                {"agent": "Biologist", "function": "validate_target", "args": {"gene_symbol": "EGFR"}}
            ]
            ```'''
        else:
            return "[]"

async def main():
    print("--- Initializing Components ---")
    
    # 1. Initialize Mocks/Real Components
    # We use MockLLM for the planner to ensure we get a valid plan without hitting an LLM API
    mock_llm = MockLLM()
    planner = Planner(llm_service=mock_llm)
    
    # We use real agents (assuming they can handle requests or fail gracefully if no API keys)
    # Note: If API keys are missing, they might return errors, which is fine for orchestrator testing (error handling test)
    hawk = HawkAgent()
    biologist = BiologistAgent()
    librarian = LibrarianAgent()
    
    orchestrator = Orchestrator(planner, hawk, biologist, librarian)
    
    # 2. Test Case 1: Keytruda
    query = "Is Keytruda safe and what are recent papers?"
    print(f"\n--- Processing Query: {query} ---")
    result = await orchestrator.process_query(query)
    
    import json
    print(json.dumps(result, indent=2))
    
    # 3. Cleanup
    await hawk.close()
    await biologist.close()
    await librarian.close()

if __name__ == "__main__":
    asyncio.run(main())
