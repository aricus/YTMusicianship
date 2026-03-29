import datetime
from pathlib import Path
from sqlalchemy import Float, String, DateTime, Integer, func
from sqlalchemy.ext.asyncio import AsyncAttrs, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column

from ytmusicianship.config import settings


class Base(AsyncAttrs, DeclarativeBase):
    pass


class PlayEvent(Base):
    __tablename__ = "play_events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    video_id: Mapped[str] = mapped_column(String, index=True)
    title: Mapped[str] = mapped_column(String, nullable=True)
    artist: Mapped[str] = mapped_column(String, nullable=True)
    album: Mapped[str] = mapped_column(String, nullable=True)
    genre: Mapped[str] = mapped_column(String, nullable=True, index=True)
    played_at: Mapped[datetime.datetime] = mapped_column(DateTime, default=func.now(), index=True)


class Ranking(Base):
    __tablename__ = "rankings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    entity_type: Mapped[str] = mapped_column(String, index=True)  # song, artist, genre
    entity_id: Mapped[str] = mapped_column(String, nullable=True)  # video_id for songs
    entity_name: Mapped[str] = mapped_column(String, index=True)
    score: Mapped[float] = mapped_column(Float, default=0.0)
    liked: Mapped[bool] = mapped_column(Integer, default=0)  # 0 or 1
    play_count: Mapped[int] = mapped_column(Integer, default=0)
    last_computed: Mapped[datetime.datetime] = mapped_column(DateTime, default=func.now())


class ScheduledJob(Base):
    __tablename__ = "scheduled_jobs"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    name: Mapped[str] = mapped_column(String)
    action: Mapped[str] = mapped_column(String)  # shuffle, generate
    target_playlist_id: Mapped[str] = mapped_column(String, nullable=True)
    cron: Mapped[str] = mapped_column(String)
    config_json: Mapped[str] = mapped_column(String, nullable=True)
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, default=func.now())


def get_engine():
    db_path = settings.ytm_db_path
    db_path.parent.mkdir(parents=True, exist_ok=True)
    return create_async_engine(f"sqlite+aiosqlite:///{db_path}", echo=False)


engine = get_engine()
AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False)


async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
