# MusicMatch + Native AI Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add MusicMatch (playlist-from-playlist AI inspiration) and native OpenAI-compatible AI settings to YTMusicianship.

**Architecture:** A new `services/ai.py` module handles all LLM communication with configurable base URL, key, and model. `services/playlist.py` gets a `musicmatch()` orchestrator that fetches a source playlist, prompts the AI, resolves suggestions via YT Music search, and creates the new playlist. The web GUI gains an AI Settings page and a MusicMatch card on the Dashboard.

**Tech Stack:** Python 3.12, FastAPI, SQLAlchemy, SQLite, OpenAI-compatible HTTP client (`httpx`), React + Vite + Tailwind

---

## Files Overview

| File | Responsibility |
|------|----------------|
| `src/ytmusicianship/db.py` | Add `Setting` SQLAlchemy model |
| `src/ytmusicianship/services/ai.py` | OpenAI-compatible client, prompt builder, JSON parser |
| `src/ytmusicianship/services/playlist.py` | Add `musicmatch()` function |
| `src/ytmusicianship/api/routes.py` | Add `/settings/ai` and `/playlists/musicmatch` endpoints |
| `src/ytmusicianship/mcp_server.py` | Expose `musicmatch` MCP tool |
| `tests/test_musicmatch.py` | Unit tests for AI response parsing and suggestion resolution |
| `web/src/api.ts` | Add `getAiSettings`, `saveAiSettings`, `musicmatch` wrappers |
| `web/src/App.tsx` | Add AI Settings nav link and route |
| `web/src/pages/AiSettings.tsx` | New page for base URL, token, model inputs |
| `web/src/pages/Dashboard.tsx` | Add MusicMatch card with playlist selector, prompt, mode toggle |

---

### Task 1: Database — Add `Setting` model

**Files:**
- Modify: `src/ytmusicianship/db.py`
- Test: `tests/test_db.py` (create if missing)

- [ ] **Step 1: Write the `Setting` model**

Append to `src/ytmusicianship/db.py`:

```python
class Setting(Base):
    __tablename__ = "settings"

    key: Mapped[str] = mapped_column(String, primary_key=True)
    value: Mapped[str] = mapped_column(String, nullable=True)
    updated_at: Mapped[datetime.datetime] = mapped_column(DateTime, default=func.now(), onupdate=func.now())
```

- [ ] **Step 2: Write failing test**

Create `tests/test_db.py`:

```python
import pytest
from ytmusicianship.db import init_db, AsyncSessionLocal, Setting

@pytest.mark.asyncio
async def test_setting_crud():
    await init_db()
    async with AsyncSessionLocal() as session:
        session.add(Setting(key="ai_model", value="gpt-4o"))
        await session.commit()

        result = await session.get(Setting, "ai_model")
        assert result is not None
        assert result.value == "gpt-4o"
```

- [ ] **Step 3: Run test to verify it fails**

```bash
cd /home/rob/YTMusicianship
source venv/bin/activate
pytest tests/test_db.py::test_setting_crud -v
```

Expected: FAIL because `tests/` may not be on PYTHONPATH or table missing.

- [ ] **Step 4: Fix import path and rerun**

Ensure tests can import. If needed, run:

```bash
PYTHONPATH=src pytest tests/test_db.py::test_setting_crud -v
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/ytmusicianship/db.py tests/test_db.py
git commit -m "feat: add Setting model for AI config storage

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 2: AI Service — Client, Prompt Builder, Parser

**Files:**
- Create: `src/ytmusicianship/services/ai.py`
- Create: `tests/test_ai.py`

- [ ] **Step 1: Write the failing test for `build_musicmatch_prompt`**

Create `tests/test_ai.py`:

```python
import pytest
from ytmusicianship.services.ai import build_musicmatch_prompt, parse_suggestions

def test_build_prompt_includes_tracks():
    tracks = [{"title": "Song A", "artist": "Artist X"}]
    prompt = build_musicmatch_prompt(tracks, name="Inspired", mode="auto")
    assert "Song A" in prompt
    assert "Artist X" in prompt
    assert "auto" in prompt

