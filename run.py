"""
Entry point to run JellyInstall server.
"""

import multiprocessing
import sys
import os

import uvicorn


def main():
    uvicorn.run(
        "backend.app.main:app",
        host="0.0.0.0",
        port=int(os.environ.get("PORT", 8097)),
        reload=False,
        log_level="info",
        timeout_keep_alive=5,
    )


if __name__ == "__main__":
    # Must be called before any other multiprocessing usage.
    # 'forkserver' on Linux: a dedicated helper process handles all subprocess
    # spawning, so neither the event loop nor a thread pool is ever blocked by
    # a fork() syscall.  'spawn' on Windows (forkserver not supported there).
    start_method = "forkserver" if sys.platform != "win32" else "spawn"
    multiprocessing.set_start_method(start_method, force=True)
    multiprocessing.freeze_support()
    main()
