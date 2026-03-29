from typing import Optional
from mcp.server.fastmcp import FastMCP

from ytmusicianship.services import library, playlist, ranking, jobs

mcp = FastMCP("YTMusicianship")

# ─── Library Tools ───

@mcp.tool()
async def list_playlists(limit: Optional[int] = 25) -> list:
    """List the user's YouTube Music playlists."""
    return await playlist.list_playlists(limit=limit)


@mcp.tool()
async def get_playlist_tracks(playlist_id: str, limit: int = 0) -> list:
    """Get all tracks in a playlist. Use limit=0 for no limit."""
    return await playlist.get_playlist_tracks(playlist_id, limit=limit)


@mcp.tool()
async def get_liked_songs(limit: Optional[int] = None) -> list:
    """Get the user's liked songs."""
    return await library.get_liked_songs(limit=limit)


@mcp.tool()
async def search_yt_music(query: str, limit: int = 20) -> list:
    """Search YouTube Music for songs, albums, or artists."""
    return await library.search(query=query, limit=limit)


# ─── Playlist Management Tools ───

@mcp.tool()
async def true_shuffle_playlist(playlist_id: str, target_name: Optional[str] = None) -> dict:
    """
    True-shuffle an entire playlist. Fetches all tracks, shuffles them, creates
    a new playlist with the shuffled order, and deletes the old playlist if owned.
    """
    return await playlist.true_shuffle_playlist(playlist_id, target_name=target_name)


@mcp.tool()
async def add_tracks_to_playlist(playlist_id: str, video_ids: list[str]) -> dict:
    """Add one or more tracks to a playlist by their video IDs."""
    return await playlist.add_tracks_to_playlist(playlist_id, video_ids)


@mcp.tool()
async def remove_tracks_from_playlist(playlist_id: str, video_ids: list[str]) -> dict:
    """Remove one or more tracks from a playlist by their video IDs."""
    return await playlist.remove_tracks_from_playlist(playlist_id, video_ids)


@mcp.tool()
async def generate_playlist(name: str, track_ids: list[str], description: str = "") -> str:
    """Create a new playlist from a list of video IDs."""
    return await playlist.generate_playlist(name=name, track_ids=track_ids, description=description)


# ─── Ranking & Insights Tools ───

@mcp.tool()
async def sync_history() -> dict:
    """Sync listening history from YouTube Music and recompute rankings."""
    synced = await ranking.sync_history()
    computed = await ranking.compute_rankings()
    return {"sync_history": synced, "compute_rankings": computed}


@mcp.tool()
async def get_top_songs(limit: int = 20) -> list:
    """Get the top-ranked songs based on listening history and likes."""
    return await ranking.get_top_songs(limit=limit)


@mcp.tool()
async def get_top_artists(limit: int = 20) -> list:
    """Get the top-ranked artists based on listening history and likes."""
    return await ranking.get_top_artists(limit=limit)


@mcp.tool()
async def get_song_ranking(video_id: str) -> Optional[dict]:
    """Get the computed ranking score for a specific song by video ID."""
    return await ranking.get_song_ranking(video_id)


# ─── Scheduling Tools ───

@mcp.tool()
async def create_scheduled_job(
    name: str,
    action: str,
    cron: str,
    target_playlist_id: Optional[str] = None,
) -> dict:
    """
    Create a scheduled job. Actions: 'shuffle' or 'sync_history'.
    Cron is a 5-field string like '0 8 * * 1' for Monday 8am.
    """
    return await jobs.create_job(
        name=name,
        action=action,
        cron=cron,
        target_playlist_id=target_playlist_id,
    )


@mcp.tool()
async def list_scheduled_jobs() -> list:
    """List all scheduled jobs."""
    return await jobs.list_jobs()


@mcp.tool()
async def delete_scheduled_job(job_id: str) -> dict:
    """Delete a scheduled job by its ID."""
    return await jobs.delete_job(job_id)


# ─── Application Mounting ───

def get_mcp_app():
    """Return the ASGI app for MCP SSE transport."""
    return mcp.sse_app()
