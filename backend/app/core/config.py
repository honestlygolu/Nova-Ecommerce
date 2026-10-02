from functools import lru_cache
from typing import Literal

from pydantic import Field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # Require an explicit environment so a hosted service cannot silently fall
    # back to the development signing keys or non-secure cookie setting.
    app_env: Literal["development", "production"]
    database_url: str = "postgresql+psycopg://nova:nova@localhost:5432/nova"
    frontend_origins: str = "http://localhost:5173"
    frontend_url: str = "http://localhost:5173"
    trusted_proxy_count: int = Field(default=0, ge=0, le=5)
    jwt_secret: str
    jwt_expire_minutes: int = 30
    csrf_secret: str
    cookie_secure: bool = False
    smtp_host: str | None = None
    smtp_port: int = 1025
    smtp_username: str | None = None
    smtp_password: str | None = None
    smtp_from: str = "nova@example.test"
    smtp_use_tls: bool = False
    razorpay_key_id: str | None = None
    razorpay_key_secret: str | None = None
    razorpay_webhook_secret: str | None = None

    @property
    def allowed_frontend_origins(self) -> list[str]:
        return [origin.strip() for origin in self.frontend_origins.split(",") if origin.strip()]

    @property
    def is_production(self) -> bool:
        return self.app_env.lower() == "production"

    @model_validator(mode="after")
    def require_production_secrets(self):
        if self.is_production and (
            len(self.jwt_secret) < 32
            or len(self.csrf_secret) < 32
            or self.jwt_secret.startswith("development-only")
            or self.csrf_secret.startswith("development-only")
        ):
            raise ValueError("Production requires unique JWT_SECRET and CSRF_SECRET values of at least 32 characters")
        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
