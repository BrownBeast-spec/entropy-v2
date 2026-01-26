import json
import logging
from typing import List, Dict, Any
from .llm import LLMService

logger = logging.getLogger(__name__)

class Planner:
    def __init__(self, llm_service: LLMService):
        self.llm = llm_service

    def _build_system_prompt(self) -> str:
        return """
You are an expert AI Planner for a biomedical system.
Your goal is to breakdown a user's natural language query into a sequence of specific Agent actions.

Available Agents:
1. Hawk Agent
   - Function: check_safety(drug_name: str)
   - Description: Checks FDA warnings and safety profile for a specific drug.

2. Biologist Agent
   - Function: validate_target(gene_symbol: str)
   - Description: Validates a gene target, providing pathways, cellular location, and disease associations.

3. Librarian Agent
   - Function: search_literature(disease: str, year: int)
   - Description: Searches PubMed for recent papers on a disease or topic. Default year is 2024.

Output Format:
Return ONLY a valid JSON list of actions. Do not add any markdown formatting or explanation.
Each action should be an object with: "agent", "function", and "args".

Example:
Query: "Is Keytruda safe and what is the role of EGFR in cancer?"
Response:
[
    {"agent": "Hawk", "function": "check_safety", "args": {"drug_name": "Keytruda"}},
    {"agent": "Biologist", "function": "validate_target", "args": {"gene_symbol": "EGFR"}}
]
"""

    def plan(self, user_query: str) -> List[Dict[str, Any]]:
        prompt = f"{self._build_system_prompt()}\n\nQuery: \"{user_query}\"\nResponse:"
        
        response_text = self.llm.generate(prompt, temperature=0.1)
        
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
