import { useEffect, useState } from "react";
import { api } from "../api";
import type { Job } from "../types";
import { Button, Card, CardHeader, CardContent, Input, Alert } from "../components/ui";

function ClockIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
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

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [playlists, setPlaylists] = useState<{ playlist_id: string; title: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [action, setAction] = useState("shuffle");
  const [cron, setCron] = useState("0 8 * * 1");
  const [playlistId, setPlaylistId] = useState("");
  const [message, setMessage] = useState<{ text: string; type: "info" | "success" | "error" } | null>(null);

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
      setMessage({ text: "Error: " + e.message, type: "error" });
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
      setMessage({ text: "Job created successfully", type: "success" });
      setName("");
      await loadAll();
    } catch (err: any) {
      setMessage({ text: "Create error: " + err.message, type: "error" });
    }
  }

  async function handleDelete(jobId: string) {
    try {
      await api.deleteJob(jobId);
      setMessage({ text: "Job deleted", type: "success" });
      await loadAll();
    } catch (err: any) {
      setMessage({ text: "Delete error: " + err.message, type: "error" });
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center py-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 mb-4">
          <ClockIcon className="w-8 h-8 text-cyan-400" />
        </div>
        <h1 className="font-display text-4xl font-bold bg-gradient-to-r from-white via-cyan-200 to-blue-200 bg-clip-text text-transparent">
          Scheduled Jobs
        </h1>
        <p className="mt-2 text-zinc-400">
          Automate your playlists with cron-based scheduling
        </p>
      </div>

      {/* Message */}
      {message && (
        <Alert variant={message.type} onClose={() => setMessage(null)}>
          {message.text}
        </Alert>
      )}

      {/* Create Job */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 flex items-center justify-center">
              <PlusIcon className="w-5 h-5 text-violet-400" />
            </div>
            <div>
              <h2 className="font-display font-semibold text-lg">Create Job</h2>
              <p className="text-sm text-zinc-500">Set up automated tasks</p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid md:grid-cols-4 gap-4">
              <div className="md:col-span-1">
                <label className="block text-sm font-medium text-zinc-400 mb-1.5">Name</label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Monday shuffle"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1.5">Action</label>
                <select
                  value={action}
                  onChange={(e) => setAction(e.target.value)}
                  className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-3 text-zinc-100 focus:outline-none focus:border-violet-500/50"
                >
                  <option value="shuffle">Shuffle playlist</option>
                  <option value="sync_history">Sync history</option>
                </select>
              </div>
              {action === "shuffle" && (
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1.5">Playlist</label>
                  <select
                    value={playlistId}
                    onChange={(e) => setPlaylistId(e.target.value)}
                    required={action === "shuffle"}
                    className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-3 text-zinc-100 focus:outline-none focus:border-violet-500/50"
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
                <label className="block text-sm font-medium text-zinc-400 mb-1.5">Cron Expression</label>
                <Input
                  value={cron}
                  onChange={(e) => setCron(e.target.value)}
                  placeholder="0 8 * * 1"
                  required
                />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-sm text-zinc-500">
                Example: <code className="bg-zinc-800 px-2 py-1 rounded">0 8 * * 1</code> = Every Monday at 8am
              </p>
              <Button type="submit">
                <PlusIcon className="w-4 h-4 mr-2" />
                Create Job
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Active Jobs */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center">
              <ClockIcon className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h2 className="font-display font-semibold text-lg">Active Jobs</h2>
              <p className="text-sm text-zinc-500">{jobs.length} scheduled</p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-5 h-5 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
            </div>
          ) : jobs.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-zinc-500">No scheduled jobs</p>
              <p className="text-sm text-zinc-600 mt-1">Create your first job above</p>
            </div>
          ) : (
            <div className="space-y-3">
              {jobs.map((job) => (
                <div
                  key={job.id}
                  className="flex items-center justify-between p-4 rounded-xl bg-zinc-950/50 border border-white/5 hover:border-white/10 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      job.action === 'shuffle'
                        ? 'bg-violet-500/10 text-violet-400'
                        : 'bg-cyan-500/10 text-cyan-400'
                    }`}>
                      {job.action === 'shuffle' ? <ShuffleIcon className="w-5 h-5" /> : <RefreshIcon className="w-5 h-5" />}
                    </div>
                    <div>
                      <p className="font-medium">{job.name}</p>
                      <p className="text-sm text-zinc-500">
                        {job.action === 'shuffle' ? 'Shuffle' : 'Sync'} • {job.cron}
                        {job.next_run && (
                          <span className="ml-2 text-violet-400">
                            Next: {new Date(job.next_run).toLocaleString()}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() => handleDelete(job.id)}
                  >
                    <TrashIcon className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
