import logging
import asyncio
from typing import Dict, Any, List, Optional
from engine.middleware.planner import Planner
from engine.agents.hawk import HawkAgent
from engine.agents.biologist import BiologistAgent
from engine.agents.librarian import LibrarianAgent

from engine.middleware.synthesizer import ReportSynthesizer

logger = logging.getLogger(__name__)

class Orchestrator:
    """
    Orchestrates the flow from User Query -> Planner -> Agents -> Results.
    Designed to be modular for future Ray integration.
    """
    def __init__(
        self, 
        planner: Planner, 
        hawk: HawkAgent, 
        biologist: BiologistAgent, 
        librarian: LibrarianAgent,
        synthesizer: Optional[ReportSynthesizer] = None
    ):
        self.planner = planner
        self.synthesizer = synthesizer
        self.agents = {
            "Hawk": hawk,
            "Biologist": biologist,
            "Librarian": librarian
        }

    async def _execute_action(self, action: Dict[str, Any]) -> Dict[str, Any]:
        """
        Executes a single action derived from the plan.
        
        Action format expected:
        {
            "agent": "AgentName",
            "function": "function_name",
            "args": { ... }
        }
        """
        agent_name = action.get("agent")
        function_name = action.get("function")
        args = action.get("args", {})

        agent = self.agents.get(agent_name)
        if not agent:
            error_msg = f"Unknown agent: {agent_name}"
            logger.error(error_msg)
            return {"error": error_msg, "action": action}

        if not hasattr(agent, function_name):
            error_msg = f"Agent {agent_name} has no function '{function_name}'"
            logger.error(error_msg)
            return {"error": error_msg, "action": action}

        try:
            func = getattr(agent, function_name)
            
            # Check if function is async
            if asyncio.iscoroutinefunction(func):
                result = await func(**args)
            else:
                result = func(**args)
                
            return {
                "action": action,
                "status": "success",
                "result": result
            }
        except Exception as e:
            logger.exception(f"Error executing action {action}: {e}")
            return {
                "action": action,
                "status": "failed",
                "error": str(e)
            }

    async def process_query(self, user_query: str) -> Dict[str, Any]:
        """
        Main entry point:
        1. Plan
        2. Execute (Parallelized where possible)
        3. Aggregate
        """
        logger.info(f"Orchestrator processing: {user_query}")
        
        # 1. Plan
        try:
            # Planner.plan is currently synchronous, but we might want to make it async later.
            # For now, it's a CPU bound or blocking IO bound call depending on LLM inside.
            # If Planner.plan is blocking, better wrap it if we want full async, 
            # but usually for this architecture we just call it.
            # Looking at planner.py, it calls self.llm.generate. 
            # If self.llm.generate is sync (which it seems to be in standard implementations unless async is specified),
            # then this will block. For now we accept it.
            plan = self.planner.plan(user_query)
        except Exception as e:
            logger.error(f"Planning failed: {e}")
            return {"error": f"Planning failed: {e}"}

        logger.info(f"Generated Plan: {plan}")

        if not plan:
            return {"message": "No actions planned.", "results": []}

        # 2. Execute Actions
        # We can execute them in parallel using asyncio.gather for efficiency
        tasks = [self._execute_action(action) for action in plan]
        results = await asyncio.gather(*tasks)

        # 3. Aggregate Results and Synthesize Report
        response = {
            "query": user_query,
            "plan_count": len(plan),
            "results": results,
            "report": None
        }

        if self.synthesizer:
             # Synthesize report using the results
             # We can default to current directory or a specific artifacts folder. 
             # For now, let's use current working directory or pass it in via process_query if needed.
             # but keeping it simple: current dir.
             report_result = self.synthesizer.synthesize_report(user_query, results, output_dir=".")
             response["report"] = report_result
        
        return response
