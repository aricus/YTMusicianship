from typing import Optional
from ytmusicianship.yt_client import yt_client


async def get_liked_songs(limit: Optional[int] = None) -> list:
    result = await yt_client.get_liked_songs(limit=limit or 0)
    tracks = result.get("tracks", [])
    return [_clean_track(t) for t in tracks]


async def get_history() -> list:
    history = await yt_client.get_history()
    return [_clean_track(t) for t in history]


async def search(query: str, filter: str = "songs", limit: int = 20) -> list:
    results = await yt_client.search(query=query, filter=filter, limit=limit)
    return [_clean_search_result(r) for r in results]


def _clean_track(track: dict) -> dict:
    artists = track.get("artists", [])
    artist_name = artists[0].get("name", "Unknown") if artists else "Unknown"
    album = track.get("album")
    album_name = album.get("name", "Unknown") if isinstance(album, dict) else "Unknown"
    return {
        "video_id": track.get("videoId") or track.get("video_id"),
        "title": track.get("title", "Unknown"),
        "artist": artist_name,
        "album": album_name,
        "duration": track.get("duration"),
        "thumbnail": track.get("thumbnails", [{}])[-1].get("url"),
    }


def _clean_search_result(result: dict) -> dict:
    artists = result.get("artists", [])
    artist_name = artists[0].get("name", "Unknown") if artists else "Unknown"
    album = result.get("album")
    album_name = album.get("name", "Unknown") if isinstance(album, dict) else "Unknown"
    return {
        "video_id": result.get("videoId"),
        "title": result.get("title", "Unknown"),
        "artist": artist_name,
        "album": album_name,
        "result_type": result.get("resultType", "song"),
    }
