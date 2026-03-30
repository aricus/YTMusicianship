import json
from typing import Optional
from fastapi import APIRouter, UploadFile, File, Query
from pydantic import BaseModel, Field
from pathlib import Path

from ytmusicianship.config import settings
from ytmusicianship.yt_client import yt_client
from ytmusicianship.services import library, playlist, ranking, jobs
from ytmusicianship.db import AsyncSessionLocal, Setting
from ytmusicianship.auth.oauth_flow import generate_oauth_url, exchange_code

router = APIRouter()


class HealthResponse(BaseModel):
    status: str
    authenticated: bool


class GeneratePlaylistRequest(BaseModel):
    name: str
    track_ids: list[str]
    description: str = ""


class CreateJobRequest(BaseModel):
    name: str
    action: str = Field(..., pattern="^(shuffle|sync_history|generate_discovery)$")
    cron: str
    target_playlist_id: Optional[str] = None
    config_json: Optional[str] = None


class ShuffleRequest(BaseModel):
    target_name: Optional[str] = None


class AISettingsPayload(BaseModel):
    ai_base_url: str = ""
    ai_api_key: str = ""
    ai_model: str = ""


class MusicMatchRequest(BaseModel):
    source_playlist_ids: list[str] = []
    source_artists: list[str] = []
    name: str = ""  # Optional - AI will generate if not provided
    description: str = ""
    mode: str = Field(default="auto", pattern="^(exact|search|auto)$")
    use_ai: bool = False  # Enable AI-powered generation
    selection_weight: int = Field(default=50, ge=0, le=100)  # 0 = fully exploratory, 100 = strictly selections


class AuthCookiesPayload(BaseModel):
    sid: str
    login_info: str
    authuser: str = "0"
    sapisid: str  # __Secure-3PAPISID cookie value


