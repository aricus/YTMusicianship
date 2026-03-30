# YTMusicianship

> AI-powered YouTube Music automation with **true shuffle**, intelligent playlist generation, and an automatic taste ranking engine.

[![Docker](https://img.shields.io/badge/docker-ready-blue?logo=docker)](https://docker.com)
[![MCP](https://img.shields.io/badge/MCP-compatible-purple)](https://modelcontextprotocol.io)
[![Python](https://img.shields.io/badge/python-3.12-blue?logo=python)](https://python.org)

---

## What is YTMusicianship?

YouTube Music has a frustrating quirk: **shuffle only plays about 50 songs** from large playlists or your liked songs. YTMusicianship fixes that—and goes much further.

It is a self-hosted service that runs on your machine (inside Docker) and gives you:

- **🎲 True Shuffle** for any playlist (including your entire liked songs library)
- **🎵 MusicMatch** — AI-powered playlist generation that captures the *feeling* of your selections
- **🤖 AI Playlist Generation** via an MCP server that any AI client can use
- **📊 Automatic Taste Ranking** that learns what you love from your listening history
- **⏰ Scheduled Jobs** (e.g., shuffle your likes every Monday morning)
- **🌐 Modern Web GUI** to manage everything without touching code
- **🔌 Model Context Protocol (MCP) server** so tools like Claude Code, Claude Desktop, or OpenClaw can control your music

---

## Table of Contents

1. [Features](#features)
2. [Quick Start (Docker)](#quick-start-docker)
3. [YouTube Music Authentication](#youtube-music-authentication)
4. [MusicMatch — AI Playlist Generation](#musicmatch--ai-playlist-generation)
5. [Web GUI Usage](#web-gui-usage)
6. [AI / MCP Usage](#ai--mcp-usage)
7. [API Reference](#api-reference)
8. [Troubleshooting](#troubleshooting)
9. [License](#license)

---

## Features

### 🎲 True Shuffle

<img width="2259" height="1678" alt="image" src="https://github.com/user-attachments/assets/ea01c85e-e1f4-426a-bc35-2b68226d38cc" />


Fetch your **entire** playlist, shuffle it client-side with Fisher-Yates, and create a new playlist with the full shuffled order. No more 50-song limits!

When shuffling a single playlist that you own, the new shuffled playlist will have the same name as the original (plus "(Shuffled)"), and the original is cleaned up automatically. Your music stays organized without duplicate playlists cluttering your library.

**Multi-Playlist Shuffle**: Select multiple playlists and combine them into one giant shuffled mix—perfect for parties or discovering forgotten favorites across different collections.

### 🎵 MusicMatch — AI That Understands the "Vibe"

<img width="2161" height="1674" alt="image" src="https://github.com/user-attachments/assets/910c71bb-7b9f-4843-9f09-fbd954bf3219" />



MusicMatch is the crown jewel of YTMusicianship. Instead of just shuffling songs you already know, MusicMatch uses AI to understand the **emotional quality** of your selections and find songs that match that *feeling*.

**Example**: Select Eminem, Jesse & Joy, and the Hamilton Cast. The AI doesn't just pick rap, Latin pop, and Broadway. It identifies the **storytelling intensity**, **emotional rawness**, and **theatrical energy** shared by all three—and finds other songs with those same qualities across any genre.

**Key Features**:
- **Vibe Analysis**: The AI analyzes what emotional qualities connect your selections (energy, mood, themes, storytelling style)
- **Selection Weight Slider**: Control the balance between your explicit selections and exploration from your taste profile
  - `0%` = Pure discovery based on your general taste
  - `50%` = Balanced mix of selections and exploration
  - `100%` = Strictly songs from your selected sources
- **Taste Profile Awareness**: The AI knows your top artists, top songs, and liked artists to make informed recommendations
- **Transparency**: See exactly what "vibe" the AI detected and how it made its choices

### 🤖 AI Playlist Generation

<img width="1459" height="652" alt="image" src="https://github.com/user-attachments/assets/8e115545-b52f-49d7-a2d0-dcdcd317b545" />


Ask your AI assistant to build a playlist for you. The AI can inspect your likes, search YouTube Music, look at your top-ranked songs/artists, and then call `generate_playlist` with the perfect track list.

### 📊 Automatic Taste Ranking
The system periodically syncs your YouTube Music listening history and computes rankings for:
- **Top Songs** — weighted by recency, play count, and likes
- **Top Artists** — automatically inferred from your history and liked songs

This means the AI truly understands what you like before it makes suggestions. The ranking uses recency-weighted scoring (half-life ~30 days), so recent plays count more.

### ⏰ Scheduled Jobs

<img width="2220" height="1641" alt="image" src="https://github.com/user-attachments/assets/4107f759-8f45-416c-9763-206eb5817749" />


Create cron-based jobs inside the app:
- `"0 8 * * 1"` → Shuffle your playlist every **Monday at 8:00 AM**
- `"0 2 * * *"` → Sync history and recompute rankings every night at 2:00 AM

### 🔌 Cross-Platform AI Skill
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

**Recommended**: Use the **Easy Auth** method in the Web GUI:

1. Open **http://localhost:8082**
2. You'll see "Not Authenticated" — click **Go to Settings**
3. Choose one of the authentication methods (see [YouTube Music Authentication](#youtube-music-authentication) for details)

Or use the command line:

```bash
# Run the Easy Auth helper inside the container
docker exec -it ytmusicianship bash
python /app/easy_auth.py
```

### 4. Open the Web GUI

Navigate to **http://localhost:8082**

You should see the Dashboard with a green "Authenticated" badge.

---

## YouTube Music Authentication

YouTube Music does not have an official public API, so this project uses the excellent open-source **[ytmusicapi](https://github.com/sigma67/ytmusicapi)** library.

YTMusicianship provides **four authentication methods**, from easiest to most advanced:

### Method 1: Easy Auth (Recommended — Easiest) 🌟

This is the simplest method. The app guides you through copying headers directly in your browser.

**Via Web GUI:**
1. Go to **Settings** page
2. Click **Easy Auth** tab
3. Follow the on-screen instructions:
   - Open [music.youtube.com](https://music.youtube.com)
   - Press F12 to open Developer Tools
   - Go to Network tab
   - Click on any song or playlist
   - Right-click the `browse` request → Copy → Copy as cURL
   - Paste the result into the text box in YTMusicianship
   - Click **Submit Headers**

**Via Command Line:**

```bash
docker exec -it ytmusicianship bash
python /app/easy_auth.py
# Follow the interactive prompts
exit
```

### Method 2: Cookie Helper (Simple) 🍪

If you have your browser cookies handy, you can paste specific cookie values directly.

**Via Web GUI:**
1. Go to **Settings** page
2. Click **Cookie Helper** tab
3. Enter your cookies:
   - `SAPISID` — From music.youtube.com cookies
   - `APISID` — From music.youtube.com cookies
   - `SSID` — From music.youtube.com cookies
   - `HSID` — From music.youtube.com cookies
   - `SID` — From music.youtube.com cookies
   - `SIDCC` — From music.youtube.com cookies
4. Click **Generate Headers**

To find these cookies:
1. Go to [music.youtube.com](https://music.youtube.com)
2. Press F12 → Application/Storage tab → Cookies
3. Look for `music.youtube.com` domain
4. Copy the values for the cookies listed above

### Method 3: Headers Helper (Advanced)

Paste a raw request directly from your browser's Network tab.

**Via Web GUI:**
1. Go to **Settings** page
2. Click **Headers Helper** tab
3. Follow the instructions to copy a request from your browser
4. Paste the raw headers or cURL command
5. Click **Submit**

**Via Command Line:**

```bash
docker exec -it ytmusicianship bash
python /app/headers_helper.py
# Paste your headers when prompted
exit
```

### Method 4: OAuth (Advanced — May Not Work Reliably)

**⚠️ WARNING:** OAuth authentication with ytmusicapi is currently unreliable due to Google API changes. Only use this if the other methods don't work for you.

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

3. Visit the URL shown, enter the code, and complete the Google sign-in.

### Managing Authentication

**Check Authentication Status:**
The Dashboard shows a green "Authenticated" badge when valid credentials are detected.

**Delete Authentication:**
Go to **Settings** → Click **Delete Authentication** to remove stored credentials. This is useful if you want to switch accounts or re-authenticate.

**⚠️ Important Notes:**
- Browser headers and cookies may expire after some time (usually weeks) and need refreshing
- If you see "Not authenticated" errors, try re-authenticating using one of the methods above
- The authentication file is stored in `./data/oauth.json` on your host and persists across container restarts

---

## MusicMatch — AI Playlist Generation

MusicMatch is YTMusicianship's intelligent playlist generator. Unlike simple shuffling, MusicMatch uses AI to understand the **emotional and stylistic qualities** of your music selections.

### How It Works

1. **Select Sources**: Choose one or more playlists and/or artists from your liked songs
2. **Configure AI** (optional): Enable AI and adjust the Selection Weight slider
3. **Vibe Analysis**: The AI analyzes what connects your selections
4. **Smart Recommendations**: Get a playlist of ~100 songs that match the *feeling*, not just the genre

### Why Use MusicMatch?

**Traditional shuffle** just mixes songs you already know. **MusicMatch** helps you:

- **Discover connections**: Find songs across different genres that share emotional qualities
- **Explore intelligently**: The AI uses your taste profile to find things you'll actually like
- **Capture moods**: Create playlists around a specific "vibe" or feeling
- **Transparency**: See exactly what the AI detected and why it chose each song

### Example Scenarios

| Your Selections | Vibe Detected | What You Might Get |
|----------------|---------------|-------------------|
| Eminem + Hamilton Cast | Storytelling intensity, theatrical energy | Broadway rap, narrative-driven songs, emotionally raw tracks |
| Jesse & Joy + Coldplay | Emotional vulnerability, anthemic choruses | Indie pop, heartfelt ballads, uplifting alternative |
| Metallica + Hans Zimmer | Epic scale, dramatic buildups | Symphonic metal, epic film scores, powerful orchestral rock |
| Daft Punk + Nile Rodgers | Funky grooves, danceable beats | Disco revival, funk house, groove-based pop |

### Using MusicMatch

**In the Web GUI:**

1. Click **MusicMatch** in the navigation
2. **Select Playlists**: Check the boxes next to playlists you want as inspiration
3. **Select Artists**: Check artists from your liked songs
4. **Toggle AI**: Enable "Use AI Recommendations" for intelligent generation
5. **Adjust Selection Weight**:
   - **Low (0-30%)**: More discovery, loosely based on your selections
   - **Medium (30-70%)**: Balanced mix of selections and exploration
   - **High (70-100%)**: Stay close to your explicit selections
6. **Click Generate**: Wait 1-3 minutes for the AI to analyze and generate

**What You'll See:**

When generation completes, you'll see:
- **Playlist link** to open in YouTube Music
- **Vibe Detected**: The emotional quality the AI identified
- **AI Reasoning**: How the AI interpreted your selections
- **Selection Breakdown**: Percentage from direct selections vs. taste exploration
- **Key Influences**: Which artists/playlists most influenced the result

### AI Settings

To use AI features, you need to configure an OpenAI-compatible API:

1. Go to **Settings** page
2. Click **AI Configuration**
3. Enter:
   - **Base URL**: Your API endpoint (e.g., `https://api.openai.com/v1` or `http://localhost:11434/v1` for Ollama)
   - **API Key**: Your API key (stored securely)
   - **Model**: The model to use (e.g., `gpt-4`, `gpt-3.5-turbo`, `llama3.2`)
4. Click **Save AI Settings**

**Self-Hosted Options:**
- **Ollama**: Run models locally on your machine
- **LM Studio**: Easy local LLM hosting with OpenAI-compatible API
- **Any OpenAI-compatible endpoint**: Use your preferred provider

---

## Web GUI Usage

### Dashboard
- View your **authentication status**
- See all your **playlists** with quick **Shuffle** buttons
- View your **Top Songs** (requires at least one history sync)
- Use the **Quick Playlist Generator** to search for songs and create a playlist instantly
- View your recent **Liked Songs**
- **Multi-Playlist Shuffle**: Select multiple playlists and shuffle them together

### Playlist Page
- Open any playlist to see **every track**
- Click **True Shuffle** to reshuffle the entire playlist
- Use checkboxes to select multiple tracks and **bulk remove** them
- **Search and add** new songs directly from YouTube Music

### MusicMatch Page
- **AI-powered playlist generation** (see [MusicMatch](#musicmatch--ai-playlist-generation))
- View your **Taste Profile** — what the AI knows about your listening habits
- Select multiple playlists and artists as inspiration
- Control the **Selection Weight** for recommendations

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

### Settings Page
- **Authentication**: Set up or delete YouTube Music credentials
- **AI Configuration**: Configure OpenAI-compatible API for MusicMatch
- **Easy Auth**: Guided authentication process

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

> "Use MusicMatch to create a playlist based on my workout playlist and Eminem — capture the intense energy."

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
| `get_taste_profile` | Get user's taste profile for AI context |

---

## API Reference

All REST endpoints are prefixed with `/api`.

### Health & Auth
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Service + auth health check |
| POST | `/api/auth/upload` | Upload `oauth.json` |
| POST | `/api/auth/cookies` | Submit cookies directly |
| POST | `/api/auth/headers` | Submit browser headers |
| DELETE | `/api/auth` | Delete stored authentication |

### Library
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/library/likes` | Liked songs |
| GET | `/api/library/history` | Play history |
| GET | `/api/library/search` | Search YT Music |
| GET | `/api/library/artists` | Get unique artists from likes |
| POST | `/api/library/sync-history` | Sync + recompute rankings |

### Playlists
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/playlists` | List playlists |
| POST | `/api/playlists` | Create playlist |
| GET | `/api/playlists/{id}/tracks` | Get tracks |
| POST | `/api/playlists/{id}/shuffle` | True shuffle single playlist |
| POST | `/api/playlists/shuffle` | Shuffle multiple playlists together |
| POST | `/api/playlists/{id}/tracks` | Add tracks |
| DELETE | `/api/playlists/{id}/tracks` | Remove tracks |
| DELETE | `/api/playlists/{id}` | Delete playlist |
| POST | `/api/playlists/generate` | Generate from track IDs |
| POST | `/api/playlists/musicmatch` | AI-powered MusicMatch generation |

### MusicMatch & Taste Profile
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/musicmatch/taste-profile` | Get user's taste profile |

### Settings
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/settings/ai` | Get AI configuration (masked) |
| POST | `/api/settings/ai` | Save AI configuration |

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
- Make sure you've completed the authentication process via **Settings**
- Try using the **Easy Auth** method in the Settings page
- Check that the Docker volume `./data:/app/data` is mounted correctly
- Look for `oauth.json` in your local `./data/` folder

### Authentication expires quickly
- Browser header authentication can expire after some time (weeks)
- If you see frequent "Not authenticated" errors, re-run the authentication process
- The **Easy Auth** method makes this quick and painless

### Shuffle fails for a playlist
- YouTube Music "system" playlists (like Your Likes) cannot be deleted. For these, YTMusicianship creates a new shuffled playlist with a different name.
- When shuffling a single user-owned playlist, the original is replaced with the shuffled version to keep your library tidy.

### MusicMatch AI generation fails
- Check that AI settings are configured in **Settings → AI Configuration**
- Ensure your API key and base URL are correct
- If using a local model (Ollama/LM Studio), make sure it's running and accessible
- Check the container logs: `docker logs ytmusicianship`

### Rankings are empty
- You must run **Sync History** at least once
- YouTube Music history syncing depends on having actual play history in your account
- Go to **Rankings** page and click **Sync History**

### Docker build errors
- Ensure Docker Engine is running
- Ensure port `8082` is free on your host (or change it in `docker-compose.yml`)

### MCP client cannot connect
- Verify the container is running: `docker ps`
- Test the endpoint: `curl http://localhost:8082/mcp` should not return a connection error
- Ensure your MCP client supports SSE transport over HTTP

### Page refresh shows "Not Found"
- This was a bug in earlier versions. Make sure you're on the latest version.
- The SPA routing fix is included in recent builds.

---

## License

MIT — use it, fork it, improve it.

Built with love for music lovers who are tired of the 50-song shuffle limit.

**Created by Robert McClellan**

---

## Credits

- **[ytmusicapi](https://github.com/sigma67/ytmusicapi)** — The amazing Python library that makes this possible
- **Model Context Protocol** — The open standard for AI tool integration
