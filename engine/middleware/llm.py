import os
import logging
from abc import ABC, abstractmethod
from typing import Optional, Dict, Any
from huggingface_hub import InferenceClient

logger = logging.getLogger(__name__)

class LLMService(ABC):
    @abstractmethod
    def generate(self, prompt: str, **kwargs) -> str:
        pass

class HuggingFaceLLMService(LLMService):
    def __init__(self, model_id: str = "meta-llama/Meta-Llama-3.1-8B-Instruct", api_key: Optional[str] = None):
        """
        Initialize the Hugging Face Inference Client.
        
        Args:
            model_id: The model ID to use (default: Llama 3.1 8B Instruct)
            api_key: API key for authentication. Defaults to HF_TOKEN env var.
        """
        self.model_id = model_id
        # Prioritize NOVITA_API_KEY as requested, fallback to HF_TOKEN
        self.api_key = api_key or os.getenv("HF_TOKEN")
        
        if not self.api_key:
            logger.warning("No API key found (HF_TOKEN). LLM calls may fail.")

        # Initialize client
        # Note: If Novita requires a specific base_url, it can be passed here if known.
        # For now assuming standard HF Interface compatibility.
        self.client = InferenceClient(token=self.api_key)

    def generate(self, prompt: str, max_tokens: int = 1024, temperature: float = 0.7) -> str:
        try:
            # Using chat completion if available for instruction tuned models to respect tokens
            messages = [{"role": "user", "content": prompt}]
            
            # The client handles the API call
            response = self.client.chat_completion(
                model=self.model_id,
                messages=messages,
                max_tokens=max_tokens,
                temperature=temperature
            )
            
            return response.choices[0].message.content
            
        except Exception as e:
            logger.error(f"LLM Generation failed: {e}")
            raise