@router.get("/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    oauth_exists = Path(settings.ytm_oauth_path).exists()
    authenticated = False
    if oauth_exists:
        try:
            await yt_client.get_library_playlists(limit=1)
            authenticated = True
        except Exception:
            authenticated = False
    return HealthResponse(status="ok", authenticated=authenticated)


@router.post("/auth/upload")
async def upload_auth(file: UploadFile = File(...)):
    content = await file.read()
    settings.ytm_oauth_path.parent.mkdir(parents=True, exist_ok=True)
    with open(settings.ytm_oauth_path, "wb") as f:
        f.write(content)
    yt_client.invalidate()
    try:
        await yt_client.get_library_playlists(limit=1)
        return {"status": "ok", "message": "oauth.json uploaded and validated"}
    except Exception as e:
        return {"status": "error", "message": str(e)}


@router.post("/auth/cookies")
async def submit_auth_cookies(payload: AuthCookiesPayload):
    """Submit auth cookies from browser to create oauth.json"""
    import json
    import time
    from hashlib import sha1

    # Generate SAPISIDHASH from __Secure-3PAPISID cookie
    # This is required for browser authentication
    unix_timestamp = str(int(time.time()))
    auth_string = f"{payload.sapisid} https://music.youtube.com"
    sha1_hash = sha1((unix_timestamp + " " + auth_string).encode("utf-8")).hexdigest()
    authorization = f"SAPISIDHASH {unix_timestamp}_{sha1_hash}"

    auth_data = {
        "cookie": f"SID={payload.sid}; LOGIN_INFO={payload.login_info}; __Secure-3PAPISID={payload.sapisid}",
        "authorization": authorization,
        "x-goog-authuser": payload.authuser,
        "origin": "https://music.youtube.com",
        "x-origin": "https://music.youtube.com",
        "referer": "https://music.youtube.com/",
        "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36"
    }

    settings.ytm_oauth_path.parent.mkdir(parents=True, exist_ok=True)
    with open(settings.ytm_oauth_path, "w") as f:
        json.dump(auth_data, f, indent=2)

    yt_client.invalidate()

    # Verify it works
    try:
        await yt_client.get_library_playlists(limit=1)
        return {"status": "ok", "message": "Authentication successful"}
    except Exception as e:
        return {"status": "error", "message": str(e)}


class OAuthStartRequest(BaseModel):
    client_id: str
    client_secret: str


class OAuthCallbackRequest(BaseModel):
    code: str
    state: str


@router.post("/auth/oauth/start")
async def oauth_start(payload: OAuthStartRequest):
    """Start OAuth flow and return URL for user to visit."""
    from ytmusicianship.auth.oauth_flow import generate_oauth_url

    auth_url, state = generate_oauth_url(
        client_id=payload.client_id,
        client_secret=payload.client_secret,
        redirect_uri="urn:ietf:wg:oauth:2.0:oob",  # Out-of-band flow
    )

    return {
        "status": "ok",
        "auth_url": auth_url,
        "state": state,
        "instructions": "1. Open the auth_url in your browser\n2. Sign in with Google\n3. Copy the authorization code\n4. Call /auth/oauth/complete with the code",
    }


@router.post("/auth/oauth/complete")
async def oauth_complete(payload: OAuthCallbackRequest):
    """Complete OAuth flow with authorization code."""
    from ytmusicianship.auth.oauth_flow import exchange_code

    result = exchange_code(
        code=payload.code,
        state=payload.state,
        oauth_path=settings.ytm_oauth_path,
    )

    if result["status"] == "ok":
        yt_client.invalidate()
        # Verify it works
        try:
            await yt_client.get_library_playlists(limit=1)
        except Exception as e:
            return {"status": "error", "message": f"Saved credentials but API test failed: {e}"}

    return result


class HeadersPayload(BaseModel):
    headers: str


@router.post("/auth/headers")
async def submit_headers(payload: HeadersPayload):
    """Submit raw headers or cURL command to create oauth.json"""
    import json
    import re
    import time
    from hashlib import sha1

    try:
        # Extract headers from cURL command or raw text
        headers_text = payload.headers
        extracted = {}

        # Try to parse as cURL command first
        if "curl" in headers_text.lower():
            # Extract -H 'Header: value' patterns
            header_pattern = r"-H\s+'([^']+)'"
            matches = re.findall(header_pattern, headers_text)
            for match in matches:
                if ":" in match:
                    key, value = match.split(":", 1)
                    extracted[key.strip().lower()] = value.strip()

            # Also try to find cookie in -b flag
            cookie_pattern = r"-b\s+'([^']+)'"
            cookie_match = re.search(cookie_pattern, headers_text)
            if cookie_match:
                extracted["cookie"] = cookie_match.group(1)
        else:
            # Parse as raw header lines
            for line in headers_text.strip().split("\n"):
                if ":" in line:
                    key, value = line.split(":", 1)
                    extracted[key.strip().lower()] = value.strip()

        # Check if we have the required headers
        cookie = extracted.get("cookie", "")
        if not cookie:
            return {"status": "error", "message": "No cookie found in headers"}

        # Extract __Secure-3PAPISID from cookie
        sapisid_match = re.search(r'__Secure-3PAPISID=([^;\s]+)', cookie)
        if not sapisid_match:
            return {"status": "error", "message": "__Secure-3PAPISID not found in cookie"}

        sapisid = sapisid_match.group(1)

        # Generate SAPISIDHASH
        unix_timestamp = str(int(time.time()))
        auth_string = f"{sapisid} https://music.youtube.com"
        sha1_hash = sha1((unix_timestamp + " " + auth_string).encode("utf-8")).hexdigest()
        authorization = f"SAPISIDHASH {unix_timestamp}_{sha1_hash}"

        # Build auth data
        auth_data = {
            "cookie": cookie,
            "authorization": authorization,
            "x-goog-authuser": extracted.get("x-goog-authuser", "0"),
            "origin": extracted.get("origin", "https://music.youtube.com"),
            "x-origin": extracted.get("x-origin", "https://music.youtube.com"),
            "referer": extracted.get("referer", "https://music.youtube.com/"),
            "user-agent": extracted.get("user-agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36")
        }

        # Save to file
        settings.ytm_oauth_path.parent.mkdir(parents=True, exist_ok=True)
        with open(settings.ytm_oauth_path, "w") as f:
            json.dump(auth_data, f, indent=2)

        yt_client.invalidate()

        # Verify it works
        try:
            await yt_client.get_library_playlists(limit=1)
            return {"status": "ok", "message": "Authentication successful"}
        except Exception as e:
            return {"status": "error", "message": f"Saved credentials but API test failed: {e}"}

    except Exception as e:
        return {"status": "error", "message": f"Failed to parse headers: {e}"}


# Library
@router.get("/library/likes")
async def get_likes(limit: Optional[int] = Query(None)):
    return {"tracks": await library.get_liked_songs(limit=limit)}


@router.get("/library/history")
async def get_history():
    return {"tracks": await library.get_history()}


@router.get("/library/search")
async def search_library(query: str = Query(...), filter: str = Query("songs"), limit: int = Query(20)):
    return {"results": await library.search(query=query, filter=filter, limit=limit)}


@router.post("/library/sync-history")
async def sync_history():
    synced = await ranking.sync_history()
    computed = await ranking.compute_rankings()
    return {"sync_history": synced, "compute_rankings": computed}


# Playlists
@router.get("/playlists")
async def list_playlists(limit: Optional[int] = Query(None)):
    return {"playlists": await playlist.list_playlists(limit=limit)}


@router.post("/playlists")
async def create_playlist(payload: GeneratePlaylistRequest):
    pl_id = await playlist.create_playlist(name=payload.name, description=payload.description)
    if payload.track_ids:
        await playlist.add_tracks_to_playlist(pl_id, payload.track_ids)
    return {"playlist_id": pl_id}


@router.get("/playlists/{playlist_id}/tracks")
async def get_playlist_tracks(playlist_id: str, limit: int = Query(5000)):
    return {"tracks": await playlist.get_playlist_tracks(playlist_id, limit=limit)}


class MultiShuffleRequest(BaseModel):
    playlist_ids: list[str]
    target_name: Optional[str] = None


@router.post("/playlists/{playlist_id}/shuffle")
async def shuffle_playlist(playlist_id: str, payload: Optional[ShuffleRequest] = None):
    target_name = payload.target_name if payload else None
    return await playlist.true_shuffle_playlist([playlist_id], target_name=target_name)


@router.post("/playlists/shuffle")
async def shuffle_multiple_playlists(payload: MultiShuffleRequest):
    """Shuffle multiple playlists together into one."""
    return await playlist.true_shuffle_playlist(payload.playlist_ids, target_name=payload.target_name)


@router.post("/playlists/{playlist_id}/tracks")
async def add_tracks(playlist_id: str, payload: dict):
    video_ids = payload.get("video_ids", [])
    return await playlist.add_tracks_to_playlist(playlist_id, video_ids)


@router.delete("/playlists/{playlist_id}/tracks")
async def remove_tracks(playlist_id: str, payload: dict):
    video_ids = payload.get("video_ids", [])
    return await playlist.remove_tracks_from_playlist(playlist_id, video_ids)


@router.delete("/playlists/{playlist_id}")
async def delete_playlist(playlist_id: str):
    await yt_client.delete_playlist(playlist_id)
    return {"status": "ok", "message": "Playlist deleted"}


@router.post("/playlists/generate")
async def generate_playlist(payload: GeneratePlaylistRequest):
    pl_id = await playlist.generate_playlist(name=payload.name, track_ids=payload.track_ids, description=payload.description)
    return {"playlist_id": pl_id}


class GenerateVibeRequest(BaseModel):
    vibe: str
    name: Optional[str] = None


@router.post("/playlists/generate-vibe")
async def generate_vibe_playlist(payload: GenerateVibeRequest):
    """
    Generate a playlist from a vibe/mood/feeling description using AI.
    """
    from ytmusicianship.services.ai_musicmatch import (
        generate_playlist_from_vibe,
        search_tracks_on_ytmusic,
    )
    from ytmusicianship.services import playlist as playlist_service

    if not payload.vibe.strip():
        return {"status": "error", "message": "Please describe a vibe, mood, or feeling"}

    try:
        # Generate AI recommendations based on vibe
        ai_result = await generate_playlist_from_vibe(
            vibe_description=payload.vibe,
            name=payload.name,
        )
    except RuntimeError as e:
        error_msg = str(e)
        if "AI API error:" in error_msg:
            return {"status": "error", "message": f"AI service error: {error_msg.split(' - ', 1)[-1]}"}
        return {"status": "error", "message": f"AI generation failed: {error_msg}"}
    except Exception as e:
        return {"status": "error", "message": f"Unexpected error during AI generation: {str(e)}"}

    # Search for the tracks on YouTube Music
    video_ids = await search_tracks_on_ytmusic(ai_result["tracks"])

    if not video_ids:
        return {"status": "error", "message": "AI generated tracks but none were found on YouTube Music"}

    # Create the playlist with AI-generated or provided name
    playlist_name = payload.name or ai_result["playlist_name"]
    playlist_description = ai_result["description"]

    new_playlist_id = await playlist_service.create_playlist(
        name=playlist_name,
        description=playlist_description,
    )

    # Add found tracks
    await playlist_service.add_tracks_to_playlist(new_playlist_id, video_ids[:100])

    return {
        "status": "ok",
        "playlist_id": new_playlist_id,
        "tracks": video_ids,
        "playlist_name": playlist_name,
        "vibe_interpretation": ai_result.get("vibe_interpretation", ""),
        "ai_reasoning": ai_result.get("reasoning", ""),
        "ai_generated_name": ai_result["playlist_name"] if not payload.name else None,
        "found_tracks": len(video_ids),
        "requested_tracks": len(ai_result["tracks"]),
    }


# AI Settings
@router.get("/settings/ai")
async def get_ai_settings():
    async with AsyncSessionLocal() as session:
        keys = ["ai_base_url", "ai_api_key", "ai_model"]
        result = {}
        for k in keys:
            row = await session.get(Setting, k)
            val = row.value if row else ""
            result[k] = val
        # Mask API key
        if result.get("ai_api_key"):
            result["ai_api_key"] = "***"
        return result


@router.post("/settings/ai")
async def save_ai_settings(payload: AISettingsPayload):
    async with AsyncSessionLocal() as session:
        for key, value in payload.model_dump().items():
            row = await session.get(Setting, key)
            if row:
                row.value = value
            else:
                session.add(Setting(key=key, value=value))
        await session.commit()
    return {"status": "ok"}


@router.post("/playlists/musicmatch")
async def musicmatch_endpoint(payload: MusicMatchRequest):
    """
    Generate a playlist using either simple combination or AI-powered selection.
    """
    from ytmusicianship.services.ai_musicmatch import (
        generate_playlist_with_ai,
        search_tracks_on_ytmusic,
    )
    from ytmusicianship.services import playlist as playlist_service

    use_ai = payload.use_ai

    if use_ai:
        # Get playlist names for context
        playlist_names = []
        if payload.source_playlist_ids:
            all_playlists = await playlist.list_playlists(limit=5000)
            id_to_name = {p["playlist_id"]: p["title"] for p in all_playlists}
            playlist_names = [id_to_name.get(pid, "Unknown") for pid in payload.source_playlist_ids]

        # Generate AI recommendations
        try:
            ai_result = await generate_playlist_with_ai(
                source_playlists=playlist_names,
                source_artists=payload.source_artists or [],
                name=payload.name,
                description=payload.description,
                mode=payload.mode,
                selection_weight=payload.selection_weight,
            )
        except RuntimeError as e:
            error_msg = str(e)
            # Extract clean message from common API errors
            if "AI API error:" in error_msg:
                return {"status": "error", "message": f"AI service error: {error_msg.split(' - ', 1)[-1]}"}
            return {"status": "error", "message": f"AI generation failed: {error_msg}"}
        except Exception as e:
            return {"status": "error", "message": f"Unexpected error during AI generation: {str(e)}"}

        # Search for the tracks on YouTube Music
        video_ids = await search_tracks_on_ytmusic(ai_result["tracks"])

        if not video_ids:
            return {"status": "error", "message": "AI generated tracks but none were found on YouTube Music"}

        # Create the playlist with AI-generated or provided name
        playlist_name = payload.name or ai_result["playlist_name"]
        playlist_description = payload.description or ai_result["description"]

        new_playlist_id = await playlist_service.create_playlist(
            name=playlist_name,
            description=playlist_description,
        )

        # Add found tracks
        await playlist_service.add_tracks_to_playlist(new_playlist_id, video_ids[:100])

        return {
            "status": "ok",
            "playlist_id": new_playlist_id,
            "tracks": video_ids,
            "playlist_name": playlist_name,
            "ai_reasoning": ai_result.get("reasoning", ""),
            "ai_generated_name": ai_result["playlist_name"] if not payload.name else None,
            "vibe_detected": ai_result.get("vibe_detected", ""),
            "selection_breakdown": ai_result.get("selection_breakdown", {}),
            "found_tracks": len(video_ids),
            "requested_tracks": len(ai_result["tracks"]),
        }
    else:
        # Use simple combination mode (existing behavior)
        return await playlist.musicmatch(
            source_playlist_ids=payload.source_playlist_ids,
            source_artists=payload.source_artists,
            name=payload.name,
            description=payload.description,
            mode=payload.mode,
        )


@router.get("/library/artists")
async def get_liked_artists():
    """Get unique artists from liked songs."""
    liked = await library.get_liked_songs(limit=5000)
    # Extract unique artists
    artists_map: dict[str, int] = {}
    for track in liked:
        artist = track.get("artist", "Unknown")
        if artist and artist != "Unknown":
            artists_map[artist] = artists_map.get(artist, 0) + 1
    # Sort by frequency
    artists = [{"name": name, "count": count} for name, count in sorted(artists_map.items(), key=lambda x: -x[1])]
    return {"artists": artists}


@router.get("/musicmatch/taste-profile")
async def get_musicmatch_taste_profile():
    """Get user's taste profile for MusicMatch display."""
    from ytmusicianship.services.ai_musicmatch import get_taste_profile
    return await get_taste_profile()


# Rankings
@router.get("/rankings/songs")
async def top_songs(limit: int = Query(20)):
    return {"rankings": await ranking.get_top_songs(limit=limit)}


@router.get("/rankings/artists")
async def top_artists(limit: int = Query(20)):
    return {"rankings": await ranking.get_top_artists(limit=limit)}


@router.get("/rankings/genres")
async def top_genres(limit: int = Query(20)):
    return {"rankings": await ranking.get_top_genres(limit=limit)}


@router.get("/rankings/songs/{video_id}")
async def song_ranking(video_id: str):
    return {"ranking": await ranking.get_song_ranking(video_id)}


@router.post("/rankings/insights")
async def generate_rankings_insights():
    """Generate AI insights for top songs and artists."""
    from ytmusicianship.services.ai_musicmatch import get_ai_settings

    ai_config = await get_ai_settings()
    if not ai_config.get("ai_api_key") or not ai_config.get("ai_base_url"):
        return {"status": "error", "message": "AI not configured"}

    # Get top songs and artists
    top_songs = await ranking.get_top_songs(limit=20)
    top_artists = await ranking.get_top_artists(limit=20)

    if not top_songs and not top_artists:
        return {"status": "error", "message": "No rankings data available"}

    # Build the prompt for AI analysis
    songs_text = "\n".join([
        f"{i+1}. {s['entity_name']} - {s['play_count']} plays (Score: {round(s['score'])})"
        for i, s in enumerate(top_songs[:20])
    ])

    artists_text = "\n".join([
        f"{i+1}. {a['entity_name']} - {a['play_count']} plays (Score: {round(a['score'])})"
        for i, a in enumerate(top_artists[:20])
    ])

    prompt = f"""You are a music analytics AI that provides insightful, personalized analysis of listening habits.

TOP SONGS:
{songs_text}

TOP ARTISTS:
{artists_text}

Provide a concise, engaging analysis of this user's music taste. Include:

FOR TOP SONGS:
- What patterns do you see in their most-played tracks?
- Any notable genres, eras, or themes?
- What do these songs suggest about their listening habits?

FOR TOP ARTISTS:
- What does their artist preference reveal about their taste?
- Are they into mainstream hits, niche artists, or a mix?
- Any interesting patterns in the types of artists they favor?

Keep each section to 3-4 sentences max. Be conversational and friendly, not robotic.

RESPOND ONLY with a JSON object in this exact format:
{{
  "top_songs_insight": "string with your analysis of their top songs",
  "top_artists_insight": "string with your analysis of their top artists",
  "overall_vibe": "One sentence summary of their overall music taste"
}}"""

    import httpx

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
                    {"role": "system", "content": "You are a music analytics expert. Respond only with valid JSON."},
                    {"role": "user", "content": prompt}
                ],
                "temperature": 0.8,
                "max_tokens": 1500,
            }
        )

        if response.status_code != 200:
            return {"status": "error", "message": f"AI API error: {response.status_code}"}

        data = response.json()
        content = data["choices"][0]["message"]["content"]

        # Parse JSON response (handle markdown code blocks)
        json_str = content
        if "```json" in content:
            json_str = content.split("```json")[1].split("```")[0]
        elif "```" in content:
            json_str = content.split("```")[1].split("```")[0]

        try:
            result = json.loads(json_str.strip())
        except json.JSONDecodeError:
            # Fallback: try to parse the raw content
            try:
                result = json.loads(content.strip())
            except json.JSONDecodeError:
                # If still failing, return a generic insight
                return {
                    "status": "ok",
                    "top_songs_insight": "Your top songs show a diverse mix of tracks you've been enjoying lately.",
                    "top_artists_insight": f"Your listening is led by {top_artists[0]['entity_name'] if top_artists else 'various artists'}, showing strong preferences in your music taste.",
                    "overall_vibe": "A varied musical palette with some clear favorites.",
                }

        insights = {
            "top_songs_insight": result.get("top_songs_insight", ""),
            "top_artists_insight": result.get("top_artists_insight", ""),
            "overall_vibe": result.get("overall_vibe", ""),
        }

        # Save insights to database
        async with AsyncSessionLocal() as session:
            row = await session.get(Setting, "rankings_insights")
            insights_json = json.dumps(insights)
            if row:
                row.value = insights_json
            else:
                session.add(Setting(key="rankings_insights", value=insights_json))
            await session.commit()

        return {
            "status": "ok",
            **insights,
        }


