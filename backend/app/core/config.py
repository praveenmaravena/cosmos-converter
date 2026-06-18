import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "Cosmos Convert"
    SECRET_KEY: str = os.getenv("SECRET_KEY", "COSMIC_SUPER_SECRET_KEY_9999_CHANGE_ME_IN_PRODUCTION")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 24 hours

    # Database & Redis Settings
    DATABASE_URL: str = os.getenv("DATABASE_URL", "postgresql://cosmos:cosmos123@localhost:5432/cosmos_convert")
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379/0")

    # Local Storage directories (resolved relative to workspace project root or environment config)
    STORAGE_DIR: str = os.getenv("STORAGE_DIR", "c:/supabase project/AIAGENT/PDFapp/storage")
    UPLOADS_DIR: str = f"{STORAGE_DIR}/uploads"
    CONVERSIONS_DIR: str = f"{STORAGE_DIR}/conversions"
    TEMP_DIR: str = f"{STORAGE_DIR}/temp"
    USER_FILES_DIR: str = f"{STORAGE_DIR}/user-files"
    THUMBNAILS_DIR: str = f"{STORAGE_DIR}/thumbnails"
    LOGS_DIR: str = f"{STORAGE_DIR}/logs"

    # Cloud Storage (Phase 2 / Production configuration)
    CLOUDFLARE_R2_BUCKET: str = os.getenv("CLOUDFLARE_R2_BUCKET", "cosmos-convert")
    CLOUDFLARE_R2_ACCESS_KEY: str = os.getenv("CLOUDFLARE_R2_ACCESS_KEY", "")
    CLOUDFLARE_R2_SECRET_KEY: str = os.getenv("CLOUDFLARE_R2_SECRET_KEY", "")
    CLOUDFLARE_R2_ENDPOINT: str = os.getenv("CLOUDFLARE_R2_ENDPOINT", "")

    # Billing and Subscription Mocks
    STRIPE_API_KEY: str = os.getenv("STRIPE_API_KEY", "")
    PAYPAL_CLIENT_ID: str = os.getenv("PAYPAL_CLIENT_ID", "")
    RAZORPAY_KEY_ID: str = os.getenv("RAZORPAY_KEY_ID", "")

    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()
