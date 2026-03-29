import asyncio
from functools import partial
from pathlib import Path
from typing import Optional

from ytmusicapi import YTMusic

from ytmusicianship.config import settings


class YTClient:
    def __init__(self):
        self._yt: Optional[YTMusic] = None

    def is_authenticated(self) -> bool:
        return Path(settings.ytm_oauth_path).exists()

    def _get_yt(self) -> YTMusic:
        if self._yt is None:
            if not self.is_authenticated():
                raise RuntimeError("Not authenticated: oauth.json missing")
            # Check if file is browser headers format (raw text) or OAuth format (JSON)
            import json
            content = Path(settings.ytm_oauth_path).read_text()
            # Try to parse as JSON first
            try:
                auth_data = json.loads(content)
                # If it's a dict with oauth token fields, it's OAuth format
                if isinstance(auth_data, dict) and ("access_token" in auth_data or "refresh_token" in auth_data):
                    # OAuth auth - pass file path and load credentials separately
                    from ytmusicapi.auth.oauth import OAuthCredentials
                    creds_path = settings.ytm_oauth_path.parent / "oauth_creds.json"
                    if creds_path.exists():
                        with open(creds_path) as f:
                            creds_data = json.load(f)
                        oauth_creds_obj = OAuthCredentials(
                            client_id=creds_data.get("client_id", ""),
                            client_secret=creds_data.get("client_secret", "")
                        )
                    else:
                        oauth_creds_obj = None
                    self._yt = YTMusic(
                        str(settings.ytm_oauth_path),
                        oauth_credentials=oauth_creds_obj
                    )
                else:
                    # JSON with headers - pass as auth dict
                    self._yt = YTMusic(auth=auth_data)
            except json.JSONDecodeError:
                # Not valid JSON - assume it's raw headers text for browser auth
                # Pass the file path and let ytmusicapi parse the headers
                self._yt = YTMusic(str(settings.ytm_oauth_path))
        return self._yt

    def invalidate(self):
        self._yt = None

    async def get_library_playlists(self, limit: int = 25):
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, partial(self._get_yt().get_library_playlists, limit))

    async def get_playlist(self, playlist_id: str, limit: int = 5000):
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, partial(self._get_yt().get_playlist, playlistId=playlist_id, limit=limit))

    async def create_playlist(self, title: str, description: str = "", video_ids: Optional[list] = None, source_playlist: Optional[str] = None):
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(
            None,
            partial(self._get_yt().create_playlist, title=title, description=description, video_ids=video_ids, source_playlist=source_playlist)
        )

    async def delete_playlist(self, playlist_id: str):
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, partial(self._get_yt().delete_playlist, playlist_id))

    async def add_playlist_items(self, playlist_id: str, video_ids: list):
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, partial(self._get_yt().add_playlist_items, playlistId=playlist_id, videoIds=video_ids))

    async def remove_playlist_items(self, playlist_id: str, videos: list):
        """videos should be a list of dicts with setVideoId and videoId keys."""
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, partial(self._get_yt().remove_playlist_items, playlistId=playlist_id, videos=videos))

    async def get_liked_songs(self, limit: int = 5000):
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, partial(self._get_yt().get_liked_songs, limit))

    async def get_history(self):
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, self._get_yt().get_history)

    async def search(self, query: str, filter: str = "songs", limit: int = 20):
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, partial(self._get_yt().search, query=query, filter=filter, limit=limit))

    async def get_library_upload_songs(self, limit: int = 25):
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, partial(self._get_yt().get_library_upload_songs, limit))


yt_client = YTClient()
