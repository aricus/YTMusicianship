# YTMusicianship

> AI-powered YouTube Music automation with **true shuffle**, intelligent playlist generation, and an automatic taste ranking engine.

[![Docker](https://img.shields.io/badge/docker-ready-blue?logo=docker)](https://docker.com)
[![MCP](https://img.shields.io/badge/MCP-compatible-purple)](https://modelcontextprotocol.io)
[![Python](https://img.shields.io/badge/python-3.12-blue?logo=python)](https://python.org)

---

## What is YTMusicianship?

YouTube Music has a frustrating quirk: **shuffle only plays about 50 songs** from large playlists or your liked songs. YTMusicianship fixes that—and goes much further.

It is a self-hosted service that runs on your machine (inside Docker) and gives you:

- **True Shuffle** for any playlist (including your entire liked songs library)
- **AI Playlist Generation** via an MCP server that any AI client can use
- **Automatic Taste Ranking** that learns what you love from your listening history
- **Scheduled Jobs** (e.g., shuffle your likes every Monday morning)
- **A modern Web GUI** to manage everything without touching code
- **A Model Context Protocol (MCP) server** so tools like Claude Code, Claude Desktop, or OpenClaw can control your music

---

## Table of Contents

1. [Features](#features)
2. [Quick Start (Docker)](#quick-start-docker)
3. [YouTube Music Authentication](#youtube-music-authentication)
4. [Web GUI Usage](#web-gui-usage)
5. [AI / MCP Usage](#ai--mcp-usage)
6. [API Reference](#api-reference)
7. [Troubleshooting](#troubleshooting)
8. [License](#license)

---

## Features

### True Shuffle
Fetch your **entire** playlist, shuffle it client-side, and create a new playlist with the full shuffled order. For playlists you own, the old one is automatically deleted and replaced.

### AI Playlist Generation
Ask your AI assistant to build a playlist for you. The AI can inspect your likes, search YouTube Music, look at your top-ranked songs/artists, and then call `generate_playlist` with the perfect track list.

### Automatic Taste Ranking
The system periodically syncs your YouTube Music listening history and computes rankings for:
- **Top Songs** — weighted by recency, play count, and likes
- **Top Artists** — automatically inferred from your history and liked songs

This means the AI truly understands what you like before it makes suggestions.

### Scheduled Jobs
Create cron-based jobs inside the app:
- `"0 8 * * 1"` → Shuffle your playlist every **Monday at 8:00 AM**
- `"0 2 * * *"` → Sync history and recompute rankings every night at 2:00 AM

### Cross-Platform AI Skill
The included skill definition lets you wire this into any MCP-compatible AI system.

---

## Quick Start (Docker)

The easiest way to run YTMusicianship is with Docker Compose.

### 1. Clone the repository

```bash
git clone https://github.com/yourname/ytmusicianship.git
cd ytmusicianship
```

### 2. Build and start the container

```bash
docker compose up --build -d
```

The service will be available at: **http://localhost:8082**

### 3. Authenticate with YouTube Music

Before the app can do anything, you must provide your YouTube Music credentials.

See the detailed [YouTube Music Authentication](#youtube-music-authentication) section below.

In short:

```bash
# Run the OAuth helper inside the container
docker exec -it ytmusicianship bash
ytmusicapi oauth
# Follow the on-screen link, sign in, and paste the code back
exit
```

This writes `oauth.json` to the `./data/` folder on your host, which is persisted across restarts.

### 4. Open the Web GUI

Navigate to **http://localhost:8082**

You should see the Dashboard with a green "Authenticated" badge.

---

## YouTube Music Authentication

YouTube Music does not have an official public API, so this project uses the excellent open-source **[ytmusicapi](https://github.com/sigma67/ytmusicapi)** library. Authentication can be done via **OAuth** (requires Google Cloud credentials) or **Browser Headers** (copy from your browser).

### Option A: OAuth (requires Google Cloud setup)

This is the most reliable long-term method. You'll need to create OAuth credentials in Google Cloud Console.

1. **Create OAuth credentials** (one-time setup):
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select existing
   - Enable the **YouTube Data API v3**
   - Go to **Credentials** → **Create Credentials** → **OAuth client ID**
   - Choose **TV and Limited Input devices** as the application type
   - Note your **Client ID** and **Client Secret**

2. **Run OAuth inside the container**:

```bash
docker exec -it ytmusicianship bash
python /app/oauth_helper.py "YOUR_CLIENT_ID" "YOUR_CLIENT_SECRET" /app/data/oauth.json
```

3. You will see a URL like:

```
Go to: https://www.google.com/device?user_code=XXXX-XXXX
```

4. Open that URL in your browser, sign in with the Google account tied to your YouTube Music, and confirm the device.

5. Return to the terminal and press Enter. If successful, you'll see:

```
✅ Saved OAuth credentials to /app/data/oauth.json
```

6. Exit the container:

```bash
exit
```

### Option B: Browser Headers (quickest, no setup)

If you don't want to set up Google Cloud credentials:

1. **Make sure you're logged in** to [music.youtube.com](https://music.youtube.com) in your browser
2. Open Developer Tools → Network tab (F12)
3. **Look for a request to `/browse`** (NOT `/search` or other endpoints)
   - Click around the YouTube Music interface until you see a `browse` request
   - The request should contain headers like `cookie`, `x-goog-authuser`, etc.
4. Right-click the `/browse` request → Copy → Copy as cURL
5. Inside the container, run:

```bash
docker exec -it ytmusicianship bash
ytmusicapi browser --file /app/data/oauth.json
# Paste the cURL command when prompted, then press Ctrl+D
```

6. Exit the container:

```bash
exit
```

> **Tip:** If you get an error about missing headers, try a different `/browse` request or refresh the page and try again.

The browser headers method creates an `oauth.json` file that works the same way.

### Option C: Upload via the Web GUI

If you already have an `oauth.json` file from another machine:

1. Open **http://localhost:8082**
2. Click the **Upload oauth.json** button on the Dashboard
3. Select your file
4. The app will validate it immediately

> **Note:** Browser headers may expire after some time and need refreshing. OAuth is more reliable for long-term use.

---

## Web GUI Usage

### Dashboard
- View your **authentication status**
- See all your **playlists** with quick **Shuffle** buttons
- View your **Top Songs** (requires at least one history sync)
- Use the **Quick Playlist Generator** to search for songs and create a playlist instantly
- View your recent **Liked Songs**

### Playlist Page
- Open any playlist to see **every track**
- Click **True Shuffle** to reshuffle the entire playlist
- Use checkboxes to select multiple tracks and **bulk remove** them
- **Search and add** new songs directly from YouTube Music

### Rankings Page
- Click **Sync History** to pull your latest YouTube Music listening history
- View **Top Songs** and **Top Artists** with computed scores
- The ranking system uses **recency-weighted play frequency** and gives a boost to liked songs

### Jobs Page
- Create **scheduled jobs** with standard cron expressions
- Example: `"0 8 * * 1"` = every Monday at 8:00 AM
- Supported actions:
  - **Shuffle playlist**
  - **Sync history + compute rankings**

---

## AI / MCP Usage

YTMusicianship exposes an **MCP server** over **SSE (Server-Sent Events)** at:

```
http://localhost:8082/mcp
```

### Claude Desktop

Edit your Claude Desktop configuration and add the server:

**macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`

**Windows:** `%APPDATA%/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "ytmusicianship": {
      "url": "http://localhost:8082/mcp"
    }
  }
}
```

Restart Claude Desktop. You can now ask things like:

> "Shuffle my entire liked songs library."

> "Create a high-energy workout playlist using my top-ranked songs and search for anything I'm missing."

> "What are my top 10 artists right now?"

### OpenClaw / Custom Agents

Any MCP client that supports HTTP/SSE transport can connect to `http://localhost:8082/mcp`.

See `skill-definition/ytmusicianship.json` for a full machine-readable tool manifest.

### Available MCP Tools

| Tool | Purpose |
|------|---------|
| `list_playlists` | List your YT Music playlists |
| `get_playlist_tracks` | Get all tracks in a playlist |
| `get_liked_songs` | Get your liked songs |
| `search_yt_music` | Search for songs/artists/albums |
| `true_shuffle_playlist` | Shuffle an entire playlist end-to-end |
| `add_tracks_to_playlist` | Add tracks by video ID |
| `remove_tracks_from_playlist` | Remove tracks by video ID |
| `generate_playlist` | Create a playlist from chosen track IDs |
| `sync_history` | Sync history and recompute rankings |
| `get_top_songs` | Get top-ranked songs |
| `get_top_artists` | Get top-ranked artists |
| `get_song_ranking` | Get a specific song's rank |
| `create_scheduled_job` | Create a cron job |
| `list_scheduled_jobs` | List scheduled jobs |
| `delete_scheduled_job` | Delete a scheduled job |

---

## API Reference

All REST endpoints are prefixed with `/api`.

### Health & Auth
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Service + auth health check |
| POST | `/api/auth/upload` | Upload `oauth.json` |

### Library
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/library/likes` | Liked songs |
| GET | `/api/library/history` | Play history |
| GET | `/api/library/search` | Search YT Music |
| POST | `/api/library/sync-history` | Sync + recompute rankings |

### Playlists
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/playlists` | List playlists |
| POST | `/api/playlists` | Create playlist |
| GET | `/api/playlists/{id}/tracks` | Get tracks |
| POST | `/api/playlists/{id}/shuffle` | True shuffle |
| POST | `/api/playlists/{id}/tracks` | Add tracks |
| DELETE | `/api/playlists/{id}/tracks` | Remove tracks |
| POST | `/api/playlists/generate` | Generate from track IDs |

### Rankings
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/rankings/songs` | Top songs |
| GET | `/api/rankings/artists` | Top artists |
| GET | `/api/rankings/genres` | Top genres |
| GET | `/api/rankings/songs/{video_id}` | Song ranking |

### Jobs
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/jobs` | List jobs |
| POST | `/api/jobs` | Create job |
| DELETE | `/api/jobs/{id}` | Delete job |

---

## Troubleshooting

### "Not authenticated" in the web GUI
- Make sure `oauth.json` exists in `./data/oauth.json`
- Try re-running `ytmusicapi oauth` inside the container
- Check that the Docker volume `./data:/app/data` is mounted correctly

### Shuffle fails for a playlist
- YouTube Music "system" playlists (like Your Likes) cannot be deleted. For these, YTMusicianship creates a new shuffled playlist instead of replacing the old one.
- Ensure the playlist is owned by your account if you expect replacement behavior.

### Rankings are empty
- You must run **Sync History** at least once
- YouTube Music history syncing depends on having actual play history in your account

### Docker build errors
- Ensure Docker Engine is running
- Ensure port `8082` is free on your host (or change it in `docker-compose.yml`)

### MCP client cannot connect
- Verify the container is running: `docker ps`
- Test the endpoint: `curl http://localhost:8082/mcp` should not return a connection error
- Ensure your MCP client supports SSE transport over HTTP

---

## License

MIT — use it, fork it, improve it.

Built with love for music lovers who are tired of the 50-song shuffle limit.
