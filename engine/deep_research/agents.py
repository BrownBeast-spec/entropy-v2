"""Agent nodes for the research workflow using internal LLMService and specialized agents."""

import asyncio
from typing import List, Optional, Dict, Any
import logging
import time
import json
import re
import os
import subprocess

from engine.deep_research.state import ResearchState, ResearchPlan, SearchQuery, ReportSection, SearchResult
from engine.deep_research.utils.tools import get_research_tools, web_search
from engine.deep_research.config import config
from engine.deep_research.utils.credibility import CredibilityScorer
from engine.deep_research.utils.citations import CitationFormatter
from engine.deep_research.callbacks import (
    emit_planning_start, emit_planning_complete,
    emit_search_start, emit_search_results, 
    emit_extraction_start, emit_extraction_complete,
    emit_synthesis_start, emit_synthesis_progress, emit_synthesis_complete,
    emit_writing_start, emit_writing_section, emit_writing_complete,
    emit_error
)
from engine.middleware.llm import LLMService, HuggingFaceLLMService, PerplexityLLMService
from engine.deep_research.utils.agent_tools import consult_hawk, consult_librarian, close_agents

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def get_llm_service() -> LLMService:
    """Get LLM Service instance based on configuration."""
    if config.model_provider == "perplexity":
        logger.info(f"Using Perplexity LLM Service: {config.model_name}")
        return PerplexityLLMService(model_id=config.model_name, api_key=config.perplexity_api_key)
    elif config.model_provider == "huggingface":
        logger.info(f"Using Hugging Face LLM Service: {config.model_name}")
        return HuggingFaceLLMService(model_id=config.model_name, api_key=config.huggingface_token)
    else:
        # Fallback to defaults if legacy config is used, but per requirement we should default to one of above
        logger.warning(f"Unknown provider {config.model_provider}, defaulting to Perplexity")
        return PerplexityLLMService(model_id="sonar-pro", api_key=config.perplexity_api_key)


class ResearchPlanner:
    """Autonomous agent responsible for planning research strategy."""
    
    def __init__(self):
        self.llm = get_llm_service()
        self.max_retries = 3
        
    async def plan(self, state: ResearchState) -> dict:
        """Create a research plan using LLM Service."""
        logger.info(f"Planning research for: {state.research_topic}")
        
        await emit_planning_start(state.research_topic)
        
        system_prompt = f"""You are an expert research strategist. Create a comprehensive research plan.

## Available Specialized Research Agents:
1. **Hawk Agent**: Specialist in FDA drug safety, boxed warnings, dosage, and risks. 
   - Use for queries like: "Safety of [Drug]", "Boxed warnings for [Drug]"
2. **Librarian Agent**: Specialist in PubMed medical literature and clinical studies.
   - Use for queries like: "Recent studies on [Disease]", "Clinical trials for [Topic]"

## Your Core Responsibilities

### 1. Define SMART Research Objectives (3-5 objectives)
- Specific, Measurable, Achievable, Relevant, Time-aware

### 2. Design Strategic Search Queries (up to {config.max_search_queries} queries)
- Explicitly target Hawk or Librarian if the topic involves drugs or medical literature.
- Otherwise, use Web Search queries.
- Format queries to specific agents if applicable, e.g. "Consult Hawk: Ibuprofen" or "Consult Librarian: Liver Toxicity".

### 3. Structure the Report Outline (up to {config.max_report_sections} sections)
- Logical flow from background to conclusion.

Respond ONLY with valid JSON."""

        user_prompt = f"""Research Topic: {state.research_topic}

Create a detailed research plan in JSON format:
{{
    "topic": "refined topic",
    "objectives": ["obj1", ...],
    "search_queries": [
        {{"query": "Consult Hawk: [DrugName]", "purpose": "Check FDA safety data"}},
        {{"query": "Consult Librarian: [Topic]", "purpose": "Find recent papers"}},
        {{"query": "Web Search: [Query]", "purpose": "General context"}}
    ],
    "report_outline": ["Section 1", ...]
}}""" # Simplified JSON structure example
        
        for attempt in range(self.max_retries):
            try:
                # Call LLM Service
                response_text = self.llm.generate(
                    prompt=user_prompt, 
                    system_prompt=system_prompt,
                    temperature=0.7
                )
                
                # Parse JSON
                # Clean markdown code blocks if present
                clean_json = response_text.replace("```json", "").replace("```", "").strip()
                result = json.loads(clean_json)
                
                # Convert to ResearchPlan
                plan = ResearchPlan(
                    topic=result.get("topic", state.research_topic),
                    objectives=result.get("objectives", [])[:5],
                    search_queries=[
                        SearchQuery(query=sq["query"], purpose=sq["purpose"])
                        for sq in result.get("search_queries", [])[:config.max_search_queries]
                    ],
                    report_outline=result.get("report_outline", [])[:config.max_report_sections]
                )
                
                await emit_planning_complete(len(plan.search_queries), len(plan.report_outline))
                
                return {
                    "plan": plan,
                    "current_stage": "searching",
                    "iterations": state.iterations + 1
                }
                
            except Exception as e:
                logger.warning(f"Planning attempt {attempt + 1} failed: {str(e)}")
                if attempt == self.max_retries - 1:
                    return {"error": f"Planning failed: {str(e)}", "iterations": state.iterations + 1}
                else:
                    await asyncio.sleep(2 ** attempt)
        
        return {"error": "Planning failed", "iterations": state.iterations + 1}


