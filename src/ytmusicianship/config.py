from pathlib import Path
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    ytm_port: int = 8080
    ytm_db_path: Path = Path("data/ytm.db")
    ytm_oauth_path: Path = Path("data/oauth.json")
    ytm_log_level: str = "info"

    class Config:
        env_prefix = "YTM_"
        env_file = ".env"


settings = Settings()
