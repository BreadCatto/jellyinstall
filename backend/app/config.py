import os
import secrets
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent.parent
DATA_DIR = BASE_DIR / "data"
DATA_DIR.mkdir(exist_ok=True)

DATABASE_URL = f"sqlite+aiosqlite:///{DATA_DIR / 'jellyinstall.db'}"

TMDB_ACCESS_TOKEN = "eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiI1YjYwZjM4YmRiN2Y5Mjc2MTNmNWMxZjdjM2M0NjJiNiIsIm5iZiI6MTc3MjUxNzE1NC4yNjQsInN1YiI6IjY5YTY3NzIyZDI1NjNlNjBiNGNhNThhYSIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.s77oElvJS93yigdY5WZ3WF454FoCJ__uzAk_PHLb9Vo"
TMDB_API_KEY = "5b60f38bdb7f927613f5c1f7c3c462b6"
TMDB_BASE_URL = "https://api.themoviedb.org/3"
TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p"

WEBSTREAMR_BASE_URL = "https://webstreamr.hayd.uk/stream"

JWT_SECRET = os.environ.get("JWT_SECRET", secrets.token_hex(32))
JWT_ALGORITHM = "HS256"
JWT_EXPIRY_HOURS = 72

SERVER_PORT = int(os.environ.get("PORT", 8097))
