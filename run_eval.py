try:
    from dotenv import load_dotenv
    # Load environment variables
    load_dotenv()
    load_dotenv("engine/.env")
except ImportError:
    print("Warning: python-dotenv not installed. Relying on system environment variables.")

import os
import argparse
from engine.middleware.llm import PerplexityLLMService, HuggingFaceLLMService
from engine.middleware.planner import Planner
from engine.evaluation.dataset import Dataset
from engine.evaluation.evaluator import Evaluator

def main():
    parser = argparse.ArgumentParser(description="Run Planner Evaluation")
    parser.add_argument("--model", type=str, default="perplexity", choices=["perplexity", "huggingface"], help="Model provider to use")
    parser.add_argument("--dataset", type=str, default="engine/evaluation/data/sample_queries.json", help="Path to dataset file")
    args = parser.parse_args()

    print(f"--- Starting Evaluation using {args.model} ---")

    # Initialize LLM
    if args.model == "perplexity":
        api_key = os.getenv("PERPLEXITY_API_KEY")
        if not api_key:
            print("Error: PERPLEXITY_API_KEY not found.")
            return
        llm = PerplexityLLMService(model_id="sonar-pro", api_key=api_key)
    else:
        api_key = os.getenv("HF_TOKEN")
        if not api_key:
            print("Error: HF_TOKEN not found.")
            return
        llm = HuggingFaceLLMService(model_id="meta-llama/Llama-3.1-8B-Instruct", api_key=api_key)

    # Initialize Planner
    planner = Planner(llm)

    # Initialize Dataset
    dataset = Dataset(args.dataset)
    print(f"Loaded {len(dataset.test_cases)} test cases.")

    # Run Eval
    evaluator = Evaluator(planner, dataset)
    evaluator.run()

if __name__ == "__main__":
    main()
