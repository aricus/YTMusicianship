import { useEffect, useState } from "react";
import { api } from "../api";
import { Button, Card, CardHeader, CardContent, Badge, Alert } from "../components/ui";

function TrophyIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
    </svg>
  );
}

function RefreshIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  );
}

function MusicIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
    </svg>
  );
}

function UserIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  );
}

export default function RankingsPage() {
  const [topSongs, setTopSongs] = useState<any[]>([]);
  const [topArtists, setTopArtists] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "info" | "success" | "error" } | null>(null);

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
      setMessage({ text: "Error: " + e.message, type: "error" });
    } finally {
      setLoading(false);
    }
  }

  async function handleSync() {
    setSyncing(true);
    try {
      const res = await api.syncHistory();
      setMessage({ text: `Synced ${res.sync_history.synced} events. Rankings updated.`, type: "success" });
      await loadRankings();
    } catch (e: any) {
      setMessage({ text: "Sync error: " + e.message, type: "error" });
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center py-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 mb-4">
          <TrophyIcon className="w-8 h-8 text-amber-400" />
        </div>
        <h1 className="font-display text-4xl font-bold bg-gradient-to-r from-white via-amber-200 to-orange-200 bg-clip-text text-transparent">
          Rankings & Insights
        </h1>
        <p className="mt-2 text-zinc-400">
          Your top songs and artists based on listening history
        </p>
      </div>

      {/* Message */}
      {message && (
        <Alert variant={message.type} onClose={() => setMessage(null)}>
          {message.text}
        </Alert>
      )}

      {/* Sync Button */}
      <div className="flex justify-center">
        <Button onClick={handleSync} isLoading={syncing} size="lg">
          <RefreshIcon className="w-5 h-5 mr-2" />
          Sync History
        </Button>
      </div>

      {/* Rankings Grid */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Top Songs */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 flex items-center justify-center">
                <MusicIcon className="w-5 h-5 text-violet-400" />
              </div>
              <div>
                <h2 className="font-display font-semibold text-lg">Top Songs</h2>
                <p className="text-sm text-zinc-500">Based on play count & recency</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-[500px] overflow-auto">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-5 h-5 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
                </div>
              ) : topSongs.length === 0 ? (
                <div className="p-8 text-center">
                  <p className="text-zinc-500">No rankings yet</p>
                  <p className="text-sm text-zinc-600 mt-1">Sync your history to build them</p>
                </div>
              ) : (
                <div className="divide-y divide-white/[0.04]">
                  {topSongs.map((s, i) => (
                    <div key={i} className="flex items-center gap-4 px-6 py-3 hover:bg-white/[0.02]">
                      <span className={`w-8 text-center font-bold ${
                        i === 0 ? 'text-amber-400' :
                        i === 1 ? 'text-zinc-300' :
                        i === 2 ? 'text-amber-600' :
                        'text-zinc-600'
                      }`}>
                        {i + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{s.entity_name}</p>
                        <p className="text-xs text-zinc-500">
                          {s.play_count} plays • Score {Math.round(s.score)}
                        </p>
                      </div>
                      {s.liked && (
                        <Badge variant="success">Liked</Badge>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Top Artists */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center">
                <UserIcon className="w-5 h-5 text-cyan-400" />
              </div>
              <div>
                <h2 className="font-display font-semibold text-lg">Top Artists</h2>
                <p className="text-sm text-zinc-500">Inferred from your listening habits</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-[500px] overflow-auto">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-5 h-5 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
                </div>
              ) : topArtists.length === 0 ? (
                <div className="p-8 text-center">
                  <p className="text-zinc-500">No rankings yet</p>
                  <p className="text-sm text-zinc-600 mt-1">Sync your history to build them</p>
                </div>
              ) : (
                <div className="divide-y divide-white/[0.04]">
                  {topArtists.map((a, i) => (
                    <div key={i} className="flex items-center gap-4 px-6 py-3 hover:bg-white/[0.02]">
                      <span className={`w-8 text-center font-bold ${
                        i === 0 ? 'text-amber-400' :
                        i === 1 ? 'text-zinc-300' :
                        i === 2 ? 'text-amber-600' :
                        'text-zinc-600'
                      }`}>
                        {i + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{a.entity_name}</p>
                        <p className="text-xs text-zinc-500">
                          {a.play_count} plays • Score {Math.round(a.score)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
