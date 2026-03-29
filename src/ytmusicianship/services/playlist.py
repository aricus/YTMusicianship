import random
from typing import Optional
from ytmusicianship.yt_client import yt_client


async def list_playlists(limit: Optional[int] = None) -> list:
    playlists = await yt_client.get_library_playlists(limit=limit or 25)
    return [
        {
            "playlist_id": pl.get("playlistId"),
            "title": pl.get("title", "Untitled"),
            "thumbnail": pl.get("thumbnails", [{}])[-1].get("url"),
            "count": pl.get("count"),
            "author": pl.get("author", {}).get("name") if isinstance(pl.get("author"), dict) else None,
        }
        for pl in playlists
    ]


async def get_playlist_tracks(playlist_id: str, limit: int = 0) -> list:
    result = await yt_client.get_playlist(playlist_id, limit=limit)
    tracks = result.get("tracks", [])
    return [
        {
            "video_id": t.get("videoId"),
            "title": t.get("title", "Unknown"),
            "artist": _first_artist_name(t),
            "duration": t.get("duration"),
            "set_video_id": t.get("setVideoId"),
        }
        for t in tracks
    ]


async def create_playlist(name: str, description: str = "", video_ids: Optional[list] = None) -> str:
    playlist_id = await yt_client.create_playlist(title=name, description=description, video_ids=video_ids or [])
    return playlist_id


async def add_tracks_to_playlist(playlist_id: str, video_ids: list) -> dict:
    await yt_client.add_playlist_items(playlist_id, video_ids)
    return {"status": "ok", "added": len(video_ids)}


async def remove_tracks_from_playlist(playlist_id: str, video_ids: list) -> dict:
    # Need setVideoId for removal; fetch current tracks
    tracks = await get_playlist_tracks(playlist_id)
    removal_map = {t["video_id"]: t["set_video_id"] for t in tracks if t.get("set_video_id")}
    videos_to_remove = []
    for vid in video_ids:
        if vid in removal_map:
            videos_to_remove.append({"videoId": vid, "setVideoId": removal_map[vid]})
    if not videos_to_remove:
        return {"status": "ok", "removed": 0}
    await yt_client.remove_playlist_items(playlist_id, videos_to_remove)
    return {"status": "ok", "removed": len(videos_to_remove)}


async def true_shuffle_playlist(playlist_id: str, target_name: Optional[str] = None) -> dict:
    """
    Fetch all tracks, shuffle, create a new playlist with the shuffled order,
    and delete the old playlist if it is user-owned.
    """
    # Fetch old playlist details
    old_pl = await yt_client.get_playlist(playlist_id, limit=0)
    old_title = target_name or old_pl.get("title", "Shuffled Playlist")
    old_description = old_pl.get("description", "")
    tracks = old_pl.get("tracks", [])

    if not tracks:
        return {"status": "error", "message": "Playlist is empty"}

    # Extract video ids and shuffle
    video_ids = [t["videoId"] for t in tracks if t.get("videoId")]
    random.shuffle(video_ids)

    # Create new playlist
    new_playlist_id = await yt_client.create_playlist(
        title=old_title,
        description=old_description,
        video_ids=video_ids,
    )

    # Determine ownership: if author looks like us (None or empty) we treat as owned
    author = old_pl.get("author")
    author_name = author.get("name") if isinstance(author, dict) else author
    is_owned = not author_name or author_name == "YouTube Music" or author_name == ""

    deleted_old = False
    if is_owned and playlist_id != new_playlist_id:
        try:
            await yt_client.delete_playlist(playlist_id)
            deleted_old = True
        except Exception:
            deleted_old = False

    return {
        "status": "ok",
        "new_playlist_id": new_playlist_id,
        "old_playlist_id": playlist_id,
        "deleted_old": deleted_old,
        "track_count": len(video_ids),
    }


async def generate_playlist(name: str, track_ids: list, description: str = "") -> str:
    """Create a playlist from a list of video IDs chosen by the AI/user."""
    playlist_id = await yt_client.create_playlist(title=name, description=description, video_ids=track_ids)
    return playlist_id


def _first_artist_name(track: dict) -> str:
    artists = track.get("artists", [])
    return artists[0].get("name", "Unknown") if artists else "Unknown"