def test_parse_suggestions_valid_json():
    raw = '{"suggestions": [{"type": "exact", "value": "Bohemian Rhapsody - Queen"}]}'
    result = parse_suggestions(raw)
    assert result == [{"type": "exact", "value": "Bohemian Rhapsody - Queen"}]

def test_parse_suggestions_fenced_json():
    raw = '```json\n{"suggestions": [{"type": "search", "value": "upbeat funk"}]}\n```'
    result = parse_suggestions(raw)
    assert result == [{"type": "search", "value": "upbeat funk"}]
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
PYTHONPATH=src pytest tests/test_ai.py -v
```

Expected: FAIL (functions not defined)

- [ ] **Step 3: Implement `ai.py`**

Create `src/ytmusicianship/services/ai.py`:

```python
import json
import re
from typing import Optional
import httpx

from ytmusicianship.db import AsyncSessionLocal, Setting


async def get_ai_config() -> dict:
    async with AsyncSessionLocal() as session:
        keys = ["ai_base_url", "ai_api_key", "ai_model"]
        result = {}
        for k in keys:
            row = await session.get(Setting, k)
            result[k] = row.value if row else ""
        return result


async def chat_completion(system_prompt: str, user_prompt: str) -> str:
    cfg = await get_ai_config()
    base_url = (cfg.get("ai_base_url") or "https://api.openai.com/v1").rstrip("/")
    api_key = cfg.get("ai_api_key") or ""
    model = cfg.get("ai_model") or "gpt-4o"

    if not api_key:
        raise RuntimeError("AI not configured. Go to AI Settings.")

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        "temperature": 0.8,
    }

    async with httpx.AsyncClient(timeout=120.0) as client:
        r = await client.post(f"{base_url}/chat/completions", headers=headers, json=payload)
        r.raise_for_status()
        data = r.json()
        return data["choices"][0]["message"]["content"]


SYSTEM_PROMPT = """You are a music recommendation engine. The user wants a new playlist inspired by an existing playlist.
Your job is to suggest 20-30 tracks that match the vibe, energy, and diversity of the source tracks.

RULES:
- Do NOT limit yourself to a single genre unless the user explicitly asks for it.
- If the source playlist has musicals, rap, classic rock, and indie funk, your suggestions should also span multiple genres.
- Return ONLY valid JSON in this exact shape:
{"suggestions": [{"type": "exact", "value": "Song Title - Artist Name"}, {"type": "search", "value": "upbeat synthwave instrumentals"}]}
- type "exact" means you know the specific song. type "search" means a query that should be run on YouTube Music.
- When mode is "auto", choose the best type per suggestion. When mode is "exact", use only "exact". When mode is "search", use only "search".
"""


def build_musicmatch_prompt(tracks: list[dict], name: str, description: str, mode: str) -> str:
    track_lines = "\n".join(f"- {t.get('title', 'Unknown')} - {t.get('artist', 'Unknown')}" for t in tracks[:50])
    return (
        f"Create a new playlist called '{name}'.\n"
        f"Description: {description}\n"
        f"Mode: {mode}\n"
        f"Source tracks:\n{track_lines}\n\n"
        f"Suggest 20-30 tracks. Return JSON only."
    )


def parse_suggestions(raw: str) -> list[dict]:
    # Strip markdown fences
    cleaned = re.sub(r"^```(?:json)?\s*|\s*```$", "", raw.strip(), flags=re.MULTILINE)
    data = json.loads(cleaned)
    return data.get("suggestions", [])
```

- [ ] **Step 4: Install `httpx` in virtual env**

```bash
source venv/bin/activate
pip install httpx -q
```

Add `httpx>=0.27.0` to `pyproject.toml` under `dependencies` if missing.

- [ ] **Step 5: Run tests**

```bash
PYTHONPATH=src pytest tests/test_ai.py -v
```

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/ytmusicianship/services/ai.py tests/test_ai.py pyproject.toml
git commit -m "feat: add AI service with prompt builder and parser

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 3: AI Service — Suggestion Resolution

**Files:**
- Modify: `src/ytmusicianship/services/ai.py`
- Modify: `tests/test_ai.py`

- [ ] **Step 1: Write failing test for `_resolve_suggestions`**

Add to `tests/test_ai.py`:

```python
from unittest.mock import AsyncMock, patch

@pytest.mark.asyncio
async def test_resolve_suggestions_exact_and_search():
    mock_results = [
        [{"videoId": "vid1", "title": "Result 1"}],
        [{"videoId": "vid2", "title": "Result 2"}, {"videoId": "vid3", "title": "Result 3"}],
    ]
    from ytmusicianship.services import ai
    with patch.object(ai.yt_client, "search", side_effect=mock_results):
        suggestions = [
            {"type": "exact", "value": "Song A - Artist X"},
            {"type": "search", "value": "funky bass"},
        ]
        tracks, warnings = await ai.resolve_suggestions(suggestions)
        assert len(tracks) == 3
        assert any(t["video_id"] == "vid1" for t in tracks)
        assert any(t["video_id"] == "vid2" for t in tracks)
```

- [ ] **Step 2: Run test to verify it fails**

```bash
PYTHONPATH=src pytest tests/test_ai.py::test_resolve_suggestions_exact_and_search -v
```

Expected: FAIL (resolve_suggestions undefined)

- [ ] **Step 3: Implement `resolve_suggestions`**

Add to `src/ytmusicianship/services/ai.py`:

```python
from ytmusicianship.yt_client import yt_client


async def resolve_suggestions(suggestions: list[dict]) -> tuple[list[dict], list[str]]:
    tracks: list[dict] = []
    seen: set[str] = set()
    warnings: list[str] = []

    for s in suggestions:
        stype = s.get("type", "exact")
        value = s.get("value", "")
        if not value:
            continue

        try:
            results = await yt_client.search(query=value, filter="songs", limit=5 if stype == "search" else 1)
        except Exception as e:
            warnings.append(f"Search failed for '{value}': {e}")
            continue

        if not results:
            warnings.append(f"No results for '{value}'")
            continue

        picks = results[:3] if stype == "search" else results[:1]
        for r in picks:
            vid = r.get("videoId")
            if vid and vid not in seen:
                seen.add(vid)
                tracks.append({
                    "video_id": vid,
                    "title": r.get("title", "Unknown"),
                    "artist": _first_artist_name(r),
                })

    return tracks, warnings


def _first_artist_name(result: dict) -> str:
    artists = result.get("artists", [])
    return artists[0].get("name", "Unknown") if artists else "Unknown"
```

- [ ] **Step 4: Run tests**

```bash
PYTHONPATH=src pytest tests/test_ai.py -v
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/ytmusicianship/services/ai.py tests/test_ai.py
git commit -m "feat: add suggestion resolution for MusicMatch

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 4: Playlist Service — MusicMatch Orchestrator

**Files:**
- Modify: `src/ytmusicianship/services/playlist.py`
- Modify: `tests/test_playlist.py` (create if missing)

- [ ] **Step 1: Write failing test for `musicmatch`**

Create `tests/test_playlist.py`:

```python
import pytest
from unittest.mock import patch, AsyncMock

@pytest.mark.asyncio
async def test_musicmatch_creates_playlist():
    mock_tracks = [{"videoId": "v1", "title": "T1", "artists": [{"name": "A1"}]}]
    with patch("ytmusicianship.services.playlist.yt_client.get_playlist", return_value={
        "tracks": [{"videoId": "src1", "title": "Src", "artists": [{"name": "Art"}]}]
    }):
        with patch("ytmusicianship.services.playlist.ai.chat_completion", return_value='{"suggestions": [{"type": "exact", "value": "T1 - A1"}]}'):
            with patch("ytmusicianship.services.playlist.ai.resolve_suggestions", return_value=([
                {"video_id": "v1", "title": "T1", "artist": "A1"}
            ], [])):
                with patch("ytmusicianship.services.playlist.yt_client.create_playlist", return_value="pl_new"):
                    from ytmusicianship.services.playlist import musicmatch
                    result = await musicmatch(
                        source_playlist_id="pl_old",
                        name="Inspired",
                        description="Test",
                        mode="auto",
                    )
                    assert result["playlist_id"] == "pl_new"
                    assert len(result["tracks"]) == 1
```

- [ ] **Step 2: Run test to verify it fails**

```bash
PYTHONPATH=src pytest tests/test_playlist.py::test_musicmatch_creates_playlist -v
```

Expected: FAIL (musicmatch undefined or import error)

- [ ] **Step 3: Implement `musicmatch` in playlist.py**

Add to `src/ytmusicianship/services/playlist.py` (top of file):

```python
from ytmusicianship.services import ai
```

Add function before `_first_artist_name`:

```python
async def musicmatch(source_playlist_id: str, name: str, description: str = "", mode: str = "auto") -> dict:
    """
    Generate a new playlist inspired by an existing playlist using AI.
    mode: 'exact' | 'search' | 'auto'
    """
    if mode not in ("exact", "search", "auto"):
        raise ValueError("mode must be one of: exact, search, auto")

    source = await yt_client.get_playlist(source_playlist_id, limit=0)
    source_tracks = source.get("tracks", [])
    if not source_tracks:
        return {"status": "error", "message": "Source playlist is empty"}

    track_summaries = [
        {"title": t.get("title", "Unknown"), "artist": _first_artist_name(t)}
        for t in source_tracks[:50]
    ]

    system = ai.SYSTEM_PROMPT
    user = ai.build_musicmatch_prompt(track_summaries, name, description, mode)
    raw_response = await ai.chat_completion(system, user)

    try:
        suggestions = ai.parse_suggestions(raw_response)
    except Exception as e:
        return {
            "status": "error",
            "message": f"Failed to parse AI response: {e}",
            "raw_response": raw_response,
        }

    resolved_tracks, warnings = await ai.resolve_suggestions(suggestions)
    if not resolved_tracks:
        return {"status": "error", "message": "No tracks could be resolved", "warnings": warnings}

    video_ids = [t["video_id"] for t in resolved_tracks]
    playlist_id = await yt_client.create_playlist(title=name, description=description, video_ids=video_ids)

    return {
        "status": "ok",
        "playlist_id": playlist_id,
        "tracks": resolved_tracks,
        "warnings": warnings,
    }
```

- [ ] **Step 4: Run tests**

```bash
PYTHONPATH=src pytest tests/test_playlist.py -v
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/ytmusicianship/services/playlist.py tests/test_playlist.py
git commit -m "feat: add musicmatch orchestrator to playlist service

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 5: REST API — AI Settings and MusicMatch Endpoints

**Files:**
- Modify: `src/ytmusicianship/api/routes.py`

- [ ] **Step 1: Add Pydantic models and settings helpers**

Add to `src/ytmusicianship/api/routes.py` after existing models:

```python
class AISettingsPayload(BaseModel):
    ai_base_url: str = ""
    ai_api_key: str = ""
    ai_model: str = ""


class MusicMatchRequest(BaseModel):
    source_playlist_id: str
    name: str
    description: str = ""
    mode: str = Field(default="auto", pattern="^(exact|search|auto)$")
```

Add imports if missing:

```python
from ytmusicianship.db import AsyncSessionLocal, Setting
```

- [ ] **Step 2: Add routes**

Append to `src/ytmusicianship/api/routes.py` before the `# Rankings` section:

```python
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
```

- [ ] **Step 3: Run FastAPI smoke test**

```bash
source venv/bin/activate
cd /home/rob/YTMusicianship
python -c "from ytmusicianship.api.main import app; from fastapi.testclient import TestClient; c = TestClient(app); print(c.get('/api/settings/ai').json())"
```

Expected: `{'ai_base_url': '', 'ai_api_key': '', 'ai_model': ''}`

- [ ] **Step 4: Commit**

```bash
git add src/ytmusicianship/api/routes.py
git commit -m "feat: add AI settings and musicmatch REST endpoints

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 6: MCP Server — Expose `musicmatch` Tool

**Files:**
- Modify: `src/ytmusicianship/mcp_server.py`

- [ ] **Step 1: Add MCP tool**

Add after the `generate_playlist` tool in `src/ytmusicianship/mcp_server.py`:

```python
@mcp.tool()
async def musicmatch(
    source_playlist_id: str,
    name: str,
    description: str = "",
    mode: str = "auto",
) -> dict:
    """
    Generate a new playlist inspired by an existing playlist using AI.
    Modes: exact (specific songs), search (creative queries), auto (intelligent mix).
    """
    return await playlist.musicmatch(
        source_playlist_id=source_playlist_id,
        name=name,
        description=description,
        mode=mode,
    )
