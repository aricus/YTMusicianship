const API_BASE = "/api";

async function fetchJson(url: string, options?: RequestInit) {
  const res = await fetch(url, options);
  if (!res.ok) {
    const err = await res.text();
    throw new Error(err || `HTTP ${res.status}`);
  }
  return res.json();
}

export const api = {
  health: () => fetchJson(`${API_BASE}/health`),
  uploadAuth: (file: File) => {
    const form = new FormData();
    form.append("file", file);
    return fetchJson(`${API_BASE}/auth/upload`, { method: "POST", body: form });
  },

  getPlaylists: () => fetchJson(`${API_BASE}/playlists`),
  getPlaylistTracks: (playlistId: string, limit = 0) =>
    fetchJson(`${API_BASE}/playlists/${encodeURIComponent(playlistId)}/tracks?limit=${limit}`),
  createPlaylist: (name: string, description = "", trackIds: string[] = []) =>
    fetchJson(`${API_BASE}/playlists`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, description, track_ids: trackIds }),
    }),
  shufflePlaylist: (playlistId: string, targetName?: string) =>
    fetchJson(`${API_BASE}/playlists/${encodeURIComponent(playlistId)}/shuffle`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ target_name: targetName }),
    }),
  shuffleMultiplePlaylists: (playlistIds: string[], targetName?: string) =>
    fetchJson(`${API_BASE}/playlists/shuffle`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playlist_ids: playlistIds, target_name: targetName }),
    }),
  addTracks: (playlistId: string, videoIds: string[]) =>
    fetchJson(`${API_BASE}/playlists/${encodeURIComponent(playlistId)}/tracks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ video_ids: videoIds }),
    }),
  removeTracks: (playlistId: string, videoIds: string[]) =>
    fetchJson(`${API_BASE}/playlists/${encodeURIComponent(playlistId)}/tracks`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ video_ids: videoIds }),
    }),
  generatePlaylist: (name: string, trackIds: string[], description = "") =>
    fetchJson(`${API_BASE}/playlists/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, track_ids: trackIds, description }),
    }),
  search: (query: string, filter = "songs", limit = 20) =>
    fetchJson(`${API_BASE}/library/search?query=${encodeURIComponent(query)}&filter=${filter}&limit=${limit}`),
  getLikedSongs: (limit?: number) =>
    fetchJson(`${API_BASE}/library/likes${limit !== undefined ? `?limit=${limit}` : ""}`),
  syncHistory: () => fetchJson(`${API_BASE}/library/sync-history`, { method: "POST" }),

  getTopSongs: (limit = 20) => fetchJson(`${API_BASE}/rankings/songs?limit=${limit}`),
  getTopArtists: (limit = 20) => fetchJson(`${API_BASE}/rankings/artists?limit=${limit}`),

  getJobs: () => fetchJson(`${API_BASE}/jobs`),
  createJob: (payload: { name: string; action: string; cron: string; target_playlist_id?: string }) =>
    fetchJson(`${API_BASE}/jobs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
  deleteJob: (jobId: string) =>
    fetchJson(`${API_BASE}/jobs/${encodeURIComponent(jobId)}`, { method: "DELETE" }),
  deletePlaylist: (playlistId: string) =>
    fetchJson(`${API_BASE}/playlists/${encodeURIComponent(playlistId)}`, { method: "DELETE" }),
  submitAuthCookies: (cookies: { sid: string; login_info: string; authuser?: string; sapisid: string }) =>
    fetchJson(`${API_BASE}/auth/cookies`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(cookies),
    }),
  musicmatch: (payload: { source_playlist_ids?: string[]; source_artists?: string[]; name?: string; description?: string; mode?: string; use_ai?: boolean; selection_weight?: number }) =>
    fetchJson(`${API_BASE}/playlists/musicmatch`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
  getLikedArtists: () => fetchJson(`${API_BASE}/library/artists`),
  getTasteProfile: () => fetchJson(`${API_BASE}/musicmatch/taste-profile`),
  getAISettings: () => fetchJson(`${API_BASE}/settings/ai`),
  saveAISettings: (settings: { ai_base_url: string; ai_api_key: string; ai_model: string }) =>
    fetchJson(`${API_BASE}/settings/ai`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    }),
  submitHeaders: (payload: { headers: string }) =>
    fetchJson(`${API_BASE}/auth/headers`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
  deleteAuth: () =>
    fetchJson(`${API_BASE}/auth`, {
      method: "DELETE",
    }),
};
