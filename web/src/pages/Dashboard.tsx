import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import type { Playlist, Track } from "../types";
import {
  Button,
  Card,
  CardHeader,
  CardContent,
  Badge,
  Input,
  Alert,
  SectionTitle,
  EmptyState,
  ListItem
} from "../components/ui";

// Icons
function MusicIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
    </svg>
  );
}

function TrophyIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
    </svg>
  );
}

function HeartIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
    </svg>
  );
}

function SparklesIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
    </svg>
  );
}

function ExternalLinkIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
    </svg>
  );
}

function TrashIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  );
}

function ShuffleIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
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

function SearchIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  );
}

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
  const [selectedForShuffle, setSelectedForShuffle] = useState<Set<string>>(new Set());
  const [shufflingMultiple, setShufflingMultiple] = useState(false);
  const [headersInput, setHeadersInput] = useState("");
  const [headersSubmitting, setHeadersSubmitting] = useState(false);
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
    setMessage({ text: `Shuffling "${title}"...`, type: "info" });
    try {
      const res = await api.shufflePlaylist(playlistId);
      const playlistUrl = `https://music.youtube.com/playlist?list=${res.new_playlist_id}`;
      const mismatch = res.expected_count && res.track_count !== res.expected_count;
      const text = mismatch
        ? `Created "${res.new_playlist_title}" with ${res.track_count} of ${res.expected_count} tracks`
        : `Created "${res.new_playlist_title}" with ${res.track_count} tracks!`;
      setMessage({ text, type: "success", link: { url: playlistUrl, text: "Open in YouTube Music" } });
      await loadAll();
    } catch (e: any) {
      setMessage({ text: "Shuffle error: " + e.message, type: "error" });
    }
  }

  async function handleShuffleMultiple() {
    if (selectedForShuffle.size < 2) {
      setMessage({ text: "Select at least 2 playlists to shuffle together", type: "error" });
      return;
    }
    setShufflingMultiple(true);
    setMessage({ text: `Shuffling ${selectedForShuffle.size} playlists...`, type: "info" });
    try {
      const res = await api.shuffleMultiplePlaylists(Array.from(selectedForShuffle));
      const playlistUrl = `https://music.youtube.com/playlist?list=${res.new_playlist_id}`;
      setMessage({
        text: `Created "${res.new_playlist_title}" with ${res.track_count} tracks!`,
        type: "success",
        link: { url: playlistUrl, text: "Open in YouTube Music" }
      });
      setSelectedForShuffle(new Set());
      await loadAll();
    } catch (e: any) {
      setMessage({ text: "Shuffle error: " + e.message, type: "error" });
    } finally {
      setShufflingMultiple(false);
    }
  }

  async function handleGenerate() {
    if (!genName.trim() || searchResults.length === 0) return;
    setGenerating(true);
    setMessage({ text: "Creating playlist...", type: "info" });
    try {
      const ids = searchResults.map((r) => r.video_id).filter(Boolean);
      const res = await api.generatePlaylist(genName, ids, "Generated from search");
      setMessage({ text: `Created playlist: ${res.playlist_id}`, type: "success" });
      setGenName("");
      setSearchResults([]);
      await loadAll();
    } catch (e: any) {
      setMessage({ text: "Generate error: " + e.message, type: "error" });
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
    }
  }

  async function handleHeadersSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!headersInput.trim()) {
      setMessage({ text: "Please paste the cURL command or headers", type: "error" });
      return;
    }
    setHeadersSubmitting(true);
    setMessage({ text: "Authenticating...", type: "info" });
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
    if (!confirm(`Delete "${title}"? This cannot be undone.`)) return;
    setMessage({ text: `Deleting "${title}"...`, type: "info" });
    try {
      await api.deletePlaylist(playlistId);
      setMessage({ text: `Deleted "${title}"`, type: "success" });
      await loadAll();
    } catch (err: any) {
      setMessage({ text: "Delete error: " + err.message, type: "error" });
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-3 text-zinc-500">
          <div className="w-5 h-5 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
          Loading...
        </div>
      </div>
    );
  }

  const isAuthenticated = health?.authenticated;

  return (
    <div className="space-y-6">
      {/* Message Alert */}
      {message && (
        <Alert
          variant={message.type}
          onClose={() => setMessage(null)}
        >
          <div className="flex-1">
            <p>{message.text}</p>
            {message.link && (
              <a
                href={message.link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 mt-2 text-sm font-medium underline opacity-80 hover:opacity-100"
              >
                {message.link.text}
                <ExternalLinkIcon className="w-4 h-4" />
              </a>
            )}
          </div>
        </Alert>
      )}

      {/* Auth Required State */}
      {!isAuthenticated ? (
        <div className="max-w-2xl mx-auto">
          <Card className="border-rose-500/20">
            <CardContent className="text-center py-12">
              <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-rose-500/20 to-orange-500/20 flex items-center justify-center">
                <MusicIcon className="w-10 h-10 text-rose-400" />
              </div>
              <h2 className="font-display text-3xl font-bold mb-3">Connect to YouTube Music</h2>
              <p className="text-zinc-400 mb-8 max-w-md mx-auto">
                To use YTMusicianship, you need to authenticate with your YouTube Music account.
              </p>

              {/* Auth Method */}
              <form onSubmit={handleHeadersSubmit} className="text-left space-y-4">
                <div className="bg-zinc-950/50 rounded-xl p-4 space-y-3">
                  <h3 className="font-semibold text-zinc-300 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-violet-500/20 text-violet-400 flex items-center justify-center text-sm">1</span>
                    Copy headers from your browser
                  </h3>
                  <ol className="text-sm text-zinc-500 space-y-1 ml-8">
                    <li>Go to <a href="https://music.youtube.com" target="_blank" rel="noopener noreferrer" className="text-violet-400 hover:underline">music.youtube.com</a> and sign in</li>
                    <li>Press F12 → Network tab</li>
                    <li>Click on any request, then right-click → Copy as cURL (bash)</li>
                    <li>Paste below</li>
                  </ol>
                </div>

                <textarea
                  value={headersInput}
                  onChange={(e) => setHeadersInput(e.target.value)}
                  placeholder="curl 'https://music.youtube.com/...' -H 'cookie: ...'"
                  rows={5}
                  className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-3 text-sm font-mono text-zinc-300 placeholder:text-zinc-600 focus:outline-none focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/20"
                />

                <Button
                  type="submit"
                  isLoading={headersSubmitting}
                  disabled={!headersInput.trim()}
                  className="w-full"
                >
                  Authenticate
                </Button>

                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-white/10" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-zinc-900 px-2 text-zinc-500">Or</span>
                  </div>
                </div>

                <label className="block">
                  <input type="file" className="hidden" onChange={handleAuthUpload} />
                  <div className="w-full py-3 px-4 rounded-xl border border-dashed border-white/20 text-center text-sm text-zinc-400 hover:border-violet-500/50 hover:text-zinc-300 transition-colors cursor-pointer">
                    Upload oauth.json file
                  </div>
                </label>
              </form>
            </CardContent>
          </Card>
        </div>
      ) : (
        <>
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <Badge variant="success">Authenticated</Badge>
              <p className="mt-2 text-zinc-400">Ready to shuffle, discover, and create.</p>
            </div>
            <Link to="/musicmatch">
              <Button>
                <SparklesIcon className="w-4 h-4 mr-2" />
                MusicMatch
              </Button>
            </Link>
          </div>

          {/* Main Grid */}
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Playlists Column */}
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 flex items-center justify-center">
                      <MusicIcon className="w-5 h-5 text-violet-400" />
                    </div>
                    <div>
                      <h3 className="font-display font-semibold text-lg">Your Playlists</h3>
                      <p className="text-sm text-zinc-500">{playlists.length} playlists</p>
                    </div>
                  </div>
                  {selectedForShuffle.size >= 2 && (
                    <Button
                      size="sm"
                      onClick={handleShuffleMultiple}
                      isLoading={shufflingMultiple}
                    >
                      <ShuffleIcon className="w-4 h-4 mr-2" />
                      Shuffle {selectedForShuffle.size}
                    </Button>
                  )}
                </CardHeader>
                <CardContent className="p-0">
                  {selectedForShuffle.size > 0 && (
                    <div className="px-6 py-3 bg-violet-500/5 border-b border-white/5 flex items-center justify-between">
                      <span className="text-sm text-violet-300">
                        {selectedForShuffle.size} selected
                      </span>
                      <button
                        onClick={() => setSelectedForShuffle(new Set())}
                        className="text-sm text-zinc-500 hover:text-zinc-300"
                      >
                        Clear
                      </button>
                    </div>
                  )}
                  <div className="max-h-[500px] overflow-auto">
                    {playlists.length === 0 ? (
                      <EmptyState
                        icon={<MusicIcon className="w-8 h-8" />}
                        title="No playlists"
                        description="Create your first playlist to get started"
                      />
                    ) : (
                      <div className="divide-y divide-white/[0.04]">
                        {playlists.map((pl) => (
                          <div
                            key={pl.playlist_id}
                            className="flex items-center gap-4 px-6 py-4 hover:bg-white/[0.02] transition-colors group"
                          >
                            <input
                              type="checkbox"
                              checked={selectedForShuffle.has(pl.playlist_id)}
                              onChange={() => toggleShuffleSelection(pl.playlist_id)}
                              className="w-5 h-5 rounded-lg border-white/20 bg-zinc-950 text-violet-600 focus:ring-violet-500/20"
                            />
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">{pl.title}</p>
                              <p className="text-sm text-zinc-500">{pl.count ? `${pl.count} tracks` : "Empty"}</p>
                            </div>
                            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => handleShuffle(pl.playlist_id, pl.title)}
                              >
                                <ShuffleIcon className="w-4 h-4" />
                              </Button>
                              <Link to={`/playlist/${encodeURIComponent(pl.playlist_id)}`}>
                                <Button size="sm" variant="secondary">Open</Button>
                              </Link>
                              {pl.title !== "Liked Music" && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleDeletePlaylist(pl.playlist_id, pl.title)}
                                  className="text-rose-400 hover:text-rose-300"
                                >
                                  <TrashIcon className="w-4 h-4" />
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Quick Generator */}
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center">
                      <SearchIcon className="w-5 h-5 text-cyan-400" />
                    </div>
                    <div>
                      <h3 className="font-display font-semibold text-lg">Quick Playlist Generator</h3>
                      <p className="text-sm text-zinc-500">Search and create instantly</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <Input
                        placeholder="Search for songs..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                      />
                    </div>
                    <Button onClick={handleSearch}>
                      <SearchIcon className="w-4 h-4" />
                    </Button>
                  </div>

                  {searchResults.length > 0 && (
                    <div className="space-y-3">
                      <div className="text-sm text-zinc-500">Search results:</div>
                      <div className="space-y-2">
                        {searchResults.map((r) => (
                          <ListItem key={r.video_id}>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">{r.title}</p>
                              <p className="text-sm text-zinc-500">{r.artist}</p>
                            </div>
                          </ListItem>
                        ))}
                      </div>
                      <div className="flex gap-3 pt-2">
                        <Input
                          placeholder="Playlist name"
                          value={genName}
                          onChange={(e) => setGenName(e.target.value)}
                        />
                        <Button
                          onClick={handleGenerate}
                          isLoading={generating}
                          disabled={!genName.trim()}
                        >
                          Create
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Top Songs */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center">
                        <TrophyIcon className="w-5 h-5 text-amber-400" />
                      </div>
                      <h3 className="font-display font-semibold text-lg">Top Songs</h3>
                    </div>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={handleSyncHistory}
                      isLoading={syncing}
                    >
                      <RefreshIcon className="w-4 h-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="max-h-[300px] overflow-auto">
                    {topSongs.length === 0 ? (
                      <div className="p-6 text-center">
                        <p className="text-sm text-zinc-500">No rankings yet</p>
                        <p className="text-xs text-zinc-600 mt-1">Sync history to build rankings</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-white/[0.04]">
                        {topSongs.slice(0, 10).map((s, i) => (
                          <div key={i} className="flex items-center gap-3 px-6 py-3">
                            <span className="w-6 text-center text-sm font-bold text-zinc-600">{i + 1}</span>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm truncate">{s.entity_name}</p>
                              <p className="text-xs text-zinc-500">{s.play_count} plays</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Recent Likes */}
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500/20 to-pink-500/20 flex items-center justify-center">
                      <HeartIcon className="w-5 h-5 text-rose-400" />
                    </div>
                    <h3 className="font-display font-semibold text-lg">Recent Likes</h3>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="max-h-[300px] overflow-auto">
                    <div className="divide-y divide-white/[0.04]">
                      {liked.slice(0, 10).map((t) => (
                        <a
                          key={t.video_id}
                          href={`https://music.youtube.com/watch?v=${t.video_id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-3 px-6 py-3 hover:bg-white/[0.02] transition-colors group"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{t.title}</p>
                            <p className="text-xs text-zinc-500 truncate">{t.artist}</p>
                          </div>
                          <ExternalLinkIcon className="w-4 h-4 text-zinc-600 group-hover:text-zinc-400" />
                        </a>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
