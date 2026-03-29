import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import type { Playlist } from "../types";

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

  // AI settings
  const [aiSettings, setAiSettings] = useState<AISettings | null>(null);
  const [useAI, setUseAI] = useState(false);

  // Taste Profile
  const [tasteProfile, setTasteProfile] = useState<TasteProfile | null>(null);
  const [showTasteProfile, setShowTasteProfile] = useState(false);

  // Selection states
  const [selectedPlaylists, setSelectedPlaylists] = useState<Set<string>>(new Set());
  const [selectedArtists, setSelectedArtists] = useState<Set<string>>(new Set());

  // Search states
  const [playlistSearch, setPlaylistSearch] = useState("");
  const [artistSearch, setArtistSearch] = useState("");

  // Generation settings
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

  // Filtered lists based on search
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
    // When not using AI, name is required
    if (!useAI && !name.trim()) {
      setMessage({ text: "Please enter a playlist name or enable AI to auto-generate one", type: "error" });
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
    setMessage({ text: useAI ? "AI is analyzing your taste and generating recommendations... (this may take 1-3 minutes)" : "Generating playlist...", type: "info" });

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
        // Clear selections
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

  if (loading) {
    return <div className="text-gray-400">Loading...</div>;
  }

  const totalSelected = selectedPlaylists.size + selectedArtists.size;

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
          {message.aiGeneratedName && (
            <div className="text-sm mt-1 italic">
              AI named this playlist: "{message.aiGeneratedName}"
            </div>
          )}
          {message.vibeDetected && (
            <div className="text-sm mt-2 pt-2 border-t border-emerald-500/30">
              <span className="font-medium">Vibe Detected:</span>{" "}
              <span className="italic text-emerald-200">{message.vibeDetected}</span>
            </div>
          )}
          {message.selectionBreakdown && (
            <div className="text-sm mt-2 pt-2 border-t border-emerald-500/30">
              <span className="font-medium">Selection Breakdown:</span>
              <div className="mt-1">• {message.selectionBreakdown.from_direct_selections} from your selections</div>
              <div>• {message.selectionBreakdown.from_taste_profile} from taste profile exploration</div>
              {message.selectionBreakdown.vibe_elements && message.selectionBreakdown.vibe_elements.length > 0 && (
                <div className="mt-1 text-xs text-gray-400">
                  Vibe elements: {message.selectionBreakdown.vibe_elements.join(", ")}
                </div>
              )}
              <div className="mt-1 text-xs text-gray-400">
                Key influences: {message.selectionBreakdown.key_influences?.join(", ") || "N/A"}
              </div>
            </div>
          )}
          {message.aiReasoning && (
            <div className="text-sm mt-2 pt-2 border-t border-emerald-500/30">
              <span className="font-medium">AI Reasoning:</span> {message.aiReasoning}
            </div>
          )}
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

      <section className="rounded-xl border border-gray-700 bg-gray-800 p-6">
        <h1 className="text-2xl font-semibold mb-2">MusicMatch</h1>
        <p className="text-gray-400 mb-6">
          Generate playlists by combining your favorite playlists and artists. Enable AI to analyze the "vibe" or "feel" of your selections and find songs that match that emotional quality.
        </p>

        {/* AI Toggle */}
        <div className="mb-6 p-4 rounded-lg bg-indigo-900/20 border border-indigo-700/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${useAI ? "bg-indigo-600" : "bg-gray-600"}`}>
                <button
                  onClick={() => setUseAI(!useAI)}
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${useAI ? "translate-x-6" : "translate-x-1"}`}
                />
              </div>
              <div>
                <div className="font-medium text-indigo-200">Use AI Recommendations</div>
                <div className="text-xs text-gray-400">
                  {useAI
                    ? "AI analyzes the 'vibe' of your selections to find songs that match the feeling"
                    : "Simple shuffle and combine from selected sources"}
                </div>
              </div>
            </div>
            {!aiConfigured && (
              <Link
                to="/settings"
                className="text-xs text-rose-400 hover:text-rose-300 underline"
              >
                AI not configured →
              </Link>
            )}
          </div>
        </div>

        {/* Taste Profile Toggle */}
        {useAI && tasteProfile && (
          <div className="mb-6">
            <button
              onClick={() => setShowTasteProfile(!showTasteProfile)}
              className="flex items-center gap-2 text-sm text-indigo-400 hover:text-indigo-300"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d={showTasteProfile ? "M19.5 8.25l-7.5 7.5-7.5-7.5" : "M8.25 4.5l7.5 7.5-7.5 7.5"} />
              </svg>
              {showTasteProfile ? "Hide Taste Profile" : "Show Taste Profile (what AI knows about you)"}
            </button>

            {showTasteProfile && (
              <div className="mt-3 p-4 rounded-lg bg-gray-900 border border-gray-700">
                <h3 className="text-sm font-medium mb-3 text-gray-300">Your Taste Profile</h3>
                <div className="grid gap-4 md:grid-cols-3 text-sm">
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Top Artists (by plays)</div>
                    <div className="space-y-1">
                      {tasteProfile.top_artists.slice(0, 5).map((a, i) => (
                        <div key={a.name} className="flex justify-between">
                          <span className="truncate">{i + 1}. {a.name}</span>
                          <span className="text-gray-500 text-xs">{Math.round(a.score)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Top Songs</div>
                    <div className="space-y-1">
                      {tasteProfile.top_songs.slice(0, 5).map((s, i) => (
                        <div key={s.name} className="truncate" title={s.name}>
                          {i + 1}. {s.name.split(" — ")[0]}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Liked Artists ({tasteProfile.total_liked_songs} total likes)</div>
                    <div className="space-y-1">
                      {tasteProfile.liked_artists.slice(0, 5).map((a, i) => (
                        <div key={a.name} className="flex justify-between">
                          <span className="truncate">{i + 1}. {a.name}</span>
                          <span className="text-gray-500 text-xs">{a.count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-3">
                  This data helps the AI understand your taste. You can influence the recommendations by selecting specific playlists/artists below.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Selection Weight Slider - AI Mode Only */}
        {useAI && (
          <div className="mb-6 p-4 rounded-lg bg-gray-900 border border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-300">Recommendation Focus</label>
              <span className="text-xs text-indigo-400">{selectionWeight}% Selections / {100 - selectionWeight}% Discovery</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={selectionWeight}
              onChange={(e) => setSelectionWeight(Number(e.target.value))}
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>More Discovery</span>
              <span>Balanced</span>
              <span>Strict Selections</span>
            </div>
            <p className="text-xs text-gray-400 mt-2">
              {selectionWeight < 30 && "AI will explore broadly based on your general taste, with light influence from your selections."}
              {selectionWeight >= 30 && selectionWeight < 70 && "AI balances your explicit selections with discoveries from your taste profile."}
              {selectionWeight >= 70 && "AI heavily prioritizes your selected playlists/artists, staying close to what you picked."}
            </p>
          </div>
        )}

        <div className="grid gap-6 md:grid-cols-2 mb-6">
          {/* Playlists Selection */}
          <div className="p-4 rounded-lg bg-gray-900 border border-gray-700">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-medium">Playlists</h2>
              <div className="flex gap-2">
                <button
                  onClick={selectAllPlaylists}
                  className="text-xs text-indigo-400 hover:text-indigo-300"
                >
                  All
                </button>
                <button
                  onClick={deselectAllPlaylists}
                  className="text-xs text-gray-500 hover:text-gray-400"
                >
                  None
                </button>
              </div>
            </div>
            <input
              type="text"
              value={playlistSearch}
              onChange={(e) => setPlaylistSearch(e.target.value)}
              placeholder="Search playlists..."
              className="w-full rounded border border-gray-600 bg-gray-800 px-3 py-2 text-sm outline-none focus:border-indigo-500 mb-3"
            />
            <div className="space-y-1 max-h-64 overflow-auto">
              {filteredPlaylists.length === 0 && (
                <div className="text-gray-500 text-sm">No playlists found</div>
              )}
              {filteredPlaylists.map((pl) => (
                <label
                  key={pl.playlist_id}
                  className="flex items-center gap-2 p-2 rounded hover:bg-gray-800 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedPlaylists.has(pl.playlist_id)}
                    onChange={() => togglePlaylist(pl.playlist_id)}
                    className="rounded border-gray-600"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm truncate">{pl.title}</div>
                    <div className="text-xs text-gray-500">{pl.count} tracks</div>
                  </div>
                </label>
              ))}
            </div>
            <div className="mt-2 text-xs text-gray-500">
              {selectedPlaylists.size} selected
            </div>
          </div>

          {/* Artists Selection */}
          <div className="p-4 rounded-lg bg-gray-900 border border-gray-700">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-medium">Artists from Likes</h2>
              <div className="flex gap-2">
                <button
                  onClick={selectAllArtists}
                  className="text-xs text-indigo-400 hover:text-indigo-300"
                >
                  All
                </button>
                <button
                  onClick={deselectAllArtists}
                  className="text-xs text-gray-500 hover:text-gray-400"
                >
                  None
                </button>
              </div>
            </div>
            <input
              type="text"
              value={artistSearch}
              onChange={(e) => setArtistSearch(e.target.value)}
              placeholder="Search artists..."
              className="w-full rounded border border-gray-600 bg-gray-800 px-3 py-2 text-sm outline-none focus:border-indigo-500 mb-3"
            />
            <div className="space-y-1 max-h-64 overflow-auto">
              {filteredArtists.length === 0 && (
                <div className="text-gray-500 text-sm">No artists found</div>
              )}
              {filteredArtists.map((artist) => (
                <label
                  key={artist.name}
                  className="flex items-center gap-2 p-2 rounded hover:bg-gray-800 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedArtists.has(artist.name)}
                    onChange={() => toggleArtist(artist.name)}
                    className="rounded border-gray-600"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm truncate">{artist.name}</div>
                    <div className="text-xs text-gray-500">{artist.count} liked songs</div>
                  </div>
                </label>
              ))}
            </div>
            <div className="mt-2 text-xs text-gray-500">
              {selectedArtists.size} selected
            </div>
          </div>
        </div>

        {/* Generation Settings */}
        <div className="p-4 rounded-lg bg-gray-900 border border-gray-700">
          <h2 className="text-lg font-medium mb-4">Playlist Settings</h2>
          <div className="grid gap-4 md:grid-cols-2 mb-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1">
                Playlist Name {useAI ? "(optional - AI will suggest)" : "*"}
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={useAI ? "Leave blank for AI-generated name" : "My Mix"}
                className="w-full rounded border border-gray-600 bg-gray-800 px-3 py-2 text-sm outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Description (optional)</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="AI-generated playlist"
                className="w-full rounded border border-gray-600 bg-gray-800 px-3 py-2 text-sm outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-xs text-gray-400 mb-2">Mode</label>
            <div className="flex gap-2">
              {(["exact", "search", "auto"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={`rounded px-3 py-1 text-xs font-medium capitalize ${
                    mode === m ? "bg-indigo-600 text-white" : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {useAI
                ? "Exact = match your taste closely • Search = discover new similar songs • Auto = balance"
                : "Exact = songs from sources • Search = not applicable without AI • Auto = simple mix"}
            </p>
          </div>

          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-400">
              {totalSelected === 0 ? "Select at least one source" : `${totalSelected} source(s) selected`}
            </div>
            <button
              onClick={handleGenerate}
              disabled={generating || totalSelected === 0 || (!useAI && !name.trim())}
              className="rounded bg-emerald-600 px-6 py-2 text-sm font-medium hover:bg-emerald-500 disabled:opacity-50"
            >
              {generating ? (useAI ? "AI is thinking..." : "Generating...") : (useAI ? "Generate with AI" : "Generate Playlist")}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