class ResearchSearcher:
    """Autonomous agent responsible for executing research searches using specific tools."""
    
    def __init__(self):
        self.llm = get_llm_service() # We might use LLM to decide on refining queries if needed, mainly router logic here
        self.credibility_scorer = CredibilityScorer()
        
    async def search(self, state: ResearchState) -> dict:
        """Execute search queries using appropriate agents."""
        if not state.plan:
            return {"error": "No research plan available"}
        
        all_results = []
        all_credibility_scores = []
        
        total_queries = len(state.plan.search_queries)
        
        for i, query_obj in enumerate(state.plan.search_queries, 1):
            query = query_obj.query
            await emit_search_start(query, i, total_queries)
            
            try:
                # Direct routing based on query prefix (as instructed in planner)
                results_for_query = []
                
                if query.lower().startswith("consult hawk"):
                    # Extract drug name
                    drug_name = query.split(":")[1].strip()
                    hawk_data = await consult_hawk(drug_name)
                    
                    if "error" not in hawk_data:
                        # Convert to SearchResult
                        content = f"""
**Drug**: {hawk_data.get('drug')}
**Risk Level**: {hawk_data.get('risk_level')}
**Boxed Warning**: {hawk_data.get('safety_summary', {}).get('boxed_warning')}
**Contraindications**: {hawk_data.get('safety_summary', {}).get('contraindications')}
**Dosage**: {hawk_data.get('clinical_data', {}).get('dosage_instructions')}
**Indications**: {hawk_data.get('clinical_data', {}).get('indications')}
"""
                        results_for_query.append(SearchResult(
                            query=query,
                            title=f"FDA Safety Data: {drug_name}",
                            url=hawk_data.get('link', 'https://open.fda.gov'),
                            snippet=f"FDA Label information for {drug_name}. Risk Level: {hawk_data.get('risk_level')}",
                            content=content
                        ))
                    else:
                        logger.warning(f"Hawk failed: {hawk_data.get('error')}")

                elif query.lower().startswith("consult librarian"):
                    # Extract topic
                    topic = query.split(":")[1].strip()
                    librarian_data = await consult_librarian(topic)
                    
                    if "error" not in librarian_data and "top_papers" in librarian_data:
                        for paper in librarian_data["top_papers"]:
                            content = f"""
**Title**: {paper.get('title')}
**Journal**: {paper.get('journal')}
**Date**: {paper.get('pub_date')}
**Abstract**:
{paper.get('abstract')}
"""
                            results_for_query.append(SearchResult(
                                query=query,
                                title=paper.get('title'),
                                url=paper.get('link'),
                                snippet=paper.get('abstract')[:150] + "...",
                                content=content
                            ))
                    else:
                        logger.warning(f"Librarian failed: {librarian_data.get('error')}")

                else:
                    # Fallback to Web Search (using existing tool logic)
                    search_term = query.replace("Web Search:", "").strip()
                    web_results = await web_search(search_term, max_results=config.max_search_results_per_query)
                    
                    # Convert to SearchResult objects
                    for item in web_results:
                         results_for_query.append(SearchResult(
                            query=query,
                            title=item['title'],
                            url=item['url'],
                            snippet=item['snippet'],
                            content=None # Content extraction would happen usually, assuming web_search tool does naive or we skip full extraction for refactor speed unless critical
                        ))
                         # NOTE: Full content extraction is skipped here for brevity in refactor unless we re-integrate ContentExtractor. 
                         # Let's rely on snippets or add ContentExtractor if needed. For now, we assume snippet + URL is acceptable for standard search, 
                         # but for deep research we really want content. 
                         # Let's bring back content extraction just for web results
                    
                    from engine.deep_research.utils.web_utils import ContentExtractor
                    extractor = ContentExtractor()
                    enhanced_results = await extractor.enhance_search_results_async(results_for_query)
                    results_for_query = enhanced_results

                # Accumulate results
                all_results.extend(results_for_query)
                
            except Exception as e:
                logger.error(f"Error processing query '{query}': {e}")
        
        # Score results
        scored_results = self.credibility_scorer.score_search_results(all_results)
        
        # Filter (optional)
        filtered_scored = [
            item for item in scored_results
            if item['credibility']['score'] >= config.min_credibility_score 
            or "open.fda.gov" in item['result'].url # Whitelist Hawk
            or "pubmed.ncbi.nlm.nih.gov" in item['result'].url # Whitelist Librarian
        ]
        
        credibility_scores = [item['credibility'] for item in filtered_scored]
        sorted_results = [item['result'] for item in filtered_scored]
        
        await emit_extraction_complete(len(sorted_results), sum(len(r.content or "") for r in sorted_results))
        
        return {
            "search_results": sorted_results,
            "credibility_scores": credibility_scores,
            "current_stage": "synthesizing",
            "iterations": state.iterations + 1
        }


