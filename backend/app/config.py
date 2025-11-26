"""
Application settings and configuration.
"""
from pydantic_settings import BaseSettings
from pydantic import Field
from typing import List
import os


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    # API Keys - will be loaded from OPENAI_API_KEY env var
    # Using Field with validation_alias to explicitly map to OPENAI_API_KEY
    openai_api_key: str = ""
    
    # Application Settings
    app_name: str = "SkillSync"
    app_version: str = "1.0.0"
    debug: bool = True
    
    # Server Configuration
    host: str = "0.0.0.0"
    port: int = 8000
    
    # CORS Settings
    cors_origins: str = "http://localhost:3000,http://localhost:5173,https://skill-sync-swart.vercel.app,https://skillsync-production-d6f2.up.railway.app"
    
    # File Upload Settings
    max_file_size_mb: int = 10
    allowed_extensions: str = ".pdf,.docx,.txt"
    
    # LLM Settings
    # Model options: gpt-4o (recommended), gpt-4-turbo, gpt-3.5-turbo
    llm_model: str = "gpt-4o"
    llm_temperature: float = 0.1  # Lowered from 0.3 for more deterministic, consistent extractions
    llm_max_tokens: int = 1500  # Reduced from 2000 to speed up responses
    
    # NLP Settings
    spacy_model: str = "en_core_web_sm"
    
    # Authentication Settings
    jwt_secret_key: str = "your-secret-key-change-in-production"  # Change in production!
    jwt_algorithm: str = "HS256"
    jwt_access_token_expire_minutes: int = 60 * 24 * 30  # 30 days (increased from 7 days)
    
    # Google OAuth Settings
    google_client_id: str = ""
    google_client_secret: str = ""
    google_redirect_uri: str = "http://localhost:8000/api/auth/google/callback"
    
    # Email Settings
    smtp_host: str = "smtp.gmail.com"
    smtp_port: int = 587
    smtp_user: str = ""  # Email address for sending
    smtp_password: str = ""  # App password or SMTP password
    smtp_from_email: str = ""  # From email address
    smtp_from_name: str = "SkillSync"
    email_verification_code_expiry_minutes: int = 15  # Verification code expires in 15 minutes
    
    @property
    def cors_origins_list(self) -> List[str]:
        """Parse CORS origins string into list."""
        return [origin.strip() for origin in self.cors_origins.split(",")]
    
    @property
    def allowed_extensions_list(self) -> List[str]:
        """Parse allowed extensions string into list."""
        return [ext.strip() for ext in self.allowed_extensions.split(",")]
    
    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "case_sensitive": False,
        "extra": "ignore"  # Ignore extra environment variables
    }


# Global settings instance
settings = Settings()

# CRITICAL: Explicitly read OPENAI_API_KEY from environment as fallback
# Pydantic Settings should handle this automatically, but in some production
# environments (Railway, Vercel, etc.) it may not work correctly.
# This ensures the API key is always loaded if it exists in the environment.
if not settings.openai_api_key or settings.openai_api_key.strip() == "":
    # Try OPENAI_API_KEY first (most common)
    if 'OPENAI_API_KEY' in os.environ and os.environ['OPENAI_API_KEY'].strip():
        settings.openai_api_key = os.environ['OPENAI_API_KEY'].strip()
        print(f"[CONFIG] ✓ Loaded OPENAI_API_KEY from environment (fallback)")
    # Try lowercase version
    elif 'openai_api_key' in os.environ and os.environ['openai_api_key'].strip():
        settings.openai_api_key = os.environ['openai_api_key'].strip()
        print(f"[CONFIG] ✓ Loaded openai_api_key from environment (fallback)")

# Always log API key status for production debugging
api_key_loaded = bool(settings.openai_api_key and settings.openai_api_key.strip() != "")
api_key_length = len(settings.openai_api_key) if settings.openai_api_key else 0
env_var_exists = 'OPENAI_API_KEY' in os.environ or 'openai_api_key' in os.environ

print(f"[CONFIG] OpenAI API Key Status:")
print(f"  - Loaded: {api_key_loaded}")
print(f"  - Length: {api_key_length}")
print(f"  - Environment variable exists: {env_var_exists}")

if not api_key_loaded:
    print(f"[CONFIG] ⚠️  WARNING: OpenAI API Key is NOT loaded!")
    print(f"[CONFIG]    Please set OPENAI_API_KEY environment variable in your deployment platform.")
    if env_var_exists:
        print(f"[CONFIG]    Environment variable exists but is empty or whitespace.")

# Debug: Print additional details (only in debug mode)
if settings.debug:
    print(f"[CONFIG DEBUG] Environment OPENAI_API_KEY exists: {'OPENAI_API_KEY' in os.environ}")
    print(f"[CONFIG DEBUG] Environment openai_api_key exists: {'openai_api_key' in os.environ}")
    if 'OPENAI_API_KEY' in os.environ:
        env_val = os.environ['OPENAI_API_KEY']
        print(f"[CONFIG DEBUG] OPENAI_API_KEY from env length: {len(env_val)}")
        print(f"[CONFIG DEBUG] OPENAI_API_KEY preview: {env_val[:10]}...")
        print(f"[CONFIG DEBUG] OPENAI_API_KEY is whitespace: {env_val.strip() == ''}")

