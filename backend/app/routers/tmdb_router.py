from fastapi import APIRouter, Query
from backend.app.services import tmdb_service

router = APIRouter(prefix="/api/tmdb", tags=["tmdb"])


@router.get("/popular/movies")
async def popular_movies(page: int = Query(1, ge=1)):
    return await tmdb_service.get_popular_movies(page)


@router.get("/popular/shows")
async def popular_shows(page: int = Query(1, ge=1)):
    return await tmdb_service.get_popular_shows(page)


@router.get("/trending/{media_type}")
async def trending(media_type: str = "all", window: str = Query("day")):
    return await tmdb_service.get_trending(media_type, window)


@router.get("/top-rated/movies")
async def top_rated_movies(page: int = Query(1, ge=1)):
    return await tmdb_service.get_top_rated_movies(page)


@router.get("/top-rated/shows")
async def top_rated_shows(page: int = Query(1, ge=1)):
    return await tmdb_service.get_top_rated_shows(page)


@router.get("/movie/{movie_id}")
async def movie_details(movie_id: int):
    return await tmdb_service.get_movie_details(movie_id)


@router.get("/show/{show_id}")
async def show_details(show_id: int):
    return await tmdb_service.get_show_details(show_id)


@router.get("/movie/{movie_id}/credits")
async def movie_credits(movie_id: int):
    return await tmdb_service.get_movie_credits(movie_id)


@router.get("/show/{show_id}/credits")
async def show_credits(show_id: int):
    return await tmdb_service.get_show_credits(show_id)


@router.get("/show/{show_id}/season/{season_number}")
async def show_season(show_id: int, season_number: int):
    return await tmdb_service.get_show_season(show_id, season_number)


@router.get("/search")
async def search(q: str = Query(..., min_length=1), page: int = Query(1, ge=1)):
    return await tmdb_service.search_multi(q, page)
