"""
Multi-connection download engine.
Downloads files using 20 parallel HTTP range-request connections.
Runs each download in a separate process so it survives page close.
"""

import asyncio
import aiohttp
import os
import time
import multiprocessing
import traceback
from multiprocessing import Process, Value, Event
from ctypes import c_double, c_longlong, c_int
from pathlib import Path
from dataclasses import dataclass, field
from typing import Dict


@dataclass
class DownloadTask:
    process: Process
    download_id: int
    title: str
    filename: str
    url: str
    total_size: Value  # c_longlong
    downloaded: Value  # c_longlong
    speed: Value       # c_double (bytes/sec)
    status: Value      # c_int: 0=pending, 1=downloading, 2=completed, 3=failed, 4=cancelled
    cancel_event: Event
    media_type: str
    quality: str


NUM_CONNECTIONS = 20


def _format_speed(bps: float) -> str:
    if bps >= 1024 * 1024:
        return f"{bps / (1024 * 1024):.1f} MB/s"
    elif bps >= 1024:
        return f"{bps / 1024:.1f} KB/s"
    return f"{bps:.0f} B/s"


async def _download_chunk(
    session: aiohttp.ClientSession,
    url: str,
    filepath: str,
    start: int,
    end: int,
    downloaded_value,
    cancel_event,
    chunk_size: int = 1024 * 64,
    max_retries: int = 5,
):
    """Download a single chunk with range headers."""
    current_pos = start
    for attempt in range(max_retries):
        if cancel_event.is_set():
            return
        try:
            headers = {"Range": f"bytes={current_pos}-{end}"}
            async with session.get(url, headers=headers, timeout=aiohttp.ClientTimeout(total=None, sock_read=60)) as resp:
                if resp.status not in (200, 206):
                    if attempt < max_retries - 1:
                        await asyncio.sleep(2 ** attempt)
                        continue
                    return
                with open(filepath, "r+b") as f:
                    f.seek(current_pos)
                    async for data in resp.content.iter_chunked(chunk_size):
                        if cancel_event.is_set():
                            return
                        f.write(data)
                        current_pos += len(data)
                        with downloaded_value.get_lock():
                            downloaded_value.value += len(data)
                return
        except (aiohttp.ClientError, asyncio.TimeoutError, OSError):
            if attempt < max_retries - 1:
                await asyncio.sleep(2 ** attempt)
            continue


async def _run_download(
    url: str,
    filepath: str,
    total_size_value,
    downloaded_value,
    speed_value,
    status_value,
    cancel_event,
    num_connections: int = NUM_CONNECTIONS,
):
    """Main download coroutine running inside the child process."""
    connector = aiohttp.TCPConnector(limit=num_connections + 5, force_close=False)
    timeout = aiohttp.ClientTimeout(total=None, connect=30)

    async with aiohttp.ClientSession(connector=connector, timeout=timeout) as session:
        # Get file size with HEAD request
        try:
            async with session.head(url, allow_redirects=True) as resp:
                content_length = int(resp.headers.get("Content-Length", 0))
                accept_ranges = resp.headers.get("Accept-Ranges", "none")
        except Exception:
            # Try GET with range to detect support
            try:
                async with session.get(url, headers={"Range": "bytes=0-0"}, allow_redirects=True) as resp:
                    if resp.status == 206:
                        cr = resp.headers.get("Content-Range", "")
                        if "/" in cr:
                            content_length = int(cr.split("/")[-1])
                            accept_ranges = "bytes"
                        else:
                            content_length = 0
                            accept_ranges = "none"
                    else:
                        content_length = int(resp.headers.get("Content-Length", 0))
                        accept_ranges = "none"
            except Exception as e:
                status_value.value = 3  # failed
                return

        total_size_value.value = content_length

        # Create the output file
        dirpath = os.path.dirname(filepath)
        if dirpath:
            os.makedirs(dirpath, exist_ok=True)

        if content_length > 0:
            with open(filepath, "wb") as f:
                f.seek(content_length - 1)
                f.write(b"\0")
        else:
            open(filepath, "wb").close()

        status_value.value = 1  # downloading

        # Track speed
        last_downloaded = 0
        last_time = time.time()

        async def update_speed():
            nonlocal last_downloaded, last_time
            while status_value.value == 1:
                await asyncio.sleep(0.5)
                now = time.time()
                dt = now - last_time
                if dt > 0:
                    current = downloaded_value.value
                    speed_value.value = (current - last_downloaded) / dt
                    last_downloaded = current
                    last_time = now

        speed_task = asyncio.create_task(update_speed())

        if content_length > 0 and accept_ranges == "bytes" and content_length > 1024 * 1024:
            # Multi-connection download
            chunk_size = content_length // num_connections
            tasks = []
            for i in range(num_connections):
                start = i * chunk_size
                end = (start + chunk_size - 1) if i < num_connections - 1 else content_length - 1
                tasks.append(
                    _download_chunk(session, url, filepath, start, end, downloaded_value, cancel_event)
                )
            await asyncio.gather(*tasks)
        else:
            # Single-connection fallback
            try:
                async with session.get(url, allow_redirects=True) as resp:
                    with open(filepath, "wb") as f:
                        async for data in resp.content.iter_chunked(64 * 1024):
                            if cancel_event.is_set():
                                break
                            f.write(data)
                            with downloaded_value.get_lock():
                                downloaded_value.value += len(data)
                            if content_length == 0:
                                total_size_value.value = downloaded_value.value
            except Exception:
                if not cancel_event.is_set():
                    status_value.value = 3  # failed
                    speed_task.cancel()
                    return

        speed_task.cancel()

        if cancel_event.is_set():
            status_value.value = 4  # cancelled
            try:
                os.remove(filepath)
            except OSError:
                pass
        elif downloaded_value.value >= total_size_value.value * 0.99 if total_size_value.value > 0 else True:
            status_value.value = 2  # completed
            speed_value.value = 0
            
            # Trigger Jellyfin library rescan instead of full restart
            import requests
            from backend.app.config import JELLYFIN_URL, JELLYFIN_API_KEY
            if JELLYFIN_URL and JELLYFIN_API_KEY:
                try:
                    refresh_url = f"{JELLYFIN_URL}/Library/Refresh"
                    headers = {"X-MediaBrowser-Token": JELLYFIN_API_KEY}
                    requests.post(refresh_url, headers=headers, timeout=10)
                except Exception as e:
                    print(f"Failed to refresh Jellyfin library: {e}")
        else:
            status_value.value = 3  # failed