class ResearchSynthesizer:
    """Autonomous agent responsible for synthesizing research findings using LLM Service."""
    
    def __init__(self):
        self.llm = get_llm_service()
        self.max_retries = 3
        
    async def synthesize(self, state: ResearchState) -> dict:
        """Synthesize key findings."""
        if not state.search_results:
            return {"error": "No search results"}
            
        await emit_synthesis_start(len(state.search_results))
        
        system_prompt = """You are a senior research analyst. Analyze search results and extract verified findings.
Output as JSON array of strings: ["Finding 1 [1]", "Finding 2 [2]"].
Prioritize FDA and PubMed sources."""
        
        for attempt in range(self.max_retries):
            try:
                results_text = "\\n".join([
                    f"[{i+1}] {r.title} ({r.url})\\nContent: {r.content[:1000] if r.content else r.snippet}..."
                    for i, r in enumerate(state.search_results[:15])
                ])
                
                user_prompt = f"""Topic: {state.research_topic}
Search Results:
{results_text}

Extract 10-15 key findings as JSON array. Reference source numbers [1], [2], etc."""
                
                response_text = self.llm.generate(
                    prompt=user_prompt,
                    system_prompt=system_prompt,
                    temperature=0.5
                )
                
                # Parse JSON
                clean_json = response_text.replace("```json", "").replace("```", "").strip()
                try:
                    key_findings = json.loads(clean_json)
                except json.JSONDecodeError:
                    # Fallback line parsing
                    key_findings = [line.strip("- ") for line in clean_json.split("\n") if line.strip()]
                
                await emit_synthesis_complete(len(key_findings))
                
                return {
                    "key_findings": key_findings,
                    "current_stage": "reporting",
                    "iterations": state.iterations + 1
                }
                
            except Exception as e:
                logger.warning(f"Synthesis attempt {attempt + 1} failed: {str(e)}")
                if attempt == self.max_retries - 1:
                    return {"error": f"Synthesis failed: {str(e)}", "iterations": state.iterations + 1}
        
        return {"error": "Synthesis failed"}


