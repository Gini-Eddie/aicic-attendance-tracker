import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    APP_NAME: str = "AICIC Concepts Attendance Management System"
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        "postgresql://postgres:postgres@localhost:5432/aicic_attendance"
    )
    JWT_SECRET: str = os.getenv(
        "JWT_SECRET",
        "aicic_concepts_jwt_secret_key_change_in_production"
    )
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    DEFAULT_ATTENDANCE_WINDOW_MINUTES: int = 10

    class Config:
        env_file = ".env"
        extra = "allow"

settings = Settings()
