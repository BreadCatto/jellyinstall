import sys
import json
import asyncio
import aiohttp
import os
import time
import argparse
import traceback

# Status codes:
# 0 = pending
# 1 = downloading
# 2 = completed
# 3 = failed

downloaded_bytes = 0
total_size_bytes = 0
current_status = 0
current_speed = 0.0

def report_progress():
    global downloaded_bytes, total_size_bytes, current_status, current_speed
    data = {
        "total_size": total_size_bytes,
        "downloaded": downloaded_bytes,
        "speed": current_speed,
        "status": current_status
    }
    try:
        sys.stdout.write(json.dumps(data) + "\n")
        sys.stdout.flush()
    except Exception:
        pass

async def _download_chunk(
    session: aiohttp.ClientSession,
    url: str,
    filepath: str,
    start: int,
    end: int,
    chunk_size: int = 1024 * 64,
    max_retries: int = 5,
):
    global downloaded_bytes
    current_pos = start
    for attempt in range(max_retries):
        try:
            headers = {"Range": f"bytes={current_pos}-{end}"}
            async with session.get(url, headers=headers, timeout=aiohttp.ClientTimeout(total=None, sock_read=60)) as resp:
                if resp.status not in (200, 206):
                    if attempt < max_retries - 1:
                        await asyncio.sleep(2 ** attempt)
                        continue
                    return False
                
                with open(filepath, "r+b") as f:
                    f.seek(current_pos)
                    async for data in resp.content.iter_chunked(chunk_size):
                        f.write(data)
                        current_pos += len(data)
                        downloaded_bytes += len(data)
                return True
        except (aiohttp.ClientError, asyncio.TimeoutError, OSError):
            if attempt < max_retries - 1:
                await asyncio.sleep(2 ** attempt)
            continue
    return False

async def _run_download(url: str, filepath: str, num_connections: int):
    global total_size_bytes, downloaded_bytes, current_speed, current_status
    
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
            except Exception:
                current_status = 3  # failed
                report_progress()
                return

        total_size_bytes = content_length

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

        current_status = 1  # downloading
        report_progress()

        # Track speed
        last_downloaded = 0
        last_time = time.time()

        async def update_speed():
            global current_speed
            nonlocal last_downloaded, last_time
            while current_status == 1:
                await asyncio.sleep(0.5)
                now = time.time()
                dt = now - last_time
                if dt > 0:
                    current_speed = (downloaded_bytes - last_downloaded) / dt
                    last_downloaded = downloaded_bytes
                    last_time = now
                report_progress()

        speed_task = asyncio.create_task(update_speed())

        if content_length > 0 and accept_ranges == "bytes" and content_length > 1024 * 1024:
            # Multi-connection download
            chunk_size = content_length // num_connections
            tasks = []
            for i in range(num_connections):
                start = i * chunk_size
                end = (start + chunk_size - 1) if i < num_connections - 1 else content_length - 1
                tasks.append(
                    _download_chunk(session, url, filepath, start, end)
                )
            results = await asyncio.gather(*tasks, return_exceptions=True)
            if any(r is False or isinstance(r, Exception) for r in results):
                current_status = 3 # failed
        else:
            # Single-connection fallback
            try:
                async with session.get(url, allow_redirects=True) as resp:
                    with open(filepath, "wb") as f:
                        async for data in resp.content.iter_chunked(64 * 1024):
                            f.write(data)
                            downloaded_bytes += len(data)
                            if content_length == 0:
                                total_size_bytes = downloaded_bytes
            except Exception:
                current_status = 3  # failed

        speed_task.cancel()

        if current_status != 3:
            if downloaded_bytes >= total_size_bytes * 0.99 if total_size_bytes > 0 else True:
                current_status = 2  # completed
                current_speed = 0
            else:
                current_status = 3  # failed
                
        report_progress()

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--url", required=True)
    parser.add_argument("--filepath", required=True)
    parser.add_argument("--connections", type=int, default=20)
    args = parser.parse_args()

    if os.name == 'nt':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
        
    try:
        asyncio.run(_run_download(args.url, args.filepath, args.connections))
    except KeyboardInterrupt:
        # Expected on cancellation
        global current_status
        current_status = 4 # cancelled
        report_progress()
        sys.exit(0)
    except Exception as e:
        sys.stderr.write(f"Exception: {e}\n")
        traceback.print_exc(file=sys.stderr)
        global current_status
        current_status = 3 # failed
        report_progress()
        sys.exit(1)

if __name__ == "__main__":
    main()