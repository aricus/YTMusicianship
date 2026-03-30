import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../api";
import type { Track } from "../types";
import {
  Button,
  Card,
  CardHeader,
  CardContent,
  Input,
  Alert,
} from "../components/ui";

// Icons
function MusicIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
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

function SearchIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  );
}

function PlusIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
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

function ExternalLinkIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
    </svg>
  );
}


export default function PlaylistPage() {
  const { playlistId } = useParams<{ playlistId: string }>();
  const [tracks, setTracks] = useState<Track[]>([]);
  const [playlistName, setPlaylistName] = useState<string>("Playlist");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ text: string; type: "info" | "success" | "error" } | null>(null);
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
      const [tracksRes, playlistsRes] = await Promise.all([
        api.getPlaylistTracks(playlistId!, 5000),
        api.getPlaylists(),
      ]);
      setTracks(tracksRes.tracks || []);
      const pl = playlistsRes.playlists?.find((p: any) => p.playlist_id === playlistId);
      if (pl) {
        setPlaylistName(pl.title);
      }
    } catch (e: any) {
      setMessage({ text: "Error: " + e.message, type: "error" });
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
      setMessage({ text: "Track added", type: "success" });
      await loadTracks();
    } catch (e: any) {
      setMessage({ text: "Add error: " + e.message, type: "error" });
    }
  }

  async function handleRemoveSelected() {
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    try {
      await api.removeTracks(playlistId!, ids);
      setSelected(new Set());
      setMessage({ text: `Removed ${ids.length} track(s)`, type: "success" });
      await loadTracks();
    } catch (e: any) {
      setMessage({ text: "Remove error: " + e.message, type: "error" });
    }
  }

  async function handleRemoveTrack(videoId: string, title: string) {
    if (!confirm(`Remove "${title}" from playlist?`)) return;
    try {
      await api.removeTracks(playlistId!, [videoId]);
      setMessage({ text: `Removed "${title}"`, type: "success" });
      await loadTracks();
    } catch (e: any) {
      setMessage({ text: "Remove error: " + e.message, type: "error" });
    }
  }

  function toggleSelection(videoId: string) {
    const next = new Set(selected);
    if (next.has(videoId)) next.delete(videoId);
    else next.add(videoId);
    setSelected(next);
  }

  async function handleShuffle() {
    setMessage({ text: "Shuffling playlist...", type: "info" });
    try {
      await api.shufflePlaylist(playlistId!);
      setMessage({ text: "Playlist shuffled!", type: "success" });
    } catch (e: any) {
      setMessage({ text: "Shuffle error: " + e.message, type: "error" });
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

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 flex items-center justify-center">
            <MusicIcon className="w-6 h-6 text-violet-400" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold">{playlistName}</h1>
            <p className="text-zinc-500">{tracks.length} tracks</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={`https://music.youtube.com/playlist?list=${playlistId}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button variant="secondary">
              <ExternalLinkIcon className="w-4 h-4 mr-2" />
              Open in YT Music
            </Button>
          </a>
          <Button onClick={handleShuffle}>
            <ShuffleIcon className="w-4 h-4 mr-2" />
            True Shuffle
          </Button>
        </div>
      </div>

      {/* Message */}
      {message && (
        <Alert variant={message.type} onClose={() => setMessage(null)}>
          {message.text}
        </Alert>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Tracks List */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-3">
                  <h2 className="font-display font-semibold">Tracks</h2>
                  {selected.size > 0 && (
                    <span className="text-sm text-violet-400">{selected.size} selected</span>
                  )}
                </div>
                {selected.size > 0 && (
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={handleRemoveSelected}
                  >
                    <TrashIcon className="w-4 h-4 mr-2" />
                    Remove {selected.size}
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-[500px] overflow-auto">
                {tracks.length === 0 ? (
                  <div className="p-8 text-center">
                    <p className="text-zinc-500">No tracks in this playlist</p>
                    <p className="text-sm text-zinc-600 mt-1">Use the search to add songs</p>
                  </div>
                ) : (
                  <div className="divide-y divide-white/[0.04]">
                    {tracks.map((t) => (
                      <div
                        key={t.video_id + (t.set_video_id || "")}
                        className="flex items-center gap-4 px-6 py-3 hover:bg-white/[0.02] transition-colors group"
                      >
                        <input
                          type="checkbox"
                          checked={selected.has(t.video_id)}
                          onChange={() => toggleSelection(t.video_id)}
                          className="w-5 h-5 rounded-lg border-white/20 bg-zinc-950 text-violet-600"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{t.title}</p>
                          <p className="text-sm text-zinc-500">
                            {t.artist}
                            {t.duration && <span className="ml-2 text-zinc-600">• {t.duration}</span>}
                          </p>
                        </div>
                        <button
                          onClick={() => handleRemoveTrack(t.video_id, t.title)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-2 text-zinc-500 hover:text-rose-400"
                          title="Remove from playlist"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Add Songs */}
        <div>
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center">
                  <SearchIcon className="w-5 h-5 text-cyan-400" />
                </div>
                <h2 className="font-display font-semibold">Add Songs</h2>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                />
                <Button onClick={handleSearch}>
                  <SearchIcon className="w-4 h-4" />
                </Button>
              </div>

              <div className="space-y-2 max-h-[400px] overflow-auto">
                {searchResults.map((r) => (
                  <div
                    key={r.video_id}
                    className="flex items-center justify-between p-3 rounded-xl bg-zinc-950/50 border border-white/5 hover:border-white/10 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{r.title}</p>
                      <p className="text-xs text-zinc-500">{r.artist}</p>
                    </div>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleAdd(r.video_id)}
                    >
                      <PlusIcon className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
