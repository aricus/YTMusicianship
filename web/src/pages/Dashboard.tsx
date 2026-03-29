import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import type { Playlist, Track } from "../types";

export default function Dashboard() {
  const [health, setHealth] = useState<{ status: string; authenticated: boolean } | null>(null);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [liked, setLiked] = useState<Track[]>([]);
  const [topSongs, setTopSongs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Track[]>([]);
  const [generating, setGenerating] = useState(false);
  const [genName, setGenName] = useState("");
  const [message, setMessage] = useState("");
  const [sourcePlaylist, setSourcePlaylist] = useState("");
  const [mmName, setMmName] = useState("");
  const [mmDesc, setMmDesc] = useState("");
  const [mmMode, setMmMode] = useState<"exact" | "search" | "auto">("auto");
  const [mmLoading, setMmLoading] = useState(false);

  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll() {
    setLoading(true);
    try {
      const [h, pl, l, ts] = await Promise.all([
        api.health(),
        api.getPlaylists(),
        api.getLikedSongs(20),
        api.getTopSongs(10),
      ]);
      setHealth(h);
      setPlaylists(pl.playlists || []);
      setLiked(l.tracks || []);
      setTopSongs(ts.rankings || []);
    } catch (e: any) {
      setMessage("Error: " + e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSearch() {
    if (!searchQuery.trim()) return;
    const res = await api.search(searchQuery, "songs", 10);
    setSearchResults(res.results || []);
  }

  async function handleShuffle(playlistId: string, title: string) {
    setMessage(`Shuffling ${title}...`);
    try {
      const res = await api.shufflePlaylist(playlistId);
      setMessage(`Shuffled! New playlist: ${res.new_playlist_id}`);
      await loadAll();
    } catch (e: any) {
      setMessage("Shuffle error: " + e.message);
    }
  }

  async function handleGenerate() {
    if (!genName.trim() || searchResults.length === 0) return;
    setGenerating(true);
    setMessage("Generating playlist...");
    try {
      const ids = searchResults.map((r) => r.video_id).filter(Boolean);
      const res = await api.generatePlaylist(genName, ids, "Generated from search");
      setMessage(`Created playlist: ${res.playlist_id}`);
      setGenName("");
      setSearchResults([]);
      await loadAll();
    } catch (e: any) {
      setMessage("Generate error: " + e.message);
    } finally {
      setGenerating(false);
    }
  }

  async function handleAuthUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const res = await api.uploadAuth(file);
      setMessage(res.message || "Auth uploaded");
      await loadAll();
    } catch (err: any) {
      setMessage("Upload error: " + err.message);
    }
  }

  async function handleMusicMatch() {
    if (!sourcePlaylist || !mmName) return;
    setMmLoading(true);
    setMessage("Generating playlist with AI...");
    try {
      const res = await api.musicmatch({
        source_playlist_id: sourcePlaylist,
        name: mmName,
        description: mmDesc,
        mode: mmMode,
      });
      if (res.status === "ok") {
        setMessage(`Created playlist "${mmName}" with ${res.tracks.length} tracks!`);
        setMmName("");
        setMmDesc("");
        loadAll();
      } else {
        setMessage("Error: " + (res.message || "Unknown error"));
      }
    } catch (err: any) {
      setMessage("MusicMatch error: " + err.message);
    } finally {
      setMmLoading(false);
    }
  }

  if (loading) {
    return <div className="text-gray-400">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      {message && (
        <div className="rounded bg-indigo-900/40 border border-indigo-500/40 px-4 py-2 text-indigo-200">
          {message}
        </div>
      )}

      <section className="rounded-xl border border-gray-700 bg-gray-800 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Dashboard</h1>
            <div className="mt-1 text-sm text-gray-400">
              {health?.authenticated ? (
                <span className="text-emerald-400">Authenticated with YouTube Music</span>
              ) : (
                <span className="text-rose-400">Not authenticated</span>
              )}
            </div>
          </div>
          <div>
            <label className="cursor-pointer inline-flex items-center rounded bg-indigo-600 px-3 py-2 text-sm font-medium hover:bg-indigo-500">
              Upload oauth.json
              <input type="file" className="hidden" onChange={handleAuthUpload} />
            </label>
          </div>
        </div>
      </section>

      <div className="grid gap-6 md:grid-cols-2">
        <section className="rounded-xl border border-gray-700 bg-gray-800 p-4">
          <h2 className="text-lg font-semibold mb-3">Your Playlists</h2>
          <div className="space-y-2 max-h-96 overflow-auto pr-1">
            {playlists.length === 0 && <div className="text-gray-400 text-sm">No playlists found.</div>}
            {playlists.map((pl) => (
              <div key={pl.playlist_id} className="flex items-center justify-between rounded border border-gray-700 bg-gray-900/50 px-3 py-2">
                <div className="min-w-0">
                  <div className="font-medium truncate">{pl.title}</div>
                  <div className="text-xs text-gray-400">{pl.count ? `${pl.count} tracks` : ""}</div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => handleShuffle(pl.playlist_id, pl.title)}
                    className="rounded bg-emerald-600 px-2 py-1 text-xs font-medium hover:bg-emerald-500"
                  >
                    Shuffle
                  </button>
                  <Link
                    to={`/playlist/${encodeURIComponent(pl.playlist_id)}`}
                    className="rounded bg-gray-700 px-2 py-1 text-xs font-medium hover:bg-gray-600"
                  >
                    Open
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-xl border border-gray-700 bg-gray-800 p-4">
          <h2 className="text-lg font-semibold mb-3">Top Songs</h2>
          <div className="space-y-2 max-h-96 overflow-auto pr-1">
            {topSongs.length === 0 && <div className="text-gray-400 text-sm">No rankings yet. Sync history to build rankings.</div>}
            {topSongs.map((s, idx) => (
              <div key={idx} className="flex items-center justify-between rounded border border-gray-700 bg-gray-900/50 px-3 py-2">
                <div className="min-w-0">
                  <div className="font-medium truncate">{s.entity_name}</div>
                  <div className="text-xs text-gray-400">Score {s.score} • Plays {s.play_count}</div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="rounded-xl border border-gray-700 bg-gray-800 p-4">
        <h2 className="text-lg font-semibold mb-3">Quick Playlist Generator</h2>
        <div className="flex flex-col gap-3 md:flex-row">
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="Search songs to add to a new playlist..."
            className="flex-1 rounded border border-gray-600 bg-gray-900 px-3 py-2 text-sm outline-none focus:border-indigo-500"
          />
          <button onClick={handleSearch} className="rounded bg-indigo-600 px-4 py-2 text-sm font-medium hover:bg-indigo-500">
            Search
          </button>
        </div>

        {searchResults.length > 0 && (
          <div className="mt-3 space-y-2">
            <div className="text-sm text-gray-400">Search results:</div>
            {searchResults.map((r) => (
              <div key={r.video_id} className="flex items-center justify-between rounded border border-gray-700 bg-gray-900/50 px-3 py-2">
                <div className="text-sm">
                  {r.title} — <span className="text-gray-400">{r.artist}</span>
                </div>
              </div>
            ))}
            <div className="flex gap-2 mt-2">
              <input
                value={genName}
                onChange={(e) => setGenName(e.target.value)}
                placeholder="Playlist name"
                className="flex-1 rounded border border-gray-600 bg-gray-900 px-3 py-2 text-sm outline-none focus:border-indigo-500"
              />
              <button
                onClick={handleGenerate}
                disabled={generating || !genName.trim()}
                className="rounded bg-emerald-600 px-4 py-2 text-sm font-medium hover:bg-emerald-500 disabled:opacity-50"
              >
                {generating ? "Creating..." : "Create Playlist"}
              </button>
            </div>
          </div>
        )}
      </section>

      <section className="rounded-xl border border-gray-700 bg-gray-800 p-4">
        <h2 className="text-lg font-semibold mb-3">Recent Likes</h2>
        <div className="space-y-2 max-h-64 overflow-auto pr-1">
          {liked.map((t) => (
            <div key={t.video_id} className="text-sm rounded border border-gray-700 bg-gray-900/50 px-3 py-2">
              {t.title} — <span className="text-gray-400">{t.artist}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-gray-700 bg-gray-800 p-4">
        <h2 className="text-lg font-semibold mb-3">MusicMatch — Generate from Playlist</h2>
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Source Playlist</label>
            <select
              value={sourcePlaylist}
              onChange={(e) => setSourcePlaylist(e.target.value)}
              className="w-full rounded border border-gray-600 bg-gray-900 px-3 py-2 text-sm outline-none focus:border-indigo-500"
            >
              <option value="">Select a playlist...</option>
              {playlists.map((pl) => (
                <option key={pl.playlist_id} value={pl.playlist_id}>{pl.title}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">New Playlist Name</label>
            <input
              type="text"
              value={mmName}
              onChange={(e) => setMmName(e.target.value)}
              placeholder="Inspired Mix"
              className="w-full rounded border border-gray-600 bg-gray-900 px-3 py-2 text-sm outline-none focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Description (optional)</label>
            <input
              type="text"
              value={mmDesc}
              onChange={(e) => setMmDesc(e.target.value)}
              placeholder="AI-generated based on my favorites"
              className="w-full rounded border border-gray-600 bg-gray-900 px-3 py-2 text-sm outline-none focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Mode</label>
            <div className="flex gap-2">
              {(["exact", "search", "auto"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setMmMode(m)}
                  className={`rounded px-3 py-1 text-xs font-medium capitalize ${
                    mmMode === m ? "bg-indigo-600 text-white" : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Exact = specific songs • Search = creative queries • Auto = intelligent mix
            </p>
          </div>
          <button
            onClick={handleMusicMatch}
            disabled={mmLoading || !sourcePlaylist || !mmName}
            className="w-full rounded bg-emerald-600 px-4 py-2 text-sm font-medium hover:bg-emerald-500 disabled:opacity-50"
          >
            {mmLoading ? "Generating..." : "Generate Playlist"}
          </button>
        </div>
      </section>
    </div>
  );
}