class ReportWriter:
    """Autonomous agent responsible for writing research reports using LLM Service."""
    
    def __init__(self, citation_style: str = 'apa'):
        self.llm = get_llm_service()
        self.citation_style = citation_style
        self.citation_formatter = CitationFormatter()
        self.max_retries = 3
        
    async def write_report(self, state: ResearchState) -> dict:
        """Write final report."""
        if not state.plan or not state.key_findings:
            return {"error": "Insufficient data"}
            
        await emit_writing_start(len(state.plan.report_outline))
        
        report_sections = []
        
        try:
            total_sections = len(state.plan.report_outline)
            
            for section_idx, section_title in enumerate(state.plan.report_outline, 1):
                await emit_writing_section(section_title, section_idx, total_sections)
                
                section = await self._write_section(
                    state.research_topic,
                    section_title,
                    state.key_findings,
                    state.search_results
                )
                
                if section:
                    report_sections.append(section)
                        
            # Compile
            temp_state = ResearchState(
                research_topic=state.research_topic,
                plan=state.plan,
                report_sections=report_sections,
                search_results=state.search_results
            )
            
            final_report = self._compile_report(temp_state)
            
            # Format citations
            if state.search_results:
                final_report = self.citation_formatter.update_report_citations(
                    final_report,
                    style=self.citation_style,
                    search_results=state.search_results
                )
            
            # Generate LaTeX and PDF if requested
            pdf_path = None
            try:
                # Assuming output dir is current working directory or specific report dir
                output_dir = "reports"
                os.makedirs(output_dir, exist_ok=True)
                
                # Format to LaTeX
                tex_content = await self._generate_latex(final_report, state.research_topic)
                
                # Save .tex
                # Strict sanitization: replace spaces/non-word chars with underscores
                safe_title = re.sub(r'[^\w\-_\.]', '_', state.research_topic)[:50]
                tex_path = os.path.join(output_dir, f"{safe_title}.tex")
                with open(tex_path, "w") as f:
                    f.write(tex_content)
                
                # Compile PDF
                pdf_path = self._compile_pdf(tex_path, output_dir)
                if pdf_path:
                    logger.info(f"PDF generated successfully at {pdf_path}")
                
            except Exception as e:
                logger.error(f"Failed to generate PDF: {e}")
            
            await emit_writing_complete(len(final_report))
            
            # Cleanup agents
            await close_agents()
            
            return {
                "report_sections": report_sections,
                "final_report": final_report,
                "pdf_path": pdf_path, # Add PDF path to result
                "current_stage": "complete",
                "iterations": state.iterations + 1
            }
            
        except Exception as e:
            logger.error(f"Report generation failed: {e}")
            return {"error": str(e)}

    async def _write_section(self, topic, section_title, findings, search_results):
        logger.info(f"Writing section: {section_title}")
        
        system_prompt = f"""Write a comprehensive report section. Minimum {config.min_section_words} words. 
Use markdown. Cite sources [1], [2]. Return ONLY the markdown content."""
        
        sources_context = "\\n".join(
            f"[{i+1}] {r.title}" for i, r in enumerate(search_results[:15])
        )
        
        user_prompt = f"""Topic: {topic}
Section: {section_title}
Key Findings:
{chr(10).join(f"- {f}" for f in findings)}

Sources:
{sources_context}

Write the section content now."""
        
        try:
            content = self.llm.generate(
                prompt=user_prompt,
                system_prompt=system_prompt,
                temperature=0.7
            )
            
            # Extract cited sources
            citations = re.findall(r'\[(\d+)\]', content)
            source_urls = []
            for cite_num in set(citations):
                idx = int(cite_num) - 1
                if 0 <= idx < len(search_results):
                    source_urls.append(search_results[idx].url)
            
            section = ReportSection(
                title=section_title,
                content=content,
                sources=source_urls
            )
            return section
            
        except Exception as e:
            logger.error(f"Error writing section: {e}")
            return None

    def _compile_report(self, state: ResearchState) -> str:
        search_results = getattr(state, 'search_results', []) or []
        report_sections = getattr(state, 'report_sections', []) or []
        
        report_parts = [
            f"# {state.research_topic}\\n\\n",
            f"**Deep Research Report**\\n\\n",
            "## Executive Summary\\n\\n",
            f"Comprehensive analysis of {state.research_topic} based on {len(search_results)} sources.\\n\\n"
        ]
        
        for section in report_sections:
            report_parts.append(f"## {section.title}\\n\\n{section.content}\\n\\n")
            
        report_parts.append("## References\\n\\n")
        
        return "".join(report_parts)

    async def _generate_latex(self, markdown_content: str, title: str) -> str:
        """Convert synthesized Markdown report to LaTeX."""
        logger.info("Converting report to LaTeX...")
        
        system_prompt = r"""You are an expert technical writer and LaTeX specialist.
Convert the provided Markdown report into a professional LaTeX document.

REQUIREMENTS:
1. Use `\documentclass{article}` with `geometry` package.
2. Use `hyperref` for links.
3. Use `booktabs` for tables if any.
4. Use `graphicx` for images if any.
5. Ensure all special characters (%, $, _, &, #) are properly escaped.
6. Create a professional Title page using `\maketitle`.
7. Convert Markdown headers (#, ##) to \section and \subsection.
8. Convert Markdown bold/italic to \textbf and \textit.
9. Convert Markdown lists to itemize/enumerate.
10. KEEP all citations and URL links intact.
11. Output ONLY valid LaTeX code. No wrapping ```latex blocks.
12. REQUIRED: consistently use \begin{document} and \end{document}.

CRITICAL: DO NOT use 'sectsty', 'titlesec', or any non-standard packages. 
Stick to standard LaTeX packages available in basic TeX Live distributions.
"""
        
        user_prompt = f"""Title: {title}

Markdown Content:
{markdown_content}

Convert to LaTeX now."""
        
        tex_content = self.llm.generate(
            prompt=user_prompt,
            system_prompt=system_prompt,
            temperature=0.3
        )
        
        # Cleanup
        if tex_content.startswith("```latex"):
            tex_content = tex_content[8:]
        elif tex_content.startswith("```"):
            tex_content = tex_content[3:]
        if tex_content.endswith("```"):
            tex_content = tex_content[:-3]
            
        return tex_content.strip()

    def _compile_pdf(self, tex_path: str, output_dir: str) -> Optional[str]:
        """Compile LaTeX to PDF."""
        try:
            cmd = ["pdflatex", "-interaction=nonstopmode", f"-output-directory={output_dir}", tex_path]
            # Run twice for refs
            subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
            result = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
            
            if result.returncode == 0:
                pdf_filename = os.path.basename(tex_path).replace(".tex", ".pdf")
                return os.path.join(output_dir, pdf_filename)
            else:
                logger.error(f"PDF compilation failed: {result.stdout.decode('utf-8')[:500]}...")
                return None
        except Exception as e:
            logger.error(f"PDF compilation error: {e}")
            return None
