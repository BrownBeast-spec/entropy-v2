import json
import logging
from typing import List, Dict, Any
from .llm import LLMService

logger = logging.getLogger(__name__)

class Planner:
    def __init__(self, llm_service: LLMService):
        self.llm = llm_service

    def _build_system_prompt(self) -> str:
        return """As an AI assistant, your task is to parse biomedical queries into a structured JSON format. 
Return ONLY the JSON array. Do not include conversational filler, explanations, or markdown formatting.

Format: List of JSON objects with keys: "agent", "function", "args".

Available Agents:
1. Hawk: check_safety(drug_name: str) - Check FDA warnings and safety for specific drugs.
2. Biologist: validate_target(gene_symbol: str) - Validate gene targets, pathways, and associations.
3. Librarian: search_literature(disease: str, year: int) - Search PubMed for papers (default year=2024).

Examples:
Input: "Is Keytruda safe?"
Output: [{"agent": "Hawk", "function": "check_safety", "args": {"drug_name": "Keytruda"}}]

Input: "Validate KRAS and find recent papers on it."
Output: [
    {"agent": "Biologist", "function": "validate_target", "args": {"gene_symbol": "KRAS"}},
    {"agent": "Librarian", "function": "search_literature", "args": {"disease": "KRAS", "year": 2024}}
]

Input: "Tell me about structural variants of EGFR."
Output: [{"agent": "Biologist", "function": "validate_target", "args": {"gene_symbol": "EGFR"}}]

Input: "Recent papers on COVID-19 from 2020."
Output: [{"agent": "Librarian", "function": "search_literature", "args": {"disease": "COVID-19", "year": 2020}}]

Convert the following natural language query into the specified JSON schema.
"""

    def plan(self, user_query: str) -> List[Dict[str, Any]]:
        system_prompt = self._build_system_prompt()
        user_prompt = f"Input: \"{user_query}\"\nOutput:"
        
        response_text = self.llm.generate(user_prompt, system_prompt=system_prompt, temperature=0.1)
        
        # Clean response if necessary (sometimes LLMs add markdown code blocks)
        clean_text = response_text.strip()
        if clean_text.startswith("```json"):
            clean_text = clean_text[7:]
        if clean_text.endswith("```"):
            clean_text = clean_text[:-3]
        
        try:
            plan = json.loads(clean_text)
            return plan
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse plan JSON: {e}\nResponse was: {response_text}")
            return []
