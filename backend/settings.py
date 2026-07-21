import os
from datetime import date
from pathlib import Path


ROOT_DIR = Path(__file__).resolve().parents[1]
SAMPLE_DATA_DIR = ROOT_DIR / "data" / "samples"
DB_PATH = Path(os.environ.get("AI_TUTOR_DB_PATH") or ROOT_DIR / "backend" / "app.db")
APP_ENV = os.environ.get("APP_ENV", "").strip().lower()
CORS_ALLOWED_ORIGINS = [
    origin.strip()
    for origin in os.environ.get("CORS_ALLOWED_ORIGINS", "").split(",")
    if origin.strip()
]
CURRENT_DATE = os.environ.get("AI_TUTOR_CURRENT_DATE") or (
    date.today().isoformat() if APP_ENV == "production" else "2026-06-10"
)
