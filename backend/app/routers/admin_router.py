import os
import shutil
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from backend.app.database import get_db
from backend.app.models import User, Settings
from backend.app.auth import get_current_user

router = APIRouter(prefix="/api/admin", tags=["admin"])


class SettingsUpdate(BaseModel):
    movie_download_path: str = ""
    show_download_path: str = ""


@router.get("/settings")
async def get_settings(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Settings))
    settings = result.scalars().all()
    settings_dict = {s.key: s.value for s in settings}
    return {
        "movie_download_path": settings_dict.get("movie_download_path", ""),
        "show_download_path": settings_dict.get("show_download_path", ""),
    }


@router.put("/settings")
async def update_settings(
    req: SettingsUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    for key, value in [("movie_download_path", req.movie_download_path), ("show_download_path", req.show_download_path)]:
        if value:
            # Validate path
            try:
                os.makedirs(value, exist_ok=True)
            except OSError as e:
                raise HTTPException(status_code=400, detail=f"Invalid path '{value}': {e}")

        result = await db.execute(select(Settings).where(Settings.key == key))
        setting = result.scalar_one_or_none()
        if setting:
            setting.value = value
        else:
            db.add(Settings(key=key, value=value))

    await db.commit()
    return {"status": "ok"}


@router.get("/disk-usage")
async def disk_usage(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Settings))
    settings = result.scalars().all()
    settings_dict = {s.key: s.value for s in settings}

    usage = {}
    for key in ["movie_download_path", "show_download_path"]:
        path = settings_dict.get(key, "")
        if path and os.path.exists(path):
            disk = shutil.disk_usage(path)
            # Calculate folder size
            folder_size = 0
            try:
                for dirpath, dirnames, filenames in os.walk(path):
                    for f in filenames:
                        fp = os.path.join(dirpath, f)
                        try:
                            folder_size += os.path.getsize(fp)
                        except OSError:
                            pass
            except OSError:
                pass

            usage[key] = {
                "path": path,
                "total": disk.total,
                "used": disk.used,
                "free": disk.free,
                "folder_size": folder_size,
                "total_display": _format_bytes(disk.total),
                "used_display": _format_bytes(disk.used),
                "free_display": _format_bytes(disk.free),
                "folder_size_display": _format_bytes(folder_size),
                "usage_percent": round(disk.used / disk.total * 100, 1) if disk.total > 0 else 0,
            }
        else:
            usage[key] = None

    return usage


def _format_bytes(b: int) -> str:
    for unit in ["B", "KB", "MB", "GB", "TB"]:
        if b < 1024:
            return f"{b:.1f} {unit}"
        b /= 1024
    return f"{b:.1f} PB"