def _process_entry(url, filepath, total_size, downloaded, speed, status, cancel_event, num_connections):
    """Entry point for the download subprocess."""
    try:
        if os.name == 'nt':
            asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        loop.run_until_complete(
            _run_download(url, filepath, total_size, downloaded, speed, status, cancel_event, num_connections)
        )
        loop.close()
    except Exception as e:
        print(f"Download process failed with exception: {e}")
        traceback.print_exc()
        status.value = 3  # failed


class DownloadManager:
    """Manages all active download processes."""

    def __init__(self):
        self.tasks: Dict[int, DownloadTask] = {}
        self._next_id = 1

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
        total_size = Value(c_longlong, 0)
        downloaded = Value(c_longlong, 0)
        speed = Value(c_double, 0.0)
        status = Value(c_int, 0)  # pending
        cancel_event = Event()

        process = Process(
            target=_process_entry,
            args=(url, filepath, total_size, downloaded, speed, status, cancel_event, NUM_CONNECTIONS),
            daemon=True,
        )

        task = DownloadTask(
            process=process,
            download_id=download_id,
            title=title,
            filename=filename,
            url=url,
            total_size=total_size,
            downloaded=downloaded,
            speed=speed,
            status=status,
            cancel_event=cancel_event,
            media_type=media_type,
            quality=quality,
        )

        self.tasks[download_id] = task
        process.start()
        return task

    def cancel_download(self, download_id: int) -> bool:
        task = self.tasks.get(download_id)
        if task is None:
            return False
        task.cancel_event.set()
        task.process.join(timeout=5)
        if task.process.is_alive():
            task.process.terminate()
        return True

    def get_task_info(self, task: DownloadTask) -> dict:
        status_map = {0: "pending", 1: "downloading", 2: "completed", 3: "failed", 4: "cancelled"}
        total = task.total_size.value
        downloaded = task.downloaded.value
        spd = task.speed.value
        st = task.status.value

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
        finished_ids = []
        for did, task in self.tasks.items():
            info = self.get_task_info(task)
            results.append(info)
            if info["status"] in ("completed", "failed", "cancelled"):
                if not task.process.is_alive():
                    finished_ids.append(did)
        # Clean up finished processes (but keep info accessible)
        return results

    def cleanup_finished(self):
        to_remove = []
        for did, task in self.tasks.items():
            if task.status.value in (2, 3, 4) and not task.process.is_alive():
                to_remove.append(did)
        for did in to_remove:
            del self.tasks[did]

    def kill_all(self):
        """Kill all active download processes. Called on shutdown."""
        for task in self.tasks.values():
            task.cancel_event.set()
            if task.process.is_alive():
                task.process.terminate()
        for task in self.tasks.values():
            task.process.join(timeout=3)
            if task.process.is_alive():
                task.process.kill()
        self.tasks.clear()


# Singleton
download_manager = DownloadManager()
