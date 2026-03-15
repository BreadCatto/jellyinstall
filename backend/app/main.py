import os
from contextlib import asynccontextmanager
from pathlib import Path
from fastapi import FastAPI, Request
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from backend.app.database import init_db
from backend.app.services.download_engine import download_manager
from backend.app.services import tmdb_service, stream_service
from backend.app.routers import auth_router, tmdb_router, stream_router, download_router, admin_router
from backend.app.models import DownloadRecord
from backend.app.database import async_session
from sqlalchemy import select, update


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await init_db()
    # Mark any in-progress downloads as failed (from previous run)
    async with async_session() as db:
        await db.execute(
            update(DownloadRecord)
            .where(DownloadRecord.status == "downloading")
            .values(status="failed")
        )
        await db.commit()
    print("JellyInstall started successfully")
    yield
    # Shutdown
    print("Shutting down - killing active downloads...")
    download_manager.kill_all()
    await tmdb_service.close_session()
    await stream_service.close_session()
    print("Shutdown complete")


app = FastAPI(
    title="JellyInstall",
    description="Movie & TV Show Downloader",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API routers
app.include_router(auth_router.router)
app.include_router(tmdb_router.router)
app.include_router(stream_router.router)
app.include_router(download_router.router)
app.include_router(admin_router.router)

# Static files directory
STATIC_DIR = Path(__file__).resolve().parent.parent / "static"


# Serve static files if they exist (after frontend build)
if STATIC_DIR.exists():
    # Mount _next directory for Next.js assets
    next_dir = STATIC_DIR / "_next"
    if next_dir.exists():
        app.mount("/_next", StaticFiles(directory=str(next_dir)), name="next_assets")

    # Serve other static assets
    for subdir in ["images", "fonts", "icons"]:
        sub_path = STATIC_DIR / subdir
        if sub_path.exists():
            app.mount(f"/{subdir}", StaticFiles(directory=str(sub_path)), name=subdir)


@app.get("/favicon.ico")
async def favicon():
    fav_path = STATIC_DIR / "favicon.ico"
    if fav_path.exists():
        return FileResponse(str(fav_path))
    return JSONResponse(status_code=404, content={"detail": "Not found"})


# Catch-all for frontend routes - must be last
@app.get("/{full_path:path}")
async def serve_frontend(request: Request, full_path: str):
    # Don't catch API routes
    if full_path.startswith("api/"):
        return JSONResponse(status_code=404, content={"detail": "Not found"})

    if not STATIC_DIR.exists():
        return JSONResponse(
            status_code=200,
            content={"message": "JellyInstall API is running. Build the frontend first."},
        )

    # Try exact file first
    file_path = STATIC_DIR / full_path
    if file_path.is_file():
        return FileResponse(str(file_path))

    # Try with .html extension
    html_path = STATIC_DIR / f"{full_path}.html"
    if html_path.is_file():
        return FileResponse(str(html_path))

    # Try index.html in directory
    index_path = STATIC_DIR / full_path / "index.html"
    if index_path.is_file():
        return FileResponse(str(index_path))

    # For dynamic routes like /movie/123, serve the shell page
    parts = full_path.strip("/").split("/")
    if len(parts) >= 2:
        # Try /movie/[id].html or /movie/_.html
        route_dir = STATIC_DIR / parts[0]
        if route_dir.is_dir():
            # Look for any HTML file in subdirectories (the generated shell)
            for item in route_dir.iterdir():
                if item.is_dir():
                    idx = item / "index.html"
                    if idx.is_file():
                        return FileResponse(str(idx))

    # Fallback to root index.html (SPA)
    root_index = STATIC_DIR / "index.html"
    if root_index.is_file():
        return FileResponse(str(root_index))

    return JSONResponse(status_code=404, content={"detail": "Not found"})
