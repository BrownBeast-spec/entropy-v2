import logging
import json
import os
import subprocess
from typing import List, Dict, Any, Optional
from engine.middleware.llm import LLMService

logger = logging.getLogger(__name__)

class ReportSynthesizer:
    """
    Synthesizes a comprehensive report from agent results using an LLM.
    Supports LaTeX output and PDF compilation.
    """
    def __init__(self, llm_service: LLMService):
        self.llm = llm_service

    def _format_context(self, agent_results: List[Dict[str, Any]]) -> str:
        """
        Formats raw agent output into a readable context for the LLM.
        """
        context_parts = []
        for res in agent_results:
            # Handle both success and failure cases
            if res.get("status") == "failed":
                continue
                
            result_data = res.get("result", {})
            agent_name = result_data.get("agent", "Unknown Agent")
            
            # Convert dict to string if needed
            if isinstance(result_data, dict):
                data_str = json.dumps(result_data, indent=2)
            else:
                data_str = str(result_data)
                
            context_parts.append(f"--- SOURCE: {agent_name} ---\n{data_str}\n")
            
        return "\n".join(context_parts)

    def _compile_pdf(self, tex_path: str, output_dir: str) -> Optional[str]:
        """
        Attempts to compile the LaTeX file to PDF using pdflatex.
        Returns the path to the PDF if successful, otherwise None.
        """
        try:
            # Check if pdflatex is installed
            subprocess.run(["pdflatex", "--version"], check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
            
            # Compile
            logger.info(f"Compiling LaTeX: {tex_path}")
            # Run twice for references/toc if needed, but once is usually enough for basic content
            # -interaction=nonstopmode prevents hanging on errors
            cmd = ["pdflatex", "-interaction=nonstopmode", f"-output-directory={output_dir}", tex_path]
            
            result = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
            
            if result.returncode == 0:
                pdf_filename = os.path.basename(tex_path).replace(".tex", ".pdf")
                pdf_path = os.path.join(output_dir, pdf_filename)
                logger.info(f"PDF compiled successfully: {pdf_path}")
                return pdf_path
            else:
                logger.error(f"PDF compilation failed. Exit code: {result.returncode}")
                logger.error(f"Stdout: {result.stdout.decode('utf-8')[:500]}...") # Log first 500 chars
                return None
                
        except FileNotFoundError:
            logger.warning("pdflatex not found. Skipping PDF compilation.")
            return None
        except Exception as e:
            logger.error(f"Error during PDF compilation: {e}")
            return None

    def synthesize_report(self, query: str, agent_results: List[Dict[str, Any]], output_dir: str = ".") -> Dict[str, Any]:
        """
        Generates a LaTeX report based on the query and agent results.
        Returns a dict with paths to the generated files.
        """
        context = self._format_context(agent_results)
        
        result = {
            "report_content": "",
            "tex_path": None,
            "pdf_path": None
        }
        
        if not context:
            result["report_content"] = "No data was retrieved from agents to answer this query."
            return result

        system_prompt = r"""You are an expert scientific researcher and technical writer.
Your task is to synthesize a comprehensive answer to the user's query based PRIMARILY on the provided context data from various agents.

OUTPUT FORMAT:
- You MUST output a valid, full **LaTeX** document.
- Use `\documentclass{article}`.
- Include `\usepackage{hyperref}` (for links), `\usepackage{geometry}`.
- Title: Based on the query.
- Use Sections (`\section`), Subsections (`\subsection`), and Itemize (`\begin{itemize}`).
- **Hyperlinks**: Use `\href{URL}{text}` for all links.
- **Citations**: 
    - Cite sources inline (e.g., "According to \href{url}{Hawk}...") where possible.
    - **MANDATORY**: Include a `\section{References}` at the very end.
    - List every source provided in the context (Papers from Librarian, Drug info from Hawk, Targets from Biologist).
    - Format: `\item Title/Description - \href{URL}{Link}`.

Report Content Guidelines:
1. **Accuracy**: Do not hallucinate. Use the provided links in the context.
2. **Tone**: Professional, objective, and detailed.
"""

        user_prompt = f"""
User Query: "{query}"

Context Data:
{context}

Generate the LaTeX report now.
"""
        logger.info("Synthesizer generating LaTeX report...")
        try:
            report_latex = self.llm.generate(user_prompt, system_prompt=system_prompt, max_tokens=4000)
            
            # Clean possible markdown wrapping
            if report_latex.startswith("```latex"):
                report_latex = report_latex[8:]
            elif report_latex.startswith("```"):
                report_latex = report_latex[3:]
            if report_latex.endswith("```"):
                report_latex = report_latex[:-3]
            
            result["report_content"] = report_latex.strip()
            
            # Save .tex file
            # Create a filename based on query or timestamp? using simple fixed name for now or hash
            filename = "report_output"
            tex_path = os.path.join(output_dir, f"{filename}.tex")
            
            with open(tex_path, "w") as f:
                f.write(result["report_content"])
            
            result["tex_path"] = tex_path
            logger.info(f"Saved LaTeX to: {tex_path}")
            
            # Compile PDF
            pdf_path = self._compile_pdf(tex_path, output_dir)
            result["pdf_path"] = pdf_path
            
            return result

        except Exception as e:
            logger.error(f"Report synthesis failed: {e}")
            result["report_content"] = f"Error generating report: {str(e)}"
            return result
