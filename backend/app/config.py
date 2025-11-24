"""
Application settings and configuration.
"""
from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    # API Keys
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
    llm_temperature: float = 0.3
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

