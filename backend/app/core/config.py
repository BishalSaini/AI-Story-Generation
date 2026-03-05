import os
from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    DATABASE_URL: Optional[str] = ""
    GEMINI_API_KEY: Optional[str] = ""
    GROQ_API_KEY: Optional[str] = ""
    OPENROUTER_API_KEY: Optional[str] = ""
    
    class Config:
        env_file = ".env"
        env_file_encoding = 'utf-8'
        case_sensitive = True

settings = Settings()
