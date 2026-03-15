"""
Build script: builds the Next.js frontend and copies output to backend/static.
"""

import os
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
FRONTEND_DIR = ROOT / "frontend"
STATIC_DIR = ROOT / "backend" / "static"


def main():
    print("Building frontend...")
    # Install deps if needed
    if not (FRONTEND_DIR / "node_modules").exists():
        print("Installing frontend dependencies...")
        subprocess.run("npm install", cwd=str(FRONTEND_DIR), check=True, shell=True)

    # Build
    subprocess.run("npm run build", cwd=str(FRONTEND_DIR), check=True, shell=True)

    # Copy output
    out_dir = FRONTEND_DIR / "out"
    if not out_dir.exists():
        print("Error: Frontend build output not found at frontend/out/")
        sys.exit(1)

    # Remove old static files
    if STATIC_DIR.exists():
        shutil.rmtree(STATIC_DIR)

    # Copy
    shutil.copytree(str(out_dir), str(STATIC_DIR))
    print(f"Frontend built and copied to {STATIC_DIR}")
    print("Done! Run 'python run.py' to start the server.")


if __name__ == "__main__":
    main()
