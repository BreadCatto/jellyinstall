from fastapi import APIRouter
from backend.app.services import stream_service

router = APIRouter(prefix="/api/streams", tags=["streams"])


@router.get("/movie/{imdb_id}")
async def movie_streams(imdb_id: str):
    data = await stream_service.get_movie_streams(imdb_id)
    streams = [stream_service.parse_stream(s) for s in data.get("streams", [])]
    # Filter out streams without direct download URLs (skip m3u8 playlists)
    streams = [s for s in streams if s["url"] and not s["url"].endswith(".m3u8")]
    return {"streams": streams}


@router.get("/series/{imdb_id}/{season}/{episode}")
async def series_streams(imdb_id: str, season: int, episode: int):
    data = await stream_service.get_series_streams(imdb_id, season, episode)
    streams = [stream_service.parse_stream(s) for s in data.get("streams", [])]
    streams = [s for s in streams if s["url"] and not s["url"].endswith(".m3u8")]
    return {"streams": streams}
