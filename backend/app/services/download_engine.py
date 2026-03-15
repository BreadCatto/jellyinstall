"""
Multi-connection download engine.
Downloads files using 20 parallel HTTP range-request connections.
Runs each download in a separate asynchronous subprocess so it survives and doesn't block the main thread.
"""

import asyncio
import aiohttp
import os
import sys
import json
from dataclasses import dataclass
from typing import Dict
from backend.app.config import BASE_DIR, JELLYFIN_URL, JELLYFIN_API_KEY

@dataclass
class DownloadTask:
    process: asyncio.subprocess.Process | None = None
    download_id: int = 0
    title: str = ""
    filename: str = ""
    filepath: str = ""
    url: str = ""
    total_size: int = 0
    downloaded: int = 0
    speed: float = 0.0
    status: int = 0  # 0=pending, 1=downloading, 2=completed, 3=failed, 4=cancelled
    media_type: str = "movie"
    quality: str = ""
    _read_task: asyncio.Task | None = None

NUM_CONNECTIONS = 20

def _format_speed(bps: float) -> str:
    if bps >= 1024 * 1024:
        return f"{bps / (1024 * 1024):.1f MB/s}"
    elif bps >= 1024:
        return f"{bps / 1024:.1f} KB/s"
    return f"{bps:.0f} B/s"

class DownloadManager:
    """Manages all active download processes."""

    def __init__(self):
        self.tasks: Dict[int, DownloadTask] = {}

    def start_download(
        self,
        download_id: int,
        url: str,
        filepath: str,
        title: str,
        filename: str,
        media_type: str = "movie",
        quality: str = "",
    ) -> DownloadTask:
        
        task = DownloadTask(
            download_id=download_id,
            title=title,
            filename=filename,
            filepath=filepath,
            url=url,
            media_type=media_type,
            quality=quality,
            status=0
        )
        self.tasks[download_id] = task
        
        # Start the task asynchronously
        asyncio.create_task(self._start_process(task))
        return task

    async def _start_process(self, task: DownloadTask):
        worker_script = os.path.join(BASE_DIR, "backend", "app", "download_worker.py")
        
        try:
            process = await asyncio.create_subprocess_exec(
                sys.executable, worker_script,
                "--url", task.url,
                "--filepath", task.filepath,
                "--connections", str(NUM_CONNECTIONS),
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            task.process = process
            task._read_task = asyncio.create_task(self._read_stdout(task, process))
        except Exception as e:
            print(f"Failed to start download process: {e}")
            task.status = 3

    async def _read_stdout(self, task: DownloadTask, process: asyncio.subprocess.Process):
        while True:
            if not process.stdout:
                break
            line = await process.stdout.readline()
            if not line:
                break
            
            try:
                data = json.loads(line.decode('utf-8').strip())
                task.total_size = data.get("total_size", task.total_size)
                task.downloaded = data.get("downloaded", task.downloaded)
                task.speed = data.get("speed", task.speed)
                
                new_status = data.get("status", task.status)
                # Handle completion logic
                if new_status == 2 and task.status != 2:
                    task.status = 2
                    await self._trigger_jellyfin_rescan()
                else:
                    task.status = new_status
            except Exception:
                pass
                
        await process.wait()
        
        # If it exited and status wasn't set to complete/cancel, mark as failed
        if process.returncode != 0 and task.status not in (2, 4):
            task.status = 3
            
    async def _trigger_jellyfin_rescan(self):
        if JELLYFIN_URL and JELLYFIN_API_KEY:
            try:
                async with aiohttp.ClientSession() as session:
                    refresh_url = f"{JELLYFIN_URL}/Library/Refresh"
                    headers = {"X-Emby-Token": JELLYFIN_API_KEY}
                    async with session.post(refresh_url, headers=headers, timeout=10) as refresh_resp:
                        pass
            except Exception as e:
                print(f"Failed to refresh Jellyfin library: {e}")

    def cancel_download(self, download_id: int) -> bool:
        task = self.tasks.get(download_id)
        if task is None:
            return False
            
        asyncio.create_task(self._cancel_and_cleanup(task))
        return True

    async def _cancel_and_cleanup(self, task: DownloadTask):
        task.status = 4
        if task.process and task.process.returncode is None:
            try:
                task.process.terminate()
                try:
                    await asyncio.wait_for(task.process.wait(), timeout=5.0)
                except asyncio.TimeoutError:
                    task.process.kill()
            except Exception:
                pass
                
        if task.filepath and os.path.exists(task.filepath):
            try:
                os.remove(task.filepath)
            except OSError:
                pass

    def get_task_info(self, task: DownloadTask) -> dict:
        status_map = {0: "pending", 1: "downloading", 2: "completed", 3: "failed", 4: "cancelled"}
        total = task.total_size
        downloaded = task.downloaded
        spd = task.speed
        st = task.status

        progress = (downloaded / total * 100) if total > 0 else 0

        return {
            "id": task.download_id,
            "title": task.title,
            "filename": task.filename,
            "media_type": task.media_type,
            "quality": task.quality,
            "total_size": total,
            "downloaded": downloaded,
            "progress": round(progress, 1),
            "speed": spd,
            "speed_display": _format_speed(spd),
            "status": status_map.get(st, "unknown"),
        }

    def get_all_active(self) -> list:
        results = []
        for did, task in self.tasks.items():
            info = self.get_task_info(task)
            results.append(info)
        return results

    def cleanup_finished(self):
        to_remove = []
        for did, task in self.tasks.items():
            if task.status in (2, 3, 4):
                to_remove.append(did)
        for did in to_remove:
            del self.tasks[did]

    def kill_all(self):
        """Kill all active download processes. Called on shutdown."""
        for task in self.tasks.values():
            if task.process and task.process.returncode is None:
                try:
                    task.process.terminate()
                except Exception:
                    pass
        self.tasks.clear()


# Singleton
download_manager = DownloadManager()
