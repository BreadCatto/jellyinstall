import asyncio
import datetime
import os
import re
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from backend.app.database import get_db
from backend.app.models import User, Settings, DownloadRecord
from backend.app.auth import get_current_user
from backend.app.services.download_engine import download_manager

router = APIRouter(prefix="/api/downloads", tags=["downloads"])


class StartDownloadRequest(BaseModel):
    url: str
    title: str
    filename: str
    quality: str = ""
    media_type: str = "movie"  # "movie" or "show"
    file_size: int = 0
    show_name: str = ""       # TV shows: the series name (used to build folder structure)
    season_number: int = 0    # TV shows: the season number (used to build folder structure)


def _sanitize_filename(name: str) -> str:
    name = re.sub(r'[<>:"/\\|?*]', '_', name)
    name = name.strip('. ')
    return name[:200] if name else "download"


@router.post("/start")
async def start_download(
    req: StartDownloadRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Get download path from settings
    path_key = "movie_download_path" if req.media_type == "movie" else "show_download_path"
    result = await db.execute(select(Settings).where(Settings.key == path_key))
    setting = result.scalar_one_or_none()

    if setting is None or not setting.value:
        raise HTTPException(status_code=400, detail=f"Download path for {req.media_type}s not configured. Go to Admin settings.")

    download_dir = setting.value
    if not os.path.isdir(download_dir):
        try:
            os.makedirs(download_dir, exist_ok=True)
        except OSError:
            raise HTTPException(status_code=400, detail=f"Cannot create download directory: {download_dir}")

    # For TV shows build:  <show_dir> / <Show Name> / Season XX / <filename>
    if req.media_type == "show" and req.show_name:
        safe_show = _sanitize_filename(req.show_name)
        season_folder = f"Season {str(req.season_number).zfill(2)}" if req.season_number > 0 else "Season 01"
        download_dir = os.path.join(download_dir, safe_show, season_folder)
        os.makedirs(download_dir, exist_ok=True)

    safe_filename = _sanitize_filename(req.filename)
    filepath = os.path.join(download_dir, safe_filename)

    # Avoid overwriting
    base, ext = os.path.splitext(filepath)
    counter = 1
    while os.path.exists(filepath):
        filepath = f"{base} ({counter}){ext}"
        counter += 1

    # Create DB record
    record = DownloadRecord(
        title=req.title,
        filename=os.path.basename(filepath),
        url=req.url,
        quality=req.quality,
        file_size=req.file_size,
        media_type=req.media_type,
        status="downloading",
        download_path=filepath,
    )
    db.add(record)
    await db.commit()
    await db.refresh(record)

    # Start download process (runs in thread pool to avoid blocking the event loop)
    await download_manager.start_download(
        download_id=record.id,
        url=req.url,
        filepath=filepath,
        title=req.title,
        filename=os.path.basename(filepath),
        media_type=req.media_type,
        quality=req.quality,
    )

    return {"id": record.id, "status": "downloading", "filename": os.path.basename(filepath)}


@router.post("/{download_id}/cancel")
async def cancel_download(
    download_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    success = await download_manager.cancel_download(download_id)
    if not success:
        raise HTTPException(status_code=404, detail="Download not found or already finished")

    result = await db.execute(select(DownloadRecord).where(DownloadRecord.id == download_id))
    record = result.scalar_one_or_none()
    if record:
        record.status = "cancelled"
        await db.commit()

    return {"id": download_id, "status": "cancelled"}


@router.get("/active")
async def active_downloads_sse():
    """SSE endpoint streaming active download progress."""
    async def event_generator():
        import json
        while True:
            tasks = download_manager.get_all_active()
            data = json.dumps(tasks)
            yield f"data: {data}\n\n"
            await asyncio.sleep(0.5)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.get("/history")
async def download_history(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(DownloadRecord).order_by(DownloadRecord.started_at.desc()).limit(100)
    )
    records = result.scalars().all()
    return [
        {
            "id": r.id,
            "title": r.title,
            "filename": r.filename,
            "quality": r.quality,
            "file_size": r.file_size,
            "media_type": r.media_type,
            "status": r.status,
            "started_at": r.started_at.isoformat() if r.started_at else None,
            "completed_at": r.completed_at.isoformat() if r.completed_at else None,
            "download_path": r.download_path,
        }
        for r in records
    ]
