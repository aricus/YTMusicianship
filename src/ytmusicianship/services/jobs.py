from sqlalchemy import select, delete
from ytmusicianship.db import AsyncSessionLocal, ScheduledJob
from ytmusicianship.scheduler import scheduler


def _parse_cron(cron: str) -> dict:
    """Parse a standard 5-field cron string into APScheduler cron kwargs."""
    parts = cron.split()
    if len(parts) != 5:
        raise ValueError("Cron string must have exactly 5 fields: minute hour day month day_of_week")
    return {
        "minute": parts[0],
        "hour": parts[1],
        "day": parts[2],
        "month": parts[3],
        "day_of_week": parts[4],
    }


async def list_jobs() -> list:
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(ScheduledJob).order_by(ScheduledJob.created_at))
        return [_job_to_dict(j) for j in result.scalars().all()]


async def create_job(name: str, action: str, cron: str, target_playlist_id: str | None = None, config_json: str | None = None) -> dict:
    import uuid
    job_id = str(uuid.uuid4())

    # Register in APScheduler
    cron_kwargs = _parse_cron(cron)
    if action == "shuffle":
        from ytmusicianship.services.playlist import true_shuffle_playlist
        scheduler.add_job(
            func=true_shuffle_playlist,
            trigger="cron",
            id=job_id,
            args=[target_playlist_id],
            kwargs={},
            replace_existing=True,
            **cron_kwargs,
        )
    elif action == "sync_history":
        from ytmusicianship.services.ranking import sync_history, compute_rankings
        def _sync_and_rank():
            import asyncio
            asyncio.run(sync_history())
            asyncio.run(compute_rankings())
        scheduler.add_job(
            func=_sync_and_rank,
            trigger="cron",
            id=job_id,
            replace_existing=True,
            **cron_kwargs,
        )
    elif action == "generate_discovery":
        from ytmusicianship.services.ai_musicmatch import generate_discovery_playlist, search_tracks_on_ytmusic
        from ytmusicianship.services import playlist as playlist_service

        async def _generate_discovery():
            """Generate discovery playlist based on user taste."""
            try:
                # Parse config if provided
                import json
                config = json.loads(config_json) if config_json else {}
                playlist_name = config.get("playlist_name")
                description = config.get("description", "Your weekly discovery mix")
                track_count = config.get("track_count", 100)

                # Generate AI recommendations
                ai_result = await generate_discovery_playlist(
                    name=playlist_name,
                    description=description,
                    track_count=track_count,
                )

                # Search for tracks on YouTube Music
                video_ids = await search_tracks_on_ytmusic(ai_result["tracks"])

                if not video_ids:
                    print(f"[Discovery Job {job_id}] No tracks found on YouTube Music")
                    return

                # Create the playlist
                final_name = ai_result["playlist_name"]
                new_playlist_id = await playlist_service.create_playlist(
                    name=final_name,
                    description=ai_result["description"],
                )

                # Add found tracks
                await playlist_service.add_tracks_to_playlist(new_playlist_id, video_ids[:track_count])

                print(f"[Discovery Job {job_id}] Created playlist '{final_name}' with {len(video_ids)} tracks")

            except Exception as e:
                print(f"[Discovery Job {job_id}] Error: {e}")

        def _run_discovery_job():
            import asyncio
            asyncio.run(_generate_discovery())

        scheduler.add_job(
            func=_run_discovery_job,
            trigger="cron",
            id=job_id,
            replace_existing=True,
            **cron_kwargs,
        )
    else:
        raise ValueError(f"Unknown action: {action}")

    async with AsyncSessionLocal() as session:
        job = ScheduledJob(
            id=job_id,
            name=name,
            action=action,
            target_playlist_id=target_playlist_id,
            cron=cron,
            config_json=config_json or "{}",
        )
        session.add(job)
        await session.commit()
        return _job_to_dict(job)


async def delete_job(job_id: str) -> dict:
    try:
        scheduler.remove_job(job_id)
    except Exception:
        pass
    async with AsyncSessionLocal() as session:
        await session.execute(delete(ScheduledJob).where(ScheduledJob.id == job_id))
        await session.commit()
        return {"status": "ok", "deleted": job_id}


def _job_to_dict(job: ScheduledJob) -> dict:
    aps_job = scheduler.get_job(job.id)
    next_run = aps_job.next_run_time.isoformat() if aps_job and aps_job.next_run_time else None
    return {
        "id": job.id,
        "name": job.name,
        "action": job.action,
        "target_playlist_id": job.target_playlist_id,
        "cron": job.cron,
        "next_run": next_run,
        "created_at": job.created_at.isoformat() if job.created_at else None,
    }
