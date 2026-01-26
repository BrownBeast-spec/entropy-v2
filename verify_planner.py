import logging
import os
from engine.middleware.llm import HuggingFaceLLMService
from engine.middleware.planner import Planner

# Configure logging to see what's happening
logging.basicConfig(level=logging.INFO)

def main():
    print("--- Verifying Planner ---")
    
    # Check for API Key
    api_key = os.getenv("HF_TOKEN")
    if not api_key:
        print("WARNING: HF_TOKEN is not set. This verification might fail if the model requires auth.")
    
    # Initialize
    print("1. Initializing LLM Service...")
    # Using the specific Novita/HF model ID requested or default
    llm = HuggingFaceLLMService(model_id="meta-llama/Llama-3.1-8B-Instruct:novita")
    
    print("2. Initializing Planner...")
    planner = Planner(llm)
    
    # Test Query
    query = "Tell me about the design of clinical trials for Glioblastoma and check if Avastin has any boxed warnings."
    print(f"\nTest Query: \"{query}\"")
    
    print("\n3. Generating Plan...")
    try:
        plan = planner.plan(query)
        print("\n--- Generated Plan ---")
        import json
        print(json.dumps(plan, indent=2))
        
        # Simple Validation
        expected_agents = {"Librarian", "Hawk"} # Note: "design of clinical trials" maps best to Librarian (Literature) or maybe just implied. 
        # Actually in my prompt Librarian is "search_literature".
        # "check if Avastin has any boxed warnings" -> Hawk.
        # "design of clinical trials" -> Could be Librarian searching for papers on trial design? Or maybe I should have added ClinicalTrials agent?
        # Wait, I removed Scout (ClinicalTrials) from the immediate plan per user request.
        # So "Librarian" is the best fit for general knowledge/papers, or "Hawk" for the drug.
        
        agents_found = {step.get("agent") for step in plan}
        print(f"\nAgents found in plan: {agents_found}")
        
    except Exception as e:
        print(f"\nError verifying planner: {e}")

if __name__ == "__main__":
    main()
