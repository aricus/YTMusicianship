import { useEffect, useState, useMemo } from "react";
import { api } from "../api";
import type { Playlist } from "../types";
import {
  Button,
  Card,
  CardHeader,
  CardContent,
  Badge,
  Input,
  Alert,
  Toggle,
  Slider
} from "../components/ui";

// Icons
function SparklesIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
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

function ExternalLinkIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
    </svg>
  );
}

function ChevronDownIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  );
}

function ChevronUpIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
    </svg>
  );
}

interface Artist {
  name: string;
  count: number;
}

interface AISettings {
  ai_base_url: string;
  ai_api_key: string;
  ai_model: string;
}

interface TasteProfile {
  top_songs: { name: string; score: number; plays: number }[];
  top_artists: { name: string; score: number }[];
  liked_artists: { name: string; count: number }[];
  total_liked_songs: number;
}

interface SelectionBreakdown {
  from_direct_selections: string;
  from_taste_profile: string;
  key_influences: string[];
  vibe_elements?: string[];
}

export default function MusicMatchPage() {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{
    text: string;
    type: "info" | "success" | "error";
    link?: { url: string; text: string };
    aiReasoning?: string;
    aiGeneratedName?: string;
    vibeDetected?: string;
    selectionBreakdown?: SelectionBreakdown;
  } | null>(null);

  const [aiSettings, setAiSettings] = useState<AISettings | null>(null);
  const [useAI, setUseAI] = useState(false);
  const [tasteProfile, setTasteProfile] = useState<TasteProfile | null>(null);
  const [showTasteProfile, setShowTasteProfile] = useState(false);
  const [selectedPlaylists, setSelectedPlaylists] = useState<Set<string>>(new Set());
  const [selectedArtists, setSelectedArtists] = useState<Set<string>>(new Set());
  const [playlistSearch, setPlaylistSearch] = useState("");
  const [artistSearch, setArtistSearch] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [mode, setMode] = useState<"exact" | "search" | "auto">("auto");
  const [selectionWeight, setSelectionWeight] = useState(50);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [pl, art, ai, taste] = await Promise.all([
        api.getPlaylists(),
        api.getLikedArtists(),
        api.getAISettings(),
        api.getTasteProfile(),
      ]);
      setPlaylists(pl.playlists || []);
      setArtists(art.artists || []);
      setAiSettings(ai);
      setTasteProfile(taste);
    } catch (err: any) {
      setMessage({ text: "Error loading data: " + err.message, type: "error" });
    } finally {
      setLoading(false);
    }
  }

  const aiConfigured = aiSettings?.ai_base_url && aiSettings?.ai_api_key;

  const filteredPlaylists = useMemo(() => {
    if (!playlistSearch.trim()) return playlists;
    const q = playlistSearch.toLowerCase();
    return playlists.filter(p => p.title.toLowerCase().includes(q));
  }, [playlists, playlistSearch]);

  const filteredArtists = useMemo(() => {
    if (!artistSearch.trim()) return artists;
    const q = artistSearch.toLowerCase();
    return artists.filter(a => a.name.toLowerCase().includes(q));
  }, [artists, artistSearch]);

  function togglePlaylist(id: string) {
    setSelectedPlaylists(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleArtist(name: string) {
    setSelectedArtists(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  function selectAllPlaylists() {
    setSelectedPlaylists(new Set(filteredPlaylists.map(p => p.playlist_id)));
  }

  function deselectAllPlaylists() {
    setSelectedPlaylists(new Set());
  }

  function selectAllArtists() {
    setSelectedArtists(new Set(filteredArtists.map(a => a.name)));
  }

  function deselectAllArtists() {
    setSelectedArtists(new Set());
  }

  async function handleGenerate() {
    if (!useAI && !name.trim()) {
      setMessage({ text: "Please enter a playlist name or enable AI", type: "error" });
      return;
    }

    if (!selectedPlaylists.size && !selectedArtists.size) {
      setMessage({ text: "Please select at least one playlist or artist", type: "error" });
      return;
    }

    if (useAI && !aiConfigured) {
      setMessage({ text: "AI not configured. Please set up AI settings first.", type: "error" });
      return;
    }

    setGenerating(true);
    setMessage({
      text: useAI ? "AI is analyzing your taste and generating recommendations..." : "Generating playlist...",
      type: "info"
    });

    try {
      const res = await api.musicmatch({
        source_playlist_ids: Array.from(selectedPlaylists),
        source_artists: Array.from(selectedArtists),
        name: name.trim(),
        description: description.trim(),
        mode,
        use_ai: useAI,
        selection_weight: selectionWeight,
      });

      if (res.status === "ok") {
        const playlistUrl = `https://music.youtube.com/playlist?list=${res.playlist_id}`;
        const finalName = res.playlist_name || name;
        setMessage({
          text: `Created "${finalName}" with ${res.tracks.length} tracks!`,
          type: "success",
          link: { url: playlistUrl, text: "Open in YouTube Music" },
          aiReasoning: res.ai_reasoning,
          aiGeneratedName: res.ai_generated_name,
          vibeDetected: res.vibe_detected,
          selectionBreakdown: res.selection_breakdown,
        });
        setSelectedPlaylists(new Set());
        setSelectedArtists(new Set());
        setName("");
        setDescription("");
      } else {
        setMessage({ text: "Error: " + (res.message || "Unknown error"), type: "error" });
      }
    } catch (err: any) {
      setMessage({ text: "Error: " + err.message, type: "error" });
    } finally {
      setGenerating(false);
    }
  }

  const totalSelected = selectedPlaylists.size + selectedArtists.size;

  // Skeleton component for loading state
  const SkeletonItem = () => (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-zinc-950/50 border border-white/5 animate-pulse">
      <div className="w-5 h-5 rounded-lg bg-zinc-800" />
      <div className="flex-1 min-w-0 space-y-2">
        <div className="h-4 bg-zinc-800 rounded w-3/4" />
        <div className="h-3 bg-zinc-800/50 rounded w-1/2" />
      </div>
    </div>
  );

  const SkeletonHeader = () => (
    <div className="flex items-center gap-3 animate-pulse">
      <div className="w-10 h-10 rounded-xl bg-zinc-800" />
      <div className="space-y-2">
        <div className="h-5 bg-zinc-800 rounded w-32" />
        <div className="h-3 bg-zinc-800/50 rounded w-20" />
      </div>
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center py-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 mb-4">
          <SparklesIcon className="w-8 h-8 text-fuchsia-400" />
        </div>
        <h1 className="font-display text-4xl font-bold bg-gradient-to-r from-white via-violet-200 to-fuchsia-200 bg-clip-text text-transparent">
          MusicMatch
        </h1>
        <p className="mt-2 text-zinc-400 max-w-lg mx-auto">
          AI-powered playlist generation that captures the "vibe" of your selections.
          Discover songs that match the feeling, not just the genre.
        </p>
      </div>

      {/* Message */}
      {message && (
        <Alert variant={message.type} onClose={() => setMessage(null)}>
          <div className="space-y-3 w-full">
            <p>{message.text}</p>

            {message.vibeDetected && (
              <div className="pt-3 border-t border-white/10">
                <p className="text-sm font-medium text-zinc-400 mb-1">Vibe Detected</p>
                <p className="text-lg font-semibold italic text-fuchsia-300">
                  "{message.vibeDetected}"
                </p>
              </div>
            )}

            {message.selectionBreakdown && (
              <div className="pt-3 border-t border-white/10">
                <p className="text-sm font-medium text-zinc-400 mb-2">How it was made</p>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-zinc-500">From selections:</span>
                    <span className="ml-2">{message.selectionBreakdown.from_direct_selections}</span>
                  </div>
                  <div>
                    <span className="text-zinc-500">From taste profile:</span>
                    <span className="ml-2">{message.selectionBreakdown.from_taste_profile}</span>
                  </div>
                </div>
                {message.selectionBreakdown.vibe_elements && message.selectionBreakdown.vibe_elements.length > 0 && (
                  <div className="mt-2">
                    <span className="text-zinc-500 text-sm">Vibe elements: </span>
                    <span className="text-fuchsia-300">
                      {message.selectionBreakdown.vibe_elements.join(", ")}
                    </span>
                  </div>
                )}
              </div>
            )}

            {message.aiReasoning && (
              <div className="pt-3 border-t border-white/10">
                <p className="text-sm font-medium text-zinc-400 mb-1">AI Reasoning</p>
                <p className="text-sm text-zinc-300">{message.aiReasoning}</p>
              </div>
            )}

            {message.link && (
              <a
                href={message.link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 mt-2 text-violet-400 hover:text-violet-300 font-medium"
              >
                {message.link.text}
                <ExternalLinkIcon className="w-4 h-4" />
              </a>
            )}
          </div>
        </Alert>
      )}

      {/* AI Toggle */}
      <Card className="border-violet-500/20">
        <CardContent className="py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${
                useAI ? 'bg-violet-500/20' : 'bg-zinc-800'
              }`}>
                <SparklesIcon className={`w-6 h-6 transition-colors ${useAI ? 'text-violet-400' : 'text-zinc-500'}`} />
              </div>
              <div>
                <h3 className="font-display font-semibold text-lg">AI Recommendations</h3>
                <div className="text-sm">
                  {useAI ? (
                    <div className="space-y-1">
                      <p className="text-violet-400 font-medium">AI is ON</p>
                      <p className="text-zinc-500">Will analyze the vibe of your selections for intelligent recommendations</p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <p className="text-zinc-400 font-medium">AI is OFF</p>
                      <p className="text-zinc-500">Simple shuffle and combine from selected sources only</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <Toggle checked={useAI} onChange={setUseAI} />
          </div>

          {!aiConfigured && useAI && (
            <div className="mt-4 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-200 text-sm">
              AI not configured. Go to Settings to set up your AI provider.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Taste Profile */}
      {useAI && tasteProfile && (
        <Card>
          <button
            onClick={() => setShowTasteProfile(!showTasteProfile)}
            className="w-full"
          >
            <CardHeader>
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center">
                    <UserIcon className="w-5 h-5 text-amber-400" />
                  </div>
                  <div>
                    <h3 className="font-display font-semibold">Taste Profile</h3>
                    <p className="text-sm text-zinc-500">What the AI knows about you</p>
                  </div>
                </div>
                {showTasteProfile ? (
                  <ChevronUpIcon className="w-5 h-5 text-zinc-500" />
                ) : (
                  <ChevronDownIcon className="w-5 h-5 text-zinc-500" />
                )}
              </div>
            </CardHeader>
          </button>

          {showTasteProfile && (
            <CardContent>
              <div className="grid md:grid-cols-3 gap-6">
                <div>
                  <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Top Artists</p>
                  <div className="space-y-2">
                    {tasteProfile.top_artists.slice(0, 5).map((a, i) => (
                      <div key={a.name} className="flex items-center justify-between text-sm">
                        <span className="text-zinc-300">{i + 1}. {a.name}</span>
                        <span className="text-zinc-600">{Math.round(a.score)}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Top Songs</p>
                  <div className="space-y-2">
                    {tasteProfile.top_songs.slice(0, 5).map((s, i) => (
                      <div key={s.name} className="text-sm text-zinc-300 truncate" title={s.name}>
                        {i + 1}. {s.name.split(" — ")[0]}
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">
                    Liked Artists ({tasteProfile.total_liked_songs})
                  </p>
                  <div className="space-y-2">
                    {tasteProfile.liked_artists.slice(0, 5).map((a, i) => (
                      <div key={a.name} className="flex items-center justify-between text-sm">
                        <span className="text-zinc-300">{i + 1}. {a.name}</span>
                        <span className="text-zinc-600">{a.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          )}
        </Card>
      )}

      {/* Selection Weight */}
      {useAI && (
        <Card>
          <CardContent className="py-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-display font-semibold">Recommendation Focus</h3>
                <p className="text-sm text-zinc-500">
                  Balance between your explicit selections and taste profile exploration
                </p>
              </div>
              <Badge>
                {selectionWeight}% Selections / {100 - selectionWeight}% Discovery
              </Badge>
            </div>

            <Slider
              min={0}
              max={100}
              value={selectionWeight}
              onChange={setSelectionWeight}
            />

            <div className="flex justify-between mt-2 text-xs text-zinc-500">
              <span>More Discovery</span>
              <span>Balanced</span>
              <span>Strict Selections</span>
            </div>

            <p className="mt-4 text-sm text-zinc-400">
              {selectionWeight < 30 && "AI will explore broadly based on your general taste, with light influence from your selections."}
              {selectionWeight >= 30 && selectionWeight < 70 && "AI balances your explicit selections with discoveries from your taste profile."}
              {selectionWeight >= 70 && "AI heavily prioritizes your selected playlists/artists, staying close to what you picked."}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Selection Grid */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Playlists */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between w-full">
              {loading ? (
                <SkeletonHeader />
              ) : (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 flex items-center justify-center">
                    <MusicIcon className="w-5 h-5 text-violet-400" />
                  </div>
                  <div>
                    <h3 className="font-display font-semibold">Playlists</h3>
                    <p className="text-sm text-zinc-500">{selectedPlaylists.size} selected</p>
                  </div>
                </div>
              )}
              {!loading && (
                <div className="flex gap-2">
                  <Button size="sm" variant="ghost" onClick={selectAllPlaylists}>All</Button>
                  <Button size="sm" variant="ghost" onClick={deselectAllPlaylists}>None</Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              placeholder="Search playlists..."
              value={playlistSearch}
              onChange={(e) => setPlaylistSearch(e.target.value)}
              disabled={loading}
            />
            <div className="max-h-64 overflow-auto space-y-2">
              {loading ? (
                <>
                  <SkeletonItem />
                  <SkeletonItem />
                  <SkeletonItem />
                  <SkeletonItem />
                  <SkeletonItem />
                </>
              ) : (
                <>
                  {filteredPlaylists.length === 0 && (
                    <p className="text-sm text-zinc-500 text-center py-4">No playlists found</p>
                  )}
                  {filteredPlaylists.map((pl) => (
                <label
                  key={pl.playlist_id}
                  className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                    selectedPlaylists.has(pl.playlist_id)
                      ? 'bg-violet-500/10 border-violet-500/30'
                      : 'bg-zinc-950/50 border-white/5 hover:border-white/10'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedPlaylists.has(pl.playlist_id)}
                    onChange={() => togglePlaylist(pl.playlist_id)}
                    className="w-5 h-5 rounded-lg border-white/20 bg-zinc-950 text-violet-600"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{pl.title}</p>
                    <p className="text-xs text-zinc-500">{pl.count} tracks</p>
                  </div>
                </label>
              ))}
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Artists */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between w-full">
              {loading ? (
                <SkeletonHeader />
              ) : (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center">
                    <UserIcon className="w-5 h-5 text-cyan-400" />
                  </div>
                  <div>
                    <h3 className="font-display font-semibold">Artists from Likes</h3>
                    <p className="text-sm text-zinc-500">{selectedArtists.size} selected</p>
                  </div>
                </div>
              )}
              {!loading && (
                <div className="flex gap-2">
                  <Button size="sm" variant="ghost" onClick={selectAllArtists}>All</Button>
                  <Button size="sm" variant="ghost" onClick={deselectAllArtists}>None</Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              placeholder="Search artists..."
              value={artistSearch}
              onChange={(e) => setArtistSearch(e.target.value)}
              disabled={loading}
            />
            <div className="max-h-64 overflow-auto space-y-2">
              {loading ? (
                <>
                  <SkeletonItem />
                  <SkeletonItem />
                  <SkeletonItem />
                  <SkeletonItem />
                  <SkeletonItem />
                </>
              ) : (
                <>
                  {filteredArtists.length === 0 && (
                    <p className="text-sm text-zinc-500 text-center py-4">No artists found</p>
                  )}
                  {filteredArtists.map((artist) => (
                <label
                  key={artist.name}
                  className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                    selectedArtists.has(artist.name)
                      ? 'bg-cyan-500/10 border-cyan-500/30'
                      : 'bg-zinc-950/50 border-white/5 hover:border-white/10'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedArtists.has(artist.name)}
                    onChange={() => toggleArtist(artist.name)}
                    className="w-5 h-5 rounded-lg border-white/20 bg-zinc-950 text-cyan-600"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{artist.name}</p>
                    <p className="text-xs text-zinc-500">{artist.count} liked songs</p>
                  </div>
                </label>
              ))}
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Settings & Generate */}
      <Card>
        <CardContent className="py-6">
          <div className="grid md:grid-cols-2 gap-6 mb-6">
            <Input
              label={useAI ? "Playlist Name (optional)" : "Playlist Name *"}
              placeholder={useAI ? "Leave blank for AI-generated name" : "My Mix"}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <Input
              label="Description (optional)"
              placeholder="AI-generated playlist"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="mb-6">
            <p className="text-sm font-medium text-zinc-400 mb-3">Mode</p>
            <div className="flex gap-2">
              {(["exact", "search", "auto"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium capitalize transition-all ${
                    mode === m
                      ? 'bg-violet-600 text-white'
                      : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
            <p className="mt-2 text-sm text-zinc-500">
              {useAI
                ? "Exact = match your taste closely • Search = discover new similar songs • Auto = balance"
                : "Exact = songs from sources • Auto = simple mix"}
            </p>
          </div>

          <div className="flex items-center justify-between">
            <p className="text-zinc-400">
              {loading ? "Loading data..." : totalSelected === 0 ? "Select at least one source" : `${totalSelected} source(s) selected`}
            </p>
            <Button
              onClick={handleGenerate}
              isLoading={generating}
              disabled={loading || totalSelected === 0 || (!useAI && !name.trim())}
              size="lg"
            >
              {useAI ? (
                <>
                  <SparklesIcon className="w-5 h-5 mr-2" />
                  Generate with AI
                </>
              ) : (
                "Generate Playlist"
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
