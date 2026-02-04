"""Configuration management for the Deep Research Agent."""

import os
from typing import Optional
from pathlib import Path
from pydantic import BaseModel, Field
from dotenv import load_dotenv

# Load environment variables from .env file
# engine/deep_research/config.py -> engine/deep_research -> engine -> entropy-v2
env_path = Path(__file__).parent.parent.parent / ".env"
load_dotenv(dotenv_path=env_path)


class ResearchConfig(BaseModel):
    """Configuration for the research agent."""

    # Model Provider Configuration
    # Options: 'perplexity', 'huggingface' (internal services), or 'gemini', 'ollama' (legacy/direct)
    model_provider: str = Field(
        default=os.getenv("MODEL_PROVIDER", "perplexity"),
        description="Model provider: 'perplexity', 'huggingface'"
    )
    
    # Internal LLM Service Configuration
    perplexity_api_key: str = Field(
        default_factory=lambda: os.getenv("PERPLEXITY_API_KEY", ""),
        description="Perplexity API Key"
    )
    
    huggingface_token: str = Field(
        default_factory=lambda: os.getenv("HF_TOKEN", ""),
        description="Hugging Face Token"
    )
    
    # Legacy/Direct API Keys (kept for fallback compatibility if needed)
    google_api_key: str = Field(
        default_factory=lambda: os.getenv("GEMINI_API_KEY", ""),
        description="Google/Gemini API key"
    )
    
    openai_api_key: str = Field(
        default_factory=lambda: os.getenv("OPENAI_API_KEY", ""),
        description="OpenAI API key"
    )
    
    # Ollama Configuration
    ollama_base_url: str = Field(
        default=os.getenv("OLLAMA_BASE_URL", "http://localhost:11434"),
        description="Ollama server URL"
    )
    
    # Model Configuration
    model_name: str = Field(
        default=os.getenv("MODEL_NAME", "sonar-pro"), # Default to Perplexity's sonar-pro
        description="Model to use for research and generation"
    )
    
    summarization_model: str = Field(
        default=os.getenv("SUMMARIZATION_MODEL", "sonar-pro"),
        description="Model for summarizing search results"
    )
    
    # Search Configuration
    max_search_queries: int = Field(
        default=int(os.getenv("MAX_SEARCH_QUERIES", "3")),
        description="Maximum number of search queries to generate"
    )
    
    max_search_results_per_query: int = Field(
        default=int(os.getenv("MAX_SEARCH_RESULTS_PER_QUERY", "3")),
        description="Maximum results to fetch per search query"
    )
    
    # Agent Keys
    ncbi_email: str = Field(
        default_factory=lambda: os.getenv("NCBI_EMAIL", "surajharlekar@gmail.com"),
        description="Email for NCBI (Librarian Agent)"
    )
    
    openfda_api_key: str = Field(
        default_factory=lambda: os.getenv("OPENFDA_API_KEY", ""),
        description="API Key for OpenFDA (Hawk Agent)"
    )
    
    ncbi_api_key: str = Field(
        default_factory=lambda: os.getenv("NCBI_API_KEY", ""),
        description="API Key for NCBI (Librarian Agent)"
    )
    
    # Credibility Configuration
    min_credibility_score: int = Field(
        default=int(os.getenv("MIN_CREDIBILITY_SCORE", "40")),
        description="Minimum credibility score (0-100)"
    )
    
    # Report Configuration
    max_report_sections: int = Field(
        default=int(os.getenv("MAX_REPORT_SECTIONS", "8")),
        description="Maximum number of sections in the final report"
    )
    
    min_section_words: int = Field(
        default=200,
        description="Minimum words per section"
    )
    
    # Citation Configuration
    citation_style: str = Field(
        default=os.getenv("CITATION_STYLE", "apa"),
        description="Citation style (apa, mla, chicago, ieee)"
    )
    
    def validate_config(self) -> bool:
        """Validate that required configuration is present."""
        if self.model_provider == "perplexity":
            if not self.perplexity_api_key:
                raise ValueError("PERPLEXITY_API_KEY is required for 'perplexity' provider.")
        elif self.model_provider == "huggingface":
            if not self.huggingface_token:
                raise ValueError("HF_TOKEN is required for 'huggingface' provider.")
        
        return True


# Global configuration instance
config = ResearchConfig()

# Log configuration for debugging
import logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)
logger.info(f"Configuration loaded - Provider: {config.model_provider}, Model: {config.model_name}")
