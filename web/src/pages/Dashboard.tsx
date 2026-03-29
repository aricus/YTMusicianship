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
  const [message, setMessage] = useState<{ text: string; type: "info" | "success" | "error"; link?: { url: string; text: string } } | null>(null);
  // Multi-select for shuffle
  const [selectedForShuffle, setSelectedForShuffle] = useState<Set<string>>(new Set());
  const [shufflingMultiple, setShufflingMultiple] = useState(false);
  // Headers paste state
  const [headersInput, setHeadersInput] = useState("");
  const [headersSubmitting, setHeadersSubmitting] = useState(false);

  // Sync history state
  const [syncing, setSyncing] = useState(false);

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
      setMessage({ text: "Error loading data: " + e.message, type: "error" });
    } finally {
      setLoading(false);
    }
  }

  async function handleSearch() {
    if (!searchQuery.trim()) return;
    try {
      const res = await api.search(searchQuery, "songs", 10);
      setSearchResults(res.results || []);
    } catch (err: any) {
      setMessage({ text: "Search error: " + err.message, type: "error" });
      console.error("[Search] Error:", err);
    }
  }

  function toggleShuffleSelection(playlistId: string) {
    setSelectedForShuffle(prev => {
      const next = new Set(prev);
      if (next.has(playlistId)) next.delete(playlistId);
      else next.add(playlistId);
      return next;
    });
  }

  async function handleShuffle(playlistId: string, title: string) {
    setMessage({ text: `Shuffling ${title}...`, type: "info" });
    try {
      const res = await api.shufflePlaylist(playlistId);
      const playlistUrl = `https://music.youtube.com/playlist?list=${res.new_playlist_id}`;
      const mismatch = res.expected_count && res.track_count !== res.expected_count;
      const text = mismatch
        ? `Created "${res.new_playlist_title}" with ${res.track_count} of ${res.expected_count} tracks (some tracks may be unavailable)`
        : `Created "${res.new_playlist_title}" with ${res.track_count} tracks!`;
      setMessage({
        text,
        type: "success",
        link: { url: playlistUrl, text: "Open in YouTube Music" }
      });
      await loadAll();
    } catch (e: any) {
      setMessage({ text: "Shuffle error: " + e.message, type: "error" });
      console.error("[Shuffle] Error:", e);
    }
  }

  async function handleShuffleMultiple() {
    if (selectedForShuffle.size < 2) {
      setMessage({ text: "Select at least 2 playlists to shuffle together", type: "error" });
      return;
    }

    setShufflingMultiple(true);
    setMessage({ text: `Shuffling ${selectedForShuffle.size} playlists together...`, type: "info" });

    try {
      const res = await api.shuffleMultiplePlaylists(Array.from(selectedForShuffle));
      const playlistUrl = `https://music.youtube.com/playlist?list=${res.new_playlist_id}`;
      setMessage({
        text: `Created "${res.new_playlist_title}" with ${res.track_count} tracks from ${res.source_playlist_count} playlists!`,
        type: "success",
        link: { url: playlistUrl, text: "Open in YouTube Music" }
      });
      setSelectedForShuffle(new Set());
      await loadAll();
    } catch (e: any) {
      setMessage({ text: "Shuffle error: " + e.message, type: "error" });
      console.error("[Shuffle Multiple] Error:", e);
    } finally {
      setShufflingMultiple(false);
    }
  }

  async function handleGenerate() {
    if (!genName.trim() || searchResults.length === 0) return;
    setGenerating(true);
    setMessage({ text: "Generating playlist...", type: "info" });
    try {
      const ids = searchResults.map((r) => r.video_id).filter(Boolean);
      const res = await api.generatePlaylist(genName, ids, "Generated from search");
      setMessage({ text: `Created playlist: ${res.playlist_id}`, type: "success" });
      setGenName("");
      setSearchResults([]);
      await loadAll();
    } catch (e: any) {
      setMessage({ text: "Generate error: " + e.message, type: "error" });
      console.error("[Generate] Error:", e);
    } finally {
      setGenerating(false);
    }
  }

  async function handleAuthUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const res = await api.uploadAuth(file);
      setMessage({ text: res.message || "Auth uploaded", type: "success" });
      await loadAll();
    } catch (err: any) {
      setMessage({ text: "Upload error: " + err.message, type: "error" });
      console.error("[Upload] Error:", err);
    }
  }

  async function handleHeadersSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!headersInput.trim()) {
      setMessage({ text: "Error: Please paste the cURL command or headers", type: "error" });
      return;
    }
    setHeadersSubmitting(true);
    setMessage({ text: "Authenticating with headers...", type: "info" });
    try {
      const res = await api.submitHeaders({ headers: headersInput });
      if (res.status === "ok") {
        setMessage({ text: "Authentication successful!", type: "success" });
        setHeadersInput("");
        await loadAll();
      } else {
        setMessage({ text: "Auth error: " + (res.message || "Unknown error"), type: "error" });
      }
    } catch (err: any) {
      setMessage({ text: "Auth error: " + err.message, type: "error" });
    } finally {
      setHeadersSubmitting(false);
    }
  }

  async function handleSyncHistory() {
    setSyncing(true);
    setMessage({ text: "Syncing history...", type: "info" });
    try {
      const res = await api.syncHistory();
      const syncedCount = res.sync_history?.synced ?? res.sync_history ?? 0;
      setMessage({ text: `Synced ${syncedCount} tracks!`, type: "success" });
      await loadAll();
    } catch (err: any) {
      setMessage({ text: "Sync error: " + err.message, type: "error" });
    } finally {
      setSyncing(false);
    }
  }

  async function handleDeletePlaylist(playlistId: string, title: string) {
    if (!confirm(`Are you sure you want to delete "${title}"? This cannot be undone.`)) {
      return;
    }
    setMessage({ text: `Deleting "${title}"...`, type: "info" });
    try {
      await api.deletePlaylist(playlistId);
      setMessage({ text: `Deleted "${title}"`, type: "success" });
      await loadAll();
    } catch (err: any) {
      setMessage({ text: "Delete error: " + err.message, type: "error" });
      console.error("[Delete] Error:", err);
    }
  }

  if (loading) {
    return <div className="text-gray-400">Loading...</div>;
  }

  const isAuthenticated = health?.authenticated;

  return (
    <div className="space-y-6">
      {message && (
        <div className={`rounded border px-4 py-2 ${
          message.type === "error"
            ? "bg-rose-900/40 border-rose-500/40 text-rose-200"
            : message.type === "success"
            ? "bg-emerald-900/40 border-emerald-500/40 text-emerald-200"
            : "bg-indigo-900/40 border-indigo-500/40 text-indigo-200"
        }`}>
          <div>{message.text}</div>
          {message.link && (
            <a
              href={message.link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 mt-2 text-sm underline hover:text-white"
            >
              {message.link.text}
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
              </svg>
            </a>
          )}
        </div>
      )}

      <section className="rounded-xl border border-gray-700 bg-gray-800 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Dashboard</h1>
            <div className="mt-1 text-sm text-gray-400">
              {isAuthenticated ? (
                <span className="text-emerald-400">Authenticated with YouTube Music</span>
              ) : (
                <span className="text-rose-400">Not authenticated</span>
              )}
            </div>
          </div>
        </div>
      </section>

      {!isAuthenticated ? (
        // Authentication required view
        <div className="space-y-6">
          <section className="rounded-xl border border-rose-700/50 bg-rose-900/20 p-6">
            <h2 className="text-xl font-semibold mb-4 text-rose-200">Authentication Required</h2>
            <p className="text-gray-300 mb-6">
              To use YTMusicianship, you need to authenticate with YouTube Music. Choose one of the methods below:
            </p>

            {/* Method 1: Paste Browser Headers */}
            <div className="mb-8 p-4 rounded-lg bg-emerald-900/20 border border-emerald-700">
              <h3 className="text-lg font-medium mb-3 text-emerald-300">Paste Browser Headers (Recommended)</h3>
              <p className="text-sm text-gray-400 mb-4">
                Copy a request directly from your browser's Network tab. This is the most reliable method.
              </p>

              <div className="mb-4 p-3 rounded bg-gray-900 border border-gray-700 text-sm text-gray-300">
                <p className="font-medium text-gray-200 mb-2">How to authenticate:</p>
                <ol className="list-decimal list-inside space-y-1 text-gray-400">
                  <li>Go to <a href="https://music.youtube.com" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline">music.youtube.com</a> and sign in</li>
                  <li>Press F12 → Network tab</li>
                  <li>Click on any request (like "browse" or "search")</li>
                  <li>Right-click the request → Copy → Copy as cURL (bash)</li>
                  <li>Paste the entire cURL command below</li>
                </ol>
              </div>

              <form onSubmit={handleHeadersSubmit} className="space-y-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">cURL Command or Raw Headers</label>
                  <textarea
                    value={headersInput}
                    onChange={(e) => setHeadersInput(e.target.value)}
                    placeholder="curl 'https://music.youtube.com/youtubei/v1/browse' -H 'cookie: ...' -H 'authorization: ...'"
                    rows={6}
                    className="w-full rounded border border-gray-600 bg-gray-900 px-3 py-2 text-sm outline-none focus:border-indigo-500 font-mono text-xs"
                  />
                </div>
                <button
                  type="submit"
                  disabled={headersSubmitting || !headersInput.trim()}
                  className="w-full rounded bg-emerald-600 px-4 py-2 text-sm font-medium hover:bg-emerald-500 disabled:opacity-50"
                >
                  {headersSubmitting ? "Authenticating..." : "Authenticate"}
                </button>
              </form>
            </div>

            {/* Alternative: Upload oauth.json */}
            <div className="p-4 rounded-lg bg-gray-800 border border-gray-700">
              <h3 className="text-lg font-medium mb-3 text-gray-300">Alternative: Upload oauth.json</h3>
              <p className="text-sm text-gray-400 mb-4">
                If you have an oauth.json file from a previous ytmusicapi setup, you can upload it directly.
              </p>
              <label className="cursor-pointer inline-flex items-center rounded bg-indigo-600 px-4 py-2 text-sm font-medium hover:bg-indigo-500">
                Upload oauth.json
                <input type="file" className="hidden" onChange={handleAuthUpload} />
              </label>
            </div>
          </section>
        </div>
      ) : (
        // Authenticated view - show all features
        <>
          <div className="grid gap-6 md:grid-cols-2">
            <section className="rounded-xl border border-gray-700 bg-gray-800 p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-semibold">Your Playlists</h2>
                {selectedForShuffle.size > 0 && (
                  <button
                    onClick={() => setSelectedForShuffle(new Set())}
                    className="text-xs text-gray-400 hover:text-gray-300"
                  >
                    Clear selection
                  </button>
                )}
              </div>
              {selectedForShuffle.size >= 2 && (
                <div className="mb-3 p-2 rounded bg-emerald-900/30 border border-emerald-700/50 flex items-center justify-between">
                  <span className="text-sm text-emerald-200">
                    {selectedForShuffle.size} playlists selected
                  </span>
                  <button
                    onClick={handleShuffleMultiple}
                    disabled={shufflingMultiple}
                    className="rounded bg-emerald-600 px-3 py-1 text-xs font-medium hover:bg-emerald-500 disabled:opacity-50"
                  >
                    {shufflingMultiple ? "Shuffling..." : "Shuffle Selected Together"}
                  </button>
                </div>
              )}
              <div className="space-y-2 max-h-96 overflow-auto pr-1">
                {playlists.length === 0 && <div className="text-gray-400 text-sm">No playlists found.</div>}
                {playlists.map((pl) => (
                  <div key={pl.playlist_id} className="flex items-center justify-between rounded border border-gray-700 bg-gray-900/50 px-3 py-2">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <input
                        type="checkbox"
                        checked={selectedForShuffle.has(pl.playlist_id)}
                        onChange={() => toggleShuffleSelection(pl.playlist_id)}
                        className="rounded border-gray-600 shrink-0"
                        title="Select for multi-shuffle"
                      />
                      <div className="min-w-0">
                        <div className="font-medium truncate">{pl.title}</div>
                        <div className="text-xs text-gray-400">{pl.count ? `${pl.count} tracks` : ""}</div>
                      </div>
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
                      {pl.title !== "Liked Music" && (
                        <button
                          onClick={() => handleDeletePlaylist(pl.playlist_id, pl.title)}
                          className="rounded bg-rose-900/50 px-2 py-1 text-xs font-medium text-rose-300 hover:bg-rose-900"
                          title="Delete playlist"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                            <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-xl border border-gray-700 bg-gray-800 p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-semibold">Top Songs</h2>
                <button
                  onClick={handleSyncHistory}
                  disabled={syncing}
                  className="rounded bg-indigo-600 px-3 py-1 text-xs font-medium hover:bg-indigo-500 disabled:opacity-50"
                >
                  {syncing ? "Syncing..." : "Sync History"}
                </button>
              </div>
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
                <div key={t.video_id} className="flex items-center justify-between text-sm rounded border border-gray-700 bg-gray-900/50 px-3 py-2">
                  <div className="min-w-0">
                    <div className="truncate">{t.title}</div>
                    <div className="text-gray-400 text-xs truncate">{t.artist}</div>
                  </div>
                  <a
                    href={`https://music.youtube.com/watch?v=${t.video_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 ml-2 text-indigo-400 hover:text-indigo-300"
                    title="Open in YouTube Music"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                    </svg>
                  </a>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
