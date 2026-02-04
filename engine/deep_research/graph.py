"""LangGraph workflow for deep research."""

from langgraph.graph import StateGraph, START, END
from engine.deep_research.state import ResearchState
from engine.deep_research.agents import ResearchPlanner, ResearchSearcher, ResearchSynthesizer, ReportWriter
from engine.deep_research.config import config
import logging
import json
import hashlib
from pathlib import Path
from typing import Optional, Dict

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class ResearchCache:
    """Simple file-based cache for research results."""
    
    def __init__(self, cache_dir: str = ".cache/research"):
        self.cache_dir = Path(cache_dir)
        self.cache_dir.mkdir(parents=True, exist_ok=True)
    
    def _get_cache_key(self, topic: str) -> str:
        """Generate cache key from topic."""
        return hashlib.md5(topic.lower().strip().encode()).hexdigest()
    
    def get(self, topic: str) -> Optional[Dict]:
        """Get cached result for topic."""
        cache_file = self.cache_dir / f"{self._get_cache_key(topic)}.json"
        if cache_file.exists():
            try:
                with open(cache_file, 'r') as f:
                    data = json.load(f)
                    # Convert to ResearchState dict usually requires careful handling
                    # For simplicity, we just return the raw dict and let the caller handle it
                    # or better, just cache the final report?
                    return data
            except Exception as e:
                logger.warning(f"Failed to read cache: {e}")
        return None
    
    def set(self, topic: str, data: Dict):
        """Cache result for topic."""
        cache_file = self.cache_dir / f"{self._get_cache_key(topic)}.json"
        try:
            # Need to serialize custom objects (pydantic models) in the dict
            # This is complex if we store the whole state.
            # For now, let's just accept the dict assuming it's JSON serializable
            # or converting pydantic models to dicts
            
            def json_serial(obj):
                """JSON serializer for objects not serializable by default json code"""
                if hasattr(obj, 'model_dump'):
                    return obj.model_dump()
                if hasattr(obj, 'dict'):
                    return obj.dict()
                return str(obj)

            with open(cache_file, 'w') as f:
                json.dump(data, f, default=json_serial, indent=2)
        except Exception as e:
            logger.warning(f"Failed to write cache: {e}")


def create_research_graph():
    """Create the research workflow graph with enhanced routing and error handling."""
    
    # Initialize agents
    planner = ResearchPlanner()
    searcher = ResearchSearcher()
    synthesizer = ResearchSynthesizer()
    writer = ReportWriter(citation_style=config.citation_style)
    
    # Define the graph
    workflow = StateGraph(ResearchState)
    
    # Add nodes - functions return dicts that LangGraph merges into state
    workflow.add_node("plan", planner.plan)
    workflow.add_node("search", searcher.search)
    workflow.add_node("synthesize", synthesizer.synthesize)
    workflow.add_node("write_report", writer.write_report)
    
    # Define entry point
    workflow.add_edge(START, "plan")
    
    def should_continue_after_plan(state: ResearchState) -> str:
        """Validate planning output and route appropriately."""
        if state.error:
            logger.error(f"Planning failed: {state.error}")
            return END
        
        if not state.plan or not state.plan.search_queries:
            logger.error("No search queries generated in plan")
            # state.error = "Failed to generate valid research plan" # State is immutable in validation func? No, but we return edge
            return END
            
        logger.info(f"Plan validated: {len(state.plan.search_queries)} queries")
        return "search"
    
    def should_continue_after_search(state: ResearchState) -> str:
        """Validate search results and route appropriately."""
        if state.error:
            logger.error(f"Search failed: {state.error}")
            return END
        
        if not state.search_results:
            logger.warning("No search results found")
            return END
        
        # Check minimum threshold
        if len(state.search_results) < 1:
            logger.warning(f"Insufficient search results: {len(state.search_results)}")
            return END
            
        logger.info(f"Search validated: {len(state.search_results)} results")
        return "synthesize"
    
    def should_continue_after_synthesize(state: ResearchState) -> str:
        """Validate synthesis output and route appropriately."""
        if state.error:
            logger.error(f"Synthesis failed: {state.error}")
            return END
        
        if not state.key_findings:
            logger.warning("No key findings extracted")
            return END
        
        logger.info(f"Synthesis validated: {len(state.key_findings)} findings")
        return "write_report"
    
    def should_continue_after_report(state: ResearchState) -> str:
        """Validate final report and complete workflow."""
        if state.error:
            logger.error(f"Report generation failed: {state.error}")
        elif not state.final_report:
            logger.error("No report generated")
        else:
            logger.info("Report generation complete")
            
        return END
    
    # Add conditional edges with validation
    workflow.add_conditional_edges(
        "plan",
        should_continue_after_plan,
        {
            "search": "search",
            END: END
        }
    )
    
    workflow.add_conditional_edges(
        "search",
        should_continue_after_search,
        {
            "synthesize": "synthesize",
            END: END
        }
    )
    
    workflow.add_conditional_edges(
        "synthesize",
        should_continue_after_synthesize,
        {
            "write_report": "write_report",
            END: END
        }
    )
    
    workflow.add_conditional_edges(
        "write_report",
        should_continue_after_report,
        {
            END: END
        }
    )
    
    # Compile the graph
    return workflow.compile()


async def run_research(topic: str, verbose: bool = True, use_cache: bool = True) -> dict:
    """Run the research workflow for a given topic.
    
    Args:
        topic: Research topic
        verbose: Enable verbose logging
        use_cache: Use cached results if available
    
    Returns the complete accumulated state as a dict.
    """
    logger.info(f"Starting research on: {topic}")
    
    # Check cache first
    cache = ResearchCache()
    if use_cache:
        cached_result = cache.get(topic)
        if cached_result:
            logger.info("Using cached research result")
            return cached_result
    
    # Initialize state
    initial_state = ResearchState(research_topic=topic)
    
    # Create and run the graph
    graph = create_research_graph()
    
    # Execute the workflow using invoke to get complete final state
    final_state = await graph.ainvoke(initial_state)
    
    # Cache the result
    if use_cache and not final_state.get("error"):
        cache.set(topic, final_state)
    
    if verbose:
        logger.info("Workflow completed")
        if final_state.get("final_report"):
            logger.info(f"Report generated: {len(final_state['final_report'])} characters")
    
    return final_state
