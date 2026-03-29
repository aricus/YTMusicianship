import { useEffect, useState } from "react";
import { api } from "../api";
import type { Job } from "../types";

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [playlists, setPlaylists] = useState<{ playlist_id: string; title: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [action, setAction] = useState("shuffle");
  const [cron, setCron] = useState("0 8 * * 1");
  const [playlistId, setPlaylistId] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll() {
    setLoading(true);
    try {
      const [j, p] = await Promise.all([api.getJobs(), api.getPlaylists()]);
      setJobs(j.jobs || []);
      setPlaylists(p.playlists || []);
    } catch (e: any) {
      setMessage("Error: " + e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api.createJob({
        name,
        action,
        cron,
        target_playlist_id: action === "shuffle" ? playlistId : undefined,
      });
      setMessage("Job created");
      setName("");
      await loadAll();
    } catch (err: any) {
      setMessage("Create error: " + err.message);
    }
  }

  async function handleDelete(jobId: string) {
    try {
      await api.deleteJob(jobId);
      setMessage("Job deleted");
      await loadAll();
    } catch (err: any) {
      setMessage("Delete error: " + err.message);
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Scheduled Jobs</h1>

      {message && (
        <div className="rounded bg-indigo-900/40 border border-indigo-500/40 px-4 py-2 text-indigo-200">{message}</div>
      )}

      <section className="rounded-xl border border-gray-700 bg-gray-800 p-4">
        <h2 className="text-lg font-semibold mb-3">Create Job</h2>
        <form onSubmit={handleCreate} className="flex flex-col gap-3 md:flex-row md:items-end">
          <div className="flex-1">
            <label className="block text-xs text-gray-400 mb-1">Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Monday shuffle"
              required
              className="w-full rounded border border-gray-600 bg-gray-900 px-3 py-2 text-sm outline-none focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Action</label>
            <select
              value={action}
              onChange={(e) => setAction(e.target.value)}
              className="w-full rounded border border-gray-600 bg-gray-900 px-3 py-2 text-sm outline-none focus:border-indigo-500"
            >
              <option value="shuffle">Shuffle playlist</option>
              <option value="sync_history">Sync history + compute rankings</option>
            </select>
          </div>
          {action === "shuffle" && (
            <div className="flex-1">
              <label className="block text-xs text-gray-400 mb-1">Playlist</label>
              <select
                value={playlistId}
                onChange={(e) => setPlaylistId(e.target.value)}
                required={action === "shuffle"}
                className="w-full rounded border border-gray-600 bg-gray-900 px-3 py-2 text-sm outline-none focus:border-indigo-500"
              >
                <option value="">Select playlist</option>
                {playlists.map((pl) => (
                  <option key={pl.playlist_id} value={pl.playlist_id}>
                    {pl.title}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className="block text-xs text-gray-400 mb-1">Cron (5 fields)</label>
            <input
              value={cron}
              onChange={(e) => setCron(e.target.value)}
              placeholder="0 8 * * 1"
              required
              className="w-full rounded border border-gray-600 bg-gray-900 px-3 py-2 text-sm outline-none focus:border-indigo-500"
            />
          </div>
          <button type="submit" className="rounded bg-emerald-600 px-4 py-2 text-sm font-medium hover:bg-emerald-500">
            Create
          </button>
        </form>
      </section>

      <section className="rounded-xl border border-gray-700 bg-gray-800 p-4">
        <h2 className="text-lg font-semibold mb-3">Active Jobs</h2>
        <div className="space-y-2">
          {loading && <div className="text-gray-400">Loading...</div>}
          {!loading && jobs.length === 0 && <div className="text-gray-400 text-sm">No scheduled jobs.</div>}
          {jobs.map((job) => (
            <div
              key={job.id}
              className="flex items-center justify-between rounded border border-gray-700 bg-gray-900/50 px-3 py-2"
            >
              <div>
                <div className="font-medium">{job.name}</div>
                <div className="text-xs text-gray-400">
                  {job.action} • {job.cron} {job.next_run ? `• Next: ${new Date(job.next_run).toLocaleString()}` : ""}
                </div>
              </div>
              <button
                onClick={() => handleDelete(job.id)}
                className="rounded bg-rose-600 px-3 py-1 text-xs font-medium hover:bg-rose-500"
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
