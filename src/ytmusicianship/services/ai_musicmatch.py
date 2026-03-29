"""AI-powered MusicMatch service using OpenAI-compatible APIs."""

import json
import os
from typing import Optional

import httpx

from ytmusicianship.config import settings
from ytmusicianship.db import AsyncSessionLocal, Setting
from ytmusicianship.services.library import get_liked_songs, search
from ytmusicianship.services.ranking import get_top_artists, get_top_songs


async def get_ai_settings() -> dict:
    """Get AI settings from database."""
    async with AsyncSessionLocal() as session:
        keys = ["ai_base_url", "ai_api_key", "ai_model"]
        result = {}
        for k in keys:
            row = await session.get(Setting, k)
            result[k] = row.value if row else ""
        return result


async def get_taste_profile() -> dict:
    """Get user's taste profile data for display and AI context."""
    top_songs_data = await get_top_songs(limit=20)
    top_artists_data = await get_top_artists(limit=20)
    recent_likes = await get_liked_songs(limit=50)

    # Get unique liked artists with counts
    liked_artists_map: dict[str, int] = {}
    for track in recent_likes:
        artist = track.get("artist", "Unknown")
        if artist and artist != "Unknown":
            liked_artists_map[artist] = liked_artists_map.get(artist, 0) + 1

    liked_artists = [{"name": name, "count": count} for name, count in sorted(liked_artists_map.items(), key=lambda x: -x[1])[:15]]

    return {
        "top_songs": [{"name": s["entity_name"], "score": s["score"], "plays": s["play_count"]} for s in top_songs_data[:10]],
        "top_artists": [{"name": a["entity_name"], "score": a["score"]} for a in top_artists_data[:10]],
        "liked_artists": liked_artists,
        "total_liked_songs": len(recent_likes),
    }


async def generate_playlist_with_ai(
    source_playlists: list[str],
    source_artists: list[str],
    name: Optional[str] = None,
    description: Optional[str] = None,
    mode: str = "auto",
    selection_weight: int = 50,  # 0 = fully exploratory, 100 = strictly selected sources only
) -> dict:
    """
    Use AI to generate an intelligent playlist based on user preferences.

    Args:
        source_playlists: List of playlist titles selected by user
        source_artists: List of artist names selected by user
        name: Optional playlist name (AI will generate if not provided)
        description: Optional description
        mode: "exact", "search", or "auto"

    Returns:
        dict with playlist_name, tracks (list of {title, artist, album}), and reasoning
    """
    ai_config = await get_ai_settings()

    if not ai_config.get("ai_api_key") or not ai_config.get("ai_base_url"):
        raise RuntimeError("AI not configured. Please set up AI settings first.")

    # Gather user stats for context
    top_songs_data = await get_top_songs(limit=20)
    top_artists_data = await get_top_artists(limit=20)
    recent_likes = await get_liked_songs(limit=50)

    top_songs = [s["entity_name"] for s in top_songs_data]
    top_artists = [a["entity_name"] for a in top_artists_data]
    liked_artists = list(set([t.get("artist", "Unknown") for t in recent_likes if t.get("artist")]))

    # Calculate selection vs taste weighting for transparency
    selection_pct = selection_weight
    taste_pct = 100 - selection_weight

    # Build the prompt
    prompt = f"""You are a music recommendation AI with deep understanding of musical styles, emotions, and vibes. Your job is to create a playlist that captures the FEELING and ESSENCE of what the user is looking for.

WEIGHTING CONFIGURATION:
- Selection Weight: {selection_pct}% (how much to prioritize user's explicit selections)
- Taste Profile Weight: {taste_pct}% (how much to consider user's general listening history)
- Mode: {mode}

USER'S SELECTIONS (Primary Influence - {selection_pct}%):
{chr(10).join([f"- Playlist: {p}" for p in source_playlists]) if source_playlists else "- No playlists selected"}
{chr(10).join([f"- Artist: {a}" for a in source_artists]) if source_artists else "- No artists selected"}

USER'S TASTE PROFILE (Supporting Influence - {taste_pct}%):
- Top Artists (by play count): {', '.join(top_artists[:10])}
- Top Songs: {', '.join(top_songs[:10])}
- Recently Liked Artists: {', '.join(liked_artists[:15])}

MODE EXPLANATION:
- "exact": Prioritize songs directly from selected sources and similar artists (heavily weight selections)
- "search": Be creative and discover new songs in the same vibe (balance taste profile + selections)
- "auto": Intelligent balance based on selections vs general taste

YOUR TASK - ANALYZE AND CREATE:

STEP 1: VIBE ANALYSIS
First, deeply analyze the user's selections to identify:
- What emotional qualities connect these artists/playlists? (energy, mood, themes, storytelling style)
- What is the "vibe" or "feeling" the user is going for?
- Are there contrasting elements that create an interesting dynamic?
- What genres, eras, or styles are represented?

STEP 2: PLAYLIST CREATION
1. {"Generate a creative playlist name that captures the vibe (5 words or less)" if not name else f'Use this playlist name: "{name}"'}
2. Select exactly 100 songs that MATCH THE VIBE - not just the same artists or genres, but songs that evoke the same feeling
3. Think creatively: A Hamilton song, an Eminem track, and a Jesse & Joy song might share storytelling intensity, emotional rawness, or theatrical energy
4. For each song, provide: title, artist, album (if known)

STEP 3: DETAILED REASONING
You MUST explain in your reasoning:
- What "vibe" or "feeling" you detected from the selections (e.g., "introspective storytelling," "high-energy empowerment," "emotional vulnerability")
- How you translated that vibe into song choices across different artists/genres
- What percentage came from direct selections vs vibe-based discovery
- Specific examples: "I chose [Song X] because it captures the same raw emotional energy as Eminem's storytelling..."

RESPOND ONLY with a JSON object in this exact format:
{{
  "playlist_name": "string",
  "description": "string capturing the vibe/theme",
  "vibe_detected": "description of the emotional/ stylistic quality you identified",
  "reasoning": "detailed explanation of your vibe analysis and how you selected songs to match it",
  "selection_breakdown": {{
    "from_direct_selections": "approximate percentage",
    "from_taste_profile": "approximate percentage",
    "key_influences": ["artist1", "artist2", "etc"],
    "vibe_elements": ["storytelling", "high energy", "emotional rawness", etc]
  }},
  "tracks": [
    {{"title": "Song Title", "artist": "Artist Name", "album": "Album Name"}},
    ...
  ]
}}
"""

    # Call AI API
    base_url = ai_config["ai_base_url"].rstrip("/")
    api_key = ai_config["ai_api_key"]
    model = ai_config.get("ai_model") or "gpt-4"

    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.post(
            f"{base_url}/chat/completions",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            json={
                "model": model,
                "messages": [
                    {"role": "system", "content": "You are a music recommendation expert. Respond only with valid JSON."},
                    {"role": "user", "content": prompt}
                ],
                "temperature": 0.8,
                "max_tokens": 8000,  # Enough for 100 songs
            }
        )

        if response.status_code != 200:
            raise RuntimeError(f"AI API error: {response.status_code} - {response.text}")

        data = response.json()
        content = data["choices"][0]["message"]["content"]

        # Parse JSON response (handle markdown code blocks)
        json_str = content
        if "```json" in content:
            json_str = content.split("```json")[1].split("```")[0]
        elif "```" in content:
            json_str = content.split("```")[1].split("```")[0]

        result = json.loads(json_str.strip())

        return {
            "playlist_name": result.get("playlist_name", name or "AI Generated Mix"),
            "description": result.get("description", description or ""),
            "reasoning": result.get("reasoning", ""),
            "selection_breakdown": result.get("selection_breakdown", {}),
            "tracks": result.get("tracks", []),
        }


async def search_tracks_on_ytmusic(tracks: list[dict]) -> list[str]:
    """
    Search for tracks on YouTube Music and return video IDs.

    Args:
        tracks: List of {title, artist, album} dicts

    Returns:
        List of video IDs that were found
    """
    video_ids = []

    for track in tracks:
        query = f"{track['title']} {track['artist']}"
        try:
            results = await search(query=query, filter="songs", limit=5)
            # Find best match
            for result in results:
                if result.get("video_id"):
                    video_ids.append(result["video_id"])
                    break
        except Exception as e:
            print(f"[AI MusicMatch] Search failed for '{query}': {e}")
            continue

    return list(dict.fromkeys(video_ids))  # Remove duplicates while preserving order
