from typing import Optional
from fastapi import APIRouter, UploadFile, File, Query
from pydantic import BaseModel, Field
from pathlib import Path

from ytmusicianship.config import settings
from ytmusicianship.yt_client import yt_client
from ytmusicianship.services import library, playlist, ranking, jobs
from ytmusicianship.db import AsyncSessionLocal, Setting

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
    action: str = Field(..., pattern="^(shuffle|sync_history)$")
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
    source_playlist_id: str
    name: str
    description: str = ""
    mode: str = Field(default="auto", pattern="^(exact|search|auto)$")


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
async def get_playlist_tracks(playlist_id: str, limit: int = Query(0)):
    return {"tracks": await playlist.get_playlist_tracks(playlist_id, limit=limit)}


@router.post("/playlists/{playlist_id}/shuffle")
async def shuffle_playlist(playlist_id: str, payload: Optional[ShuffleRequest] = None):
    target_name = payload.target_name if payload else None
    return await playlist.true_shuffle_playlist(playlist_id, target_name=target_name)


@router.post("/playlists/{playlist_id}/tracks")
async def add_tracks(playlist_id: str, payload: dict):
    video_ids = payload.get("video_ids", [])
    return await playlist.add_tracks_to_playlist(playlist_id, video_ids)


@router.delete("/playlists/{playlist_id}/tracks")
async def remove_tracks(playlist_id: str, payload: dict):
    video_ids = payload.get("video_ids", [])
    return await playlist.remove_tracks_from_playlist(playlist_id, video_ids)


@router.post("/playlists/generate")
async def generate_playlist(payload: GeneratePlaylistRequest):
    pl_id = await playlist.generate_playlist(name=payload.name, track_ids=payload.track_ids, description=payload.description)
    return {"playlist_id": pl_id}


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
    return await playlist.musicmatch(
        source_playlist_id=payload.source_playlist_id,
        name=payload.name,
        description=payload.description,
        mode=payload.mode,
    )


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
