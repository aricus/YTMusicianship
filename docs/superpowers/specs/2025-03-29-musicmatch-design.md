# MusicMatch + Native AI Integration Design

## Overview

Add two related features to YTMusicianship:

1. **MusicMatch** — Generate a new playlist inspired by an existing playlist, preserving its genre/artist diversity unless explicitly narrowed.
2. **Native AI Integration** — Configure any OpenAI-compatible endpoint (base URL, token, model) directly in the web GUI so AI playlist generation works without an external MCP client like OpenClaw.

## MusicMatch

### User Story
> "Create a new playlist based on my Christmas playlist using musicmatch"

### Modes
- **`exact`** — AI suggests specific songs/artists from its training knowledge. Backend searches YT Music for each and adds matches.
- **`search`** — AI outputs creative search queries (e.g., `"Broadway rap like Hamilton"`). Backend runs those queries via `ytmusicapi` and assembles results.
- **`auto`** — AI decides per-suggestion whether `exact` or `search` works better.

### Flow
1. Fetch source playlist tracks from YT Music.
2. Send track list + user prompt + mode to the configured AI endpoint.
3. AI returns structured JSON list of suggestions, each with `type: "exact" | "search"` and `value`.
4. Backend resolves every suggestion:
   - `exact` → search YT Music for `value` (song + artist), take top result.
   - `search` → search YT Music for `value`, take top N results (e.g., 3–5).
5. Deduplicate by `video_id`.
6. Create new playlist with resolved tracks + description.
7. Return new playlist metadata to caller.

### Prompt Engineering
The system prompt sent to the AI will:
- Include up to ~50 source tracks (title, artist).
- Ask the AI to suggest 20–30 new tracks.
- Explicitly instruct: **do NOT limit to a single genre unless the user asks for it.**
- Require JSON output shaped like:

```json
{
  "suggestions": [
    {"type": "exact", "value": "Bohemian Rhapsody - Queen"},
    {"type": "search", "value": "upbeat synthwave instrumentals"}
  ]
}
```

## Native AI Integration

### Settings Storage
New `settings` table in SQLite:
- `ai_base_url`
- `ai_api_key`
- `ai_model`

Stored as plaintext for simplicity in v1.

### Web GUI Additions
- **AI Settings** page in navigation:
  - Inputs: Base URL, API Token, Model.
  - Save button persists to backend.
- **Dashboard AI card**:
  - Source playlist selector (optional).
  - Prompt textarea.
  - Mode toggle: Exact / Search / Auto.
  - Generate button.
  - Results preview with discovered tracks before confirming playlist creation.

### REST Endpoints
- `GET /api/settings/ai` — retrieve AI config.
- `POST /api/settings/ai` — save AI config.
- `POST /api/playlists/musicmatch` — run MusicMatch generation.

### MCP Tool
- `musicmatch(source_playlist_id, name, description, mode)` — generates the playlist via the backend AI integration.

## Architecture

### New/Modified Components
- `src/ytmusicianship/db.py` — add `Setting` model.
- `src/ytmusicianship/services/ai.py` — OpenAI-compatible client wrapper, prompt builder, JSON response parser.
- `src/ytmusicianship/services/playlist.py` — add `musicmatch` orchestration function.
- `src/ytmusicianship/api/routes.py` — new settings and musicmatch endpoints.
- `src/ytmusicianship/mcp_server.py` — expose `musicmatch` tool.
- `web/src/pages/` — add `AiSettings.tsx`, update `Dashboard.tsx` with MusicMatch card.
- `web/src/api.ts` — add new API wrappers.

## Error Handling
- If AI is unconfigured, return 400 with clear message: "AI not configured. Go to AI Settings."
- If AI returns unparseable JSON, attempt regex extraction fallback; if still failing, return 502 with raw response for debugging.
- If a suggestion yields no YT Music match, skip it and include a `warnings` list in the response.

## Security Note
- API key is stored in SQLite and never logged or returned to the client after saving.
- `GET /api/settings/ai` will mask the key (e.g., return `sk-...abcd`) or omit it entirely.