```

- [ ] **Step 2: Run import smoke test**

```bash
source venv/bin/activate
python -c "from ytmusicianship.mcp_server import mcp; print('MCP tools:', [t for t in dir(mcp) if not t.startswith('_')])"
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/ytmusicianship/mcp_server.py
git commit -m "feat: expose musicmatch tool via MCP server

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 7: Web Frontend — API Wrappers

**Files:**
- Modify: `web/src/api.ts`

- [ ] **Step 1: Add new API wrappers**

Append inside the `api` object in `web/src/api.ts`:

```typescript
  getAiSettings: () => fetchJson(`${API_BASE}/settings/ai`),
  saveAiSettings: (payload: { ai_base_url: string; ai_api_key: string; ai_model: string }) =>
    fetchJson(`${API_BASE}/settings/ai`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
  musicmatch: (payload: { source_playlist_id: string; name: string; description: string; mode: string }) =>
    fetchJson(`${API_BASE}/playlists/musicmatch`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
```

- [ ] **Step 2: Commit**

```bash
git add web/src/api.ts
git commit -m "feat: add AI settings and musicmatch API wrappers

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 8: Web Frontend — AI Settings Page

**Files:**
- Create: `web/src/pages/AiSettings.tsx`
- Modify: `web/src/App.tsx`

- [ ] **Step 1: Write `AiSettings.tsx`**

Create `web/src/pages/AiSettings.tsx`:

```tsx
import { useEffect, useState } from "react";
import { api } from "../api";

export default function AiSettings() {
  const [settings, setSettings] = useState({ ai_base_url: "", ai_api_key: "", ai_model: "" });
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    api.getAiSettings().then((res) => {
      setSettings(res);
      setLoading(false);
    });
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api.saveAiSettings(settings);
      setMessage("Settings saved");
    } catch (err: any) {
      setMessage("Error: " + err.message);
    }
  }

  if (loading) return <div className="text-gray-400">Loading...</div>;

  return (
    <div className="max-w-xl space-y-4">
      <h1 className="text-2xl font-semibold">AI Settings</h1>
      {message && (
        <div className="rounded bg-indigo-900/40 border border-indigo-500/40 px-4 py-2 text-indigo-200">
          {message}
        </div>
      )}
      <form onSubmit={handleSave} className="space-y-4 rounded-xl border border-gray-700 bg-gray-800 p-4">
        <div>
          <label className="block text-xs text-gray-400 mb-1">Base URL</label>
          <input
            type="text"
            value={settings.ai_base_url}
            onChange={(e) => setSettings({ ...settings, ai_base_url: e.target.value })}
            placeholder="https://api.openai.com/v1"
            className="w-full rounded border border-gray-600 bg-gray-900 px-3 py-2 text-sm outline-none focus:border-indigo-500"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">API Token</label>
          <input
            type="password"
            value={settings.ai_api_key}
            onChange={(e) => setSettings({ ...settings, ai_api_key: e.target.value })}
            placeholder="sk-..."
            className="w-full rounded border border-gray-600 bg-gray-900 px-3 py-2 text-sm outline-none focus:border-indigo-500"
          />
          <p className="text-xs text-gray-500 mt-1">Stored locally in the app database.</p>
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">Model</label>
          <input
            type="text"
            value={settings.ai_model}
            onChange={(e) => setSettings({ ...settings, ai_model: e.target.value })}
            placeholder="gpt-4o"
            className="w-full rounded border border-gray-600 bg-gray-900 px-3 py-2 text-sm outline-none focus:border-indigo-500"
          />
        </div>
        <button type="submit" className="rounded bg-indigo-600 px-4 py-2 text-sm font-medium hover:bg-indigo-500">
          Save
        </button>
      </form>
    </div>
  );
}
```

- [ ] **Step 2: Wire into `App.tsx`**

Modify `web/src/App.tsx`:

```tsx
import AiSettings from './pages/AiSettings'
```

Add nav link inside `<div className=