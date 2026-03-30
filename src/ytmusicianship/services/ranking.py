import datetime
import math
from typing import Optional
from sqlalchemy import select, desc, func, delete
from ytmusicianship.db import AsyncSessionLocal, PlayEvent, Ranking
from ytmusicianship.services.library import get_history, get_liked_songs
from ytmusicianship.yt_client import yt_client


async def sync_history(limit: Optional[int] = None) -> dict:
    """Fetch latest history and persist play events, avoiding duplicates."""
    history = await get_history()
    if limit:
        history = history[:limit]

    async with AsyncSessionLocal() as session:
        # Get existing video_ids to avoid duplicates
        result = await session.execute(select(PlayEvent.video_id))
        existing_ids = {row[0] for row in result.all()}

        added = 0
        skipped = 0
        now = datetime.datetime.utcnow()
        # Spread songs over time for more realistic recency scoring
        # Assume 200 songs span ~14 days (adjust based on history length)
        total_days = 14
        hours_per_song = (total_days * 24) / max(len(history), 1)

        for idx, track in enumerate(history):
            video_id = track.get("video_id")
            if not video_id:
                continue
            # Skip if already in database
            if video_id in existing_ids:
                skipped += 1
                continue
            # Spread songs across time for varied recency scores
            played_at = now - datetime.timedelta(hours=idx * hours_per_song)
            event = PlayEvent(
                video_id=video_id,
                title=track.get("title"),
                artist=track.get("artist"),
                album=track.get("album"),
                genre=None,
                played_at=played_at,
            )
            session.add(event)
            existing_ids.add(video_id)  # Add to set to prevent duplicates within this batch
            added += 1

        await session.commit()
        return {"synced": added, "skipped": skipped, "total_history_fetched": len(history)}


async def compute_rankings() -> dict:
    """Recompute song, artist, and genre rankings from stored play events and likes."""
    async with AsyncSessionLocal() as session:
        # Clear old rankings
        await session.execute(delete(Ranking))
        await session.commit()

        # Fetch all play events
        result = await session.execute(select(PlayEvent))
        events = result.scalars().all()

        # Fetch liked songs for boost
        liked = await get_liked_songs(limit=5000)
        liked_ids = {t["video_id"] for t in liked if t.get("video_id")}

        # Aggregate by song with recency weighting
        now = datetime.datetime.utcnow()
        song_scores: dict[str, dict] = {}
        artist_scores: dict[str, float] = {}
        for ev in events:
            days_ago = max(0, (now - ev.played_at).days)
            weight = math.exp(-days_ago / 30.0)  # half-life ~30 days
            vid = ev.video_id
            if vid not in song_scores:
                song_scores[vid] = {
                    "title": ev.title or "Unknown",
                    "artist": ev.artist or "Unknown",
                    "score": 0.0,
                    "plays": 0,
                }
            song_scores[vid]["score"] += weight
            song_scores[vid]["plays"] += 1

            artist = ev.artist or "Unknown"
            artist_scores[artist] = artist_scores.get(artist, 0.0) + weight

        # Apply likes boost
        for vid in liked_ids:
            if vid in song_scores:
                song_scores[vid]["score"] += 5.0
            else:
                song_scores[vid] = {
                    "title": "Liked Song",
                    "artist": "Unknown",
                    "score": 5.0,
                    "plays": 0,
                }

        # Also boost artists of liked songs
        for track in liked:
            artist = track.get("artist", "Unknown")
            artist_scores[artist] = artist_scores.get(artist, 0.0) + 1.0

        # Write song rankings
        for vid, data in song_scores.items():
            session.add(Ranking(
                entity_type="song",
                entity_id=vid,
                entity_name=f"{data['title']} — {data['artist']}",
                score=round(data["score"], 2),
                play_count=data["plays"],
                liked=1 if vid in liked_ids else 0,
            ))

        # Write artist rankings
        for artist, score in artist_scores.items():
            session.add(Ranking(
                entity_type="artist",
                entity_name=artist,
                score=round(score, 2),
                play_count=int(score),
            ))

        await session.commit()

        # Count written
        song_count = await session.execute(select(func.count(Ranking.id)).where(Ranking.entity_type == "song"))
        artist_count = await session.execute(select(func.count(Ranking.id)).where(Ranking.entity_type == "artist"))
        return {
            "songs_ranked": song_count.scalar(),
            "artists_ranked": artist_count.scalar(),
        }


async def get_top_songs(limit: int = 20) -> list:
    async with AsyncSessionLocal() as session:
        stmt = (
            select(Ranking)
            .where(Ranking.entity_type == "song")
            .order_by(desc(Ranking.score))
            .limit(limit)
        )
        result = await session.execute(stmt)
        return [_ranking_to_dict(r) for r in result.scalars().all()]


async def get_top_artists(limit: int = 20) -> list:
    async with AsyncSessionLocal() as session:
        stmt = (
            select(Ranking)
            .where(Ranking.entity_type == "artist")
            .order_by(desc(Ranking.score))
            .limit(limit)
        )
        result = await session.execute(stmt)
        return [_ranking_to_dict(r) for r in result.scalars().all()]


async def get_top_genres(limit: int = 20) -> list:
    # ytmusicapi doesn't expose genre reliably; return empty for now
    return []


async def get_song_ranking(video_id: str) -> Optional[dict]:
    async with AsyncSessionLocal() as session:
        stmt = select(Ranking).where(Ranking.entity_type == "song", Ranking.entity_id == video_id)
        result = await session.execute(stmt)
        row = result.scalar_one_or_none()
        return _ranking_to_dict(row) if row else None


def _ranking_to_dict(r: Ranking) -> dict:
    return {
        "entity_type": r.entity_type,
        "entity_id": r.entity_id,
        "entity_name": r.entity_name,
        "score": r.score,
        "play_count": r.play_count,
        "liked": bool(r.liked),
        "last_computed": r.last_computed.isoformat() if r.last_computed else None,
    }
