"""
Entry point to run JellyInstall server.
"""

import multiprocessing
import os

import uvicorn


def main():
    uvicorn.run(
        "backend.app.main:app",
        host="0.0.0.0",
        port=int(os.environ.get("PORT", 8097)),
        reload=False,
        log_level="info",
    )


if __name__ == "__main__":
    multiprocessing.freeze_support()
    main()
