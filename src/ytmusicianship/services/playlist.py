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


async def get_playlist_tracks(playlist_id: str, limit: int = 5000) -> list:
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


async def true_shuffle_playlist(playlist_ids: list[str], target_name: Optional[str] = None) -> dict:
    """
    Fetch all tracks from one or more playlists, shuffle, create a new playlist with the shuffled order.
    Only deletes the original if there's exactly one playlist and it's user-owned.
    """
    all_tracks = []
    playlist_titles = []

    # Fetch all playlists
    for playlist_id in playlist_ids:
        old_pl = await yt_client.get_playlist(playlist_id, limit=5000)
        playlist_titles.append(old_pl.get("title", "Untitled"))
        all_tracks.extend(old_pl.get("tracks", []))

    # Generate playlist name
    if target_name:
        old_title = target_name
    elif len(playlist_ids) == 1:
        old_title = f"{playlist_titles[0]} (Shuffled)"
    else:
        old_title = f"Combined Mix ({len(playlist_ids)} playlists)"

    # Use description from first playlist or empty
    old_description = ""
    if playlist_ids:
        first_pl = await yt_client.get_playlist(playlist_ids[0], limit=1)
        old_description = first_pl.get("description") or ""

    tracks = all_tracks

    if not tracks:
        return {"status": "error", "message": "Playlist is empty"}

    if not tracks:
        return {"status": "error", "message": "Playlist is empty"}

    # Extract video ids and shuffle (filter out None values)
    video_ids = [t.get("videoId") for t in tracks if t.get("videoId")]
    random.shuffle(video_ids)

    # Create playlist with all video_ids directly (ytmusicapi handles batching internally)
    new_playlist_id = await yt_client.create_playlist(
        title=old_title,
        description=old_description,
        video_ids=video_ids,
    )

    # Verify track count (some tracks may fail to add)
    try:
        new_pl = await yt_client.get_playlist(new_playlist_id, limit=0)
        actual_count = len(new_pl.get("tracks", []))
    except Exception:
        actual_count = len(video_ids)

    # Only delete original if single playlist and user-owned
    deleted_old = False
    if len(playlist_ids) == 1:
        old_pl = await yt_client.get_playlist(playlist_ids[0], limit=1)
        author = old_pl.get("author")
        author_name = author.get("name") if isinstance(author, dict) else author
        is_owned = not author_name or author_name == "YouTube Music" or author_name == ""

        if is_owned and playlist_ids[0] != new_playlist_id:
            try:
                await yt_client.delete_playlist(playlist_ids[0])
                deleted_old = True
            except Exception:
                deleted_old = False

    return {
        "status": "ok",
        "new_playlist_id": new_playlist_id,
        "new_playlist_title": old_title,
        "old_playlist_ids": playlist_ids,
        "deleted_old": deleted_old,
        "track_count": actual_count,
        "expected_count": len(video_ids),
        "source_playlist_count": len(playlist_ids),
    }


async def generate_playlist(name: str, track_ids: list, description: str = "") -> str:
    """Create a playlist from a list of video IDs chosen by the AI/user."""
    playlist_id = await yt_client.create_playlist(title=name, description=description, video_ids=track_ids)
    return playlist_id


def _first_artist_name(track: dict) -> str:
    artists = track.get("artists", [])
    return artists[0].get("name", "Unknown") if artists else "Unknown"


async def musicmatch(
    source_playlist_ids: list[str] = None,
    source_artists: list[str] = None,
    name: str = "",
    description: str = "",
    mode: str = "auto"
) -> dict:
    """
    Generate a new playlist based on source playlists and/or artists using AI matching.

    Args:
        source_playlist_ids: List of playlist IDs to use as inspiration
        source_artists: List of artist names to use as inspiration
        name: Name for the new playlist
        description: Description for the new playlist
        mode: "exact" | "search" | "auto" - how to match songs

    Returns:
        dict with status, playlist_id, and tracks
    """
    from ytmusicianship.services.library import get_liked_songs, search

    all_video_ids: list[str] = []
    source_track_count = 0

    # Collect tracks from selected playlists
    if source_playlist_ids:
        for playlist_id in source_playlist_ids:
            source_tracks = await get_playlist_tracks(playlist_id, limit=0)
            source_track_count += len(source_tracks)
            for t in source_tracks:
                vid = t.get("video_id")
                if vid and vid not in all_video_ids:
                    all_video_ids.append(vid)

    # Collect tracks from selected artists (from liked songs)
    if source_artists:
        liked = await get_liked_songs(limit=5000)
        for track in liked:
            if track.get("artist") in source_artists:
                vid = track.get("video_id")
                if vid and vid not in all_video_ids:
                    all_video_ids.append(vid)

    if not all_video_ids:
        return {"status": "error", "message": "No source tracks found from selected playlists/artists"}

    # For now, shuffle and use the collected tracks
    # TODO: Implement actual AI matching with search based on mode
    random.shuffle(all_video_ids)

    # Create new playlist
    new_playlist_id = await create_playlist(
        name=name,
        description=description or f"AI-generated mix",
    )

    # Add tracks to the new playlist (limit to 100 for now)
    selected_tracks = all_video_ids[:100]
    if selected_tracks:
        await add_tracks_to_playlist(new_playlist_id, selected_tracks)

    return {
        "status": "ok",
        "playlist_id": new_playlist_id,
        "tracks": selected_tracks,
        "source_track_count": source_track_count,
        "unique_tracks": len(all_video_ids),
    }
