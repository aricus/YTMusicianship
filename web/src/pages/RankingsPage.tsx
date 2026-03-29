import { useEffect, useState } from "react";
import { api } from "../api";

export default function RankingsPage() {
  const [topSongs, setTopSongs] = useState<any[]>([]);
  const [topArtists, setTopArtists] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadRankings();
  }, []);

  async function loadRankings() {
    setLoading(true);
    try {
      const [s, a] = await Promise.all([api.getTopSongs(20), api.getTopArtists(20)]);
      setTopSongs(s.rankings || []);
      setTopArtists(a.rankings || []);
    } catch (e: any) {
      setMessage("Error: " + e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSync() {
    setSyncing(true);
    try {
      const res = await api.syncHistory();
      setMessage(`Synced ${res.sync_history.synced} events. Rankings updated.`);
      await loadRankings();
    } catch (e: any) {
      setMessage("Sync error: " + e.message);
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Rankings & Insights</h1>
        <button
          onClick={handleSync}
          disabled={syncing}
          className="rounded bg-indigo-600 px-4 py-2 text-sm font-medium hover:bg-indigo-500 disabled:opacity-50"
        >
          {syncing ? "Syncing..." : "Sync History"}
        </button>
      </div>

      {message && (
        <div className="rounded bg-indigo-900/40 border border-indigo-500/40 px-4 py-2 text-indigo-200">
          {message}
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <section className="rounded-xl border border-gray-700 bg-gray-800 p-4">
          <h2 className="text-lg font-semibold mb-3">Top Songs</h2>
          <div className="space-y-2 max-h-96 overflow-auto pr-1">
            {loading && <div className="text-gray-400">Loading...</div>}
            {!loading && topSongs.length === 0 && (
              <div className="text-gray-400 text-sm">No rankings yet. Sync your history to build them.</div>
            )}
            {topSongs.map((s, i) => (
              <div
                key={i}
                className="flex items-center justify-between rounded border border-gray-700 bg-gray-900/50 px-3 py-2"
              >
                <div className="min-w-0">
                  <div className="font-medium truncate">{s.entity_name}</div>
                  <div className="text-xs text-gray-400">
                    Score {s.score} • Plays {s.play_count} {s.liked ? "• Liked" : ""}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-xl border border-gray-700 bg-gray-800 p-4">
          <h2 className="text-lg font-semibold mb-3">Top Artists</h2>
          <div className="space-y-2 max-h-96 overflow-auto pr-1">
            {loading && <div className="text-gray-400">Loading...</div>}
            {!loading && topArtists.length === 0 && (
              <div className="text-gray-400 text-sm">No rankings yet. Sync your history to build them.</div>
            )}
            {topArtists.map((a, i) => (
              <div
                key={i}
                className="flex items-center justify-between rounded border border-gray-700 bg-gray-900/50 px-3 py-2"
              >
                <div className="min-w-0">
                  <div className="font-medium truncate">{a.entity_name}</div>
                  <div className="text-xs text-gray-400">Score {a.score} • Plays {a.play_count}</div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