@router.get("/rankings/insights")
async def get_rankings_insights():
    """Get saved AI insights for rankings."""
    async with AsyncSessionLocal() as session:
        row = await session.get(Setting, "rankings_insights")
        if row and row.value:
            return {"status": "ok", **json.loads(row.value)}
        return {"status": "error", "message": "No insights available"}


# Jobs
@router.get("/jobs")
async def list_jobs():
    return {"jobs": await jobs.list_jobs()}


@router.post("/jobs")
async def create_job(payload: CreateJobRequest):
    job = await jobs.create_job(
        name=payload.name,
        action=payload.action,
        cron=payload.cron,
        target_playlist_id=payload.target_playlist_id,
        config_json=payload.config_json,
    )
    return {"job": job}


@router.delete("/jobs/{job_id}")
async def delete_job(job_id: str):
    return await jobs.delete_job(job_id)


@router.delete("/auth")
async def delete_auth():
    """Delete oauth.json to sign out and allow re-authentication with a different account."""
    import os
    try:
        if settings.ytm_oauth_path.exists():
            os.remove(settings.ytm_oauth_path)
            yt_client.invalidate()
            return {"status": "ok", "message": "Authentication deleted. Please re-authenticate."}
        return {"status": "ok", "message": "No authentication file found."}
    except Exception as e:
        return {"status": "error", "message": str(e)}
