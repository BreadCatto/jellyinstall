import aiohttp
from backend.app.config import WEBSTREAMR_BASE_URL

_session: aiohttp.ClientSession | None = None


async def get_session() -> aiohttp.ClientSession:
    global _session
    if _session is None or _session.closed:
        _session = aiohttp.ClientSession()
    return _session


async def close_session():
    global _session
    if _session and not _session.closed:
        await _session.close()
        _session = None


async def get_movie_streams(imdb_id: str) -> dict:
    session = await get_session()
    url = f"{WEBSTREAMR_BASE_URL}/movie/{imdb_id}.json"
    async with session.get(url) as resp:
        if resp.status == 404:
            return {"streams": []}
        resp.raise_for_status()
        return await resp.json()


async def get_series_streams(imdb_id: str, season: int, episode: int) -> dict:
    session = await get_session()
    url = f"{WEBSTREAMR_BASE_URL}/series/{imdb_id}:{season}:{episode}.json"
    async with session.get(url) as resp:
        if resp.status == 404:
            return {"streams": []}
        resp.raise_for_status()
        return await resp.json()


def parse_stream(stream: dict) -> dict:
    """Parse a raw WebStreamr stream into a cleaner format."""
    name = stream.get("name", "")
    title = stream.get("title", "")
    hints = stream.get("behaviorHints", {})

    # Extract resolution from name
    resolution = "Unknown"
    for res in ["2160p", "1080p", "720p", "480p"]:
        if res in name or res in title:
            resolution = res
            break

    # Extract size
    size_bytes = hints.get("videoSize", 0)
    size_str = ""
    if size_bytes:
        gb = size_bytes / (1024 ** 3)
        if gb >= 1:
            size_str = f"{gb:.2f} GB"
        else:
            mb = size_bytes / (1024 ** 2)
            size_str = f"{mb:.0f} MB"

    # Extract codec info from title
    codec = ""
    for c in ["HEVC", "x265", "H.265", "x264", "AVC", "H.264"]:
        if c.lower() in title.lower():
            codec = c
            break

    # Extract audio info
    audio = ""
    if "DTS-HD" in title:
        audio = "DTS-HD MA"
    elif "DTS" in title:
        audio = "DTS"
    elif "DDP" in title or "DD+" in title:
        audio = "Dolby Digital Plus"
    elif "AAC" in title:
        audio = "AAC"

    # Check for HDR
    hdr = ""
    if "HDR10+" in title:
        hdr = "HDR10+"
    elif "HDR10" in title or "HDR" in title:
        hdr = "HDR10"
    elif "DV" in title or "Dolby Vision" in title:
        hdr = "Dolby Vision"

    # Source
    source = ""
    for s in ["BluRay", "WEB-DL", "WEBRip", "HDTV", "BDRip"]:
        if s.lower() in title.lower():
            source = s
            break

    return {
        "url": stream.get("url", ""),
        "resolution": resolution,
        "size_bytes": size_bytes,
        "size_display": size_str,
        "codec": codec,
        "audio": audio,
        "hdr": hdr,
        "source": source,
        "title": title.split("\n")[0] if title else "",
        "provider": title.split("\n")[-1].strip() if "\n" in title else "",
        "raw_name": name,
    }
