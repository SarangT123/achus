from pathlib import Path
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    app_name: str = "ACHUS"
    host: str = "0.0.0.0"
    port: int = 8000

    database_url: str = "sqlite+aiosqlite:///data/database.sqlite"
    storage_path: str = "data/storage"
    queue_path: str = "data/print_queue"
    upload_path: str = "data/uploads"

    ollama_url: str = "http://localhost:11434"
    ollama_model: str = "llama3.2"

    max_upload_size: int = 50 * 1024 * 1024

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()
BASE_DIR = Path(__file__).resolve().parent.parent.parent
