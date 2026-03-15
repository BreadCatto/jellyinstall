import aiohttp
from backend.app.config import TMDB_BASE_URL, TMDB_ACCESS_TOKEN

_session: aiohttp.ClientSession | None = None


async def get_session() -> aiohttp.ClientSession:
    global _session
    if _session is None or _session.closed:
        _session = aiohttp.ClientSession(
            headers={
                "Authorization": f"Bearer {TMDB_ACCESS_TOKEN}",
                "Content-Type": "application/json",
            }
        )
    return _session


async def close_session():
    global _session
    if _session and not _session.closed:
        await _session.close()
        _session = None


async def tmdb_get(path: str, params: dict | None = None) -> dict:
    session = await get_session()
    url = f"{TMDB_BASE_URL}{path}"
    async with session.get(url, params=params or {}) as resp:
        resp.raise_for_status()
        data = await resp.json()
    return data


async def get_popular_movies(page: int = 1) -> dict:
    return await tmdb_get("/movie/popular", {"page": page, "language": "en-US"})


async def get_popular_shows(page: int = 1) -> dict:
    return await tmdb_get("/tv/popular", {"page": page, "language": "en-US"})


async def get_trending(media_type: str = "all", window: str = "day") -> dict:
    return await tmdb_get(f"/trending/{media_type}/{window}", {"language": "en-US"})


async def get_top_rated_movies(page: int = 1) -> dict:
    return await tmdb_get("/movie/top_rated", {"page": page, "language": "en-US"})


async def get_top_rated_shows(page: int = 1) -> dict:
    return await tmdb_get("/tv/top_rated", {"page": page, "language": "en-US"})


async def get_movie_details(movie_id: int) -> dict:
    return await tmdb_get(f"/movie/{movie_id}", {"language": "en-US", "append_to_response": "external_ids,videos,similar"})


async def get_show_details(show_id: int) -> dict:
    return await tmdb_get(f"/tv/{show_id}", {"language": "en-US", "append_to_response": "external_ids,videos,similar"})


async def get_movie_credits(movie_id: int) -> dict:
    return await tmdb_get(f"/movie/{movie_id}/credits", {"language": "en-US"})


async def get_show_credits(show_id: int) -> dict:
    return await tmdb_get(f"/tv/{show_id}/credits", {"language": "en-US"})


async def get_show_season(show_id: int, season_number: int) -> dict:
    return await tmdb_get(f"/tv/{show_id}/season/{season_number}", {"language": "en-US"})


async def search_multi(query: str, page: int = 1) -> dict:
    return await tmdb_get("/search/multi", {"query": query, "page": page, "language": "en-US"})
