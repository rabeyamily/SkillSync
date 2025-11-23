"""
LLM service wrapper for OpenAI API integration.
"""
import json
import time
from typing import Dict, List, Optional, Any
from openai import OpenAI, RateLimitError, APIError, APIConnectionError
from app.config import settings


class LLMService:
    """Service wrapper for LLM API calls with rate limiting and error handling."""
    
    def __init__(self):
        """Initialize LLM service with OpenAI client."""
        self.client = None
        self.api_key = settings.openai_api_key
        # Read model dynamically from settings (don't cache it)
        self.model = settings.llm_model
        self.temperature = settings.llm_temperature
        self.max_tokens = settings.llm_max_tokens
        
        # Rate limiting
        self.rate_limit_delay = 0.1  # Reduced to 0.1 seconds - OpenAI API can handle parallel requests
        self.last_request_time = 0
        self.max_retries = 3
        self.retry_delay = 2.0  # Seconds to wait before retry
        
        # Initialize client if API key is available
        if self.api_key and self.api_key != "your_openai_api_key_here":
            self.client = OpenAI(api_key=self.api_key)
        else:
            # Use mock mode for development without API key
            self.client = None
    
    def get_model(self):
        """Get current model from settings (allows runtime updates)."""
        return settings.llm_model
    
    def _rate_limit(self):
        """Apply rate limiting by delaying requests."""
        current_time = time.time()
        time_since_last = current_time - self.last_request_time
        
        if time_since_last < self.rate_limit_delay:
            time.sleep(self.rate_limit_delay - time_since_last)
        
        self.last_request_time = time.time()
    
    def _handle_api_error(self, error: Exception, attempt: int) -> Optional[str]:
        """
        Handle API errors with retry logic.
        
        Args:
            error: The exception that occurred
            attempt: Current attempt number
            
        Returns:
            Error message if should retry, None if should fail
        """
        if isinstance(error, RateLimitError):
            if attempt < self.max_retries:
                # Exponential backoff for rate limits
                wait_time = self.retry_delay * (2 ** attempt)
                time.sleep(wait_time)
                return None  # Retry
            return "Rate limit exceeded. Please try again later."
        
        elif isinstance(error, APIConnectionError):
            if attempt < self.max_retries:
                time.sleep(self.retry_delay)
                return None  # Retry
            return "Connection error. Please check your internet connection."
        
        elif isinstance(error, APIError):
            if error.status_code == 429:  # Rate limit
                if attempt < self.max_retries:
                    wait_time = self.retry_delay * (2 ** attempt)
                    time.sleep(wait_time)
                    return None
            # Check for quota errors
            if "insufficient_quota" in str(error).lower() or error.status_code == 429:
                if "insufficient_quota" in str(error).lower():
                    return "OpenAI API quota exceeded. Please check your billing and quota at https://platform.openai.com/account/billing"
                return f"Rate limit exceeded. Please try again later. Error: {error.message}"
            return f"API error: {error.message}"
        
        else:
            return f"Unexpected error: {str(error)}"
    
    def call_api(
        self,
        messages: List[Dict[str, str]],
        model: Optional[str] = None,
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
        response_format: Optional[Dict[str, str]] = None
    ) -> Dict[str, Any]:
        """
        Make API call to LLM with error handling and rate limiting.
        
        Args:
            messages: List of message dictionaries
            model: Model name (optional, uses default if not provided)
            temperature: Temperature setting (optional)
            max_tokens: Max tokens (optional)
            response_format: Response format (e.g., {"type": "json_object"})
            
        Returns:
            API response dictionary
            
        Raises:
            Exception: If API call fails after retries
        """
        if not self.client:
            raise Exception(
                "OpenAI API key not configured. "
                "Please set OPENAI_API_KEY in your .env file."
            )
        
        model = model or self.get_model()  # Use dynamic getter to read current settings
        temperature = temperature if temperature is not None else self.temperature
        max_tokens = max_tokens if max_tokens is not None else self.max_tokens
        
        # Apply rate limiting
        self._rate_limit()
        
        # Retry logic
        last_error = None
        for attempt in range(1, self.max_retries + 1):
            try:
                # Prepare request parameters
                params = {
                    "model": model,
                    "messages": messages,
                    "temperature": temperature,
                    "max_tokens": max_tokens,
                }
                
                if response_format:
                    params["response_format"] = response_format
                
                # Make API call
                response = self.client.chat.completions.create(**params)
                
                # Extract response content
                content = response.choices[0].message.content
                
                return {
                    "content": content,
                    "model": response.model,
                    "usage": {
                        "prompt_tokens": response.usage.prompt_tokens,
                        "completion_tokens": response.usage.completion_tokens,
                        "total_tokens": response.usage.total_tokens,
                    },
                    "finish_reason": response.choices[0].finish_reason,
                }
                
            except (RateLimitError, APIConnectionError, APIError) as e:
                last_error = e
                error_msg = self._handle_api_error(e, attempt)
                
                if error_msg:
                    # Should not retry
                    raise Exception(error_msg) from e
                # Otherwise, continue to retry
                
            except Exception as e:
                # Unexpected error - don't retry
                raise Exception(f"Unexpected error: {str(e)}") from e
        
        # If we get here, all retries failed
        raise Exception(f"API call failed after {self.max_retries} attempts: {str(last_error)}")
    
    def extract_json_response(self, content: str) -> Dict[str, Any]:
        """
        Extract JSON from LLM response.
        
        Args:
            content: Response content from LLM
            
        Returns:
            Parsed JSON dictionary
        """
        # Try to parse as JSON directly
        try:
            return json.loads(content)
        except json.JSONDecodeError:
            # Try to extract JSON from markdown code blocks
            import re
            json_match = re.search(r'```(?:json)?\s*(\{.*?\})\s*```', content, re.DOTALL)
            if json_match:
                try:
                    return json.loads(json_match.group(1))
                except json.JSONDecodeError:
                    pass
            
            # Try to find JSON object in text
            json_match = re.search(r'\{.*\}', content, re.DOTALL)
            if json_match:
                try:
                    return json.loads(json_match.group(0))
                except json.JSONDecodeError:
                    pass
            
            # If all else fails, return error
            raise ValueError(f"Could not parse JSON from response: {content[:200]}")
    
    def is_configured(self) -> bool:
        """Check if LLM service is properly configured."""
        return self.client is not None and self.api_key and self.api_key != "your_openai_api_key_here"


# Global LLM service instance
llm_service = LLMService()

