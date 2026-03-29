import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../api";
import type { Track } from "../types";

export default function PlaylistPage() {
  const { playlistId } = useParams<{ playlistId: string }>();
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Track[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!playlistId) return;
    loadTracks();
  }, [playlistId]);

  async function loadTracks() {
    setLoading(true);
    try {
      const res = await api.getPlaylistTracks(playlistId!, 0);
      setTracks(res.tracks || []);
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

  async function handleAdd(videoId: string) {
    try {
      await api.addTracks(playlistId!, [videoId]);
      setMessage("Track added");
      await loadTracks();
    } catch (e: any) {
      setMessage("Add error: " + e.message);
    }
  }

  async function handleRemoveSelected() {
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    try {
      await api.removeTracks(playlistId!, ids);
      setSelected(new Set());
      setMessage(`Removed ${ids.length} track(s)`);
      await loadTracks();
    } catch (e: any) {
      setMessage("Remove error: " + e.message);
    }
  }

  function toggleSelection(videoId: string) {
    const next = new Set(selected);
    if (next.has(videoId)) next.delete(videoId);
    else next.add(videoId);
    setSelected(next);
  }

  if (loading) return <div className="text-gray-400">Loading...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Playlist</h1>
        <button
          onClick={() => api.shufflePlaylist(playlistId!).then(() => setMessage("Shuffled!")).catch((e) => setMessage(e.message))}
          className="rounded bg-emerald-600 px-3 py-2 text-sm font-medium hover:bg-emerald-500"
        >
          True Shuffle
        </button>
      </div>

      {message && (
        <div className="rounded bg-indigo-900/40 border border-indigo-500/40 px-4 py-2 text-indigo-200">
          {message}
        </div>
      )}

      <section className="rounded-xl border border-gray-700 bg-gray-800 p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Tracks ({tracks.length})</h2>
          {selected.size > 0 && (
            <button
              onClick={handleRemoveSelected}
              className="rounded bg-rose-600 px-3 py-1.5 text-sm font-medium hover:bg-rose-500"
            >
              Remove {selected.size} selected
            </button>
          )}
        </div>
        <div className="space-y-2 max-h-96 overflow-auto pr-1">
          {tracks.map((t) => (
            <div
              key={t.video_id + (t.set_video_id || "")}
              className="flex items-center gap-3 rounded border border-gray-700 bg-gray-900/50 px-3 py-2"
            >
              <input
                type="checkbox"
                checked={selected.has(t.video_id)}
                onChange={() => toggleSelection(t.video_id)}
                className="h-4 w-4 rounded border-gray-600 bg-gray-900 text-indigo-600"
              />
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{t.title}</div>
                <div className="text-xs text-gray-400">{t.artist} {t.duration ? `• ${t.duration}` : ""}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-gray-700 bg-gray-800 p-4">
        <h2 className="text-lg font-semibold mb-3">Add Songs</h2>
        <div className="flex gap-2">
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="Search songs..."
            className="flex-1 rounded border border-gray-600 bg-gray-900 px-3 py-2 text-sm outline-none focus:border-indigo-500"
          />
          <button onClick={handleSearch} className="rounded bg-indigo-600 px-4 py-2 text-sm font-medium hover:bg-indigo-500">
            Search
          </button>
        </div>
        <div className="mt-3 space-y-2">
          {searchResults.map((r) => (
            <div key={r.video_id} className="flex items-center justify-between rounded border border-gray-700 bg-gray-900/50 px-3 py-2">
              <div className="text-sm">
                {r.title} — <span className="text-gray-400">{r.artist}</span>
              </div>
              <button
                onClick={() => handleAdd(r.video_id)}
                className="rounded bg-gray-700 px-2 py-1 text-xs font-medium hover:bg-gray-600"
              >
                Add
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
