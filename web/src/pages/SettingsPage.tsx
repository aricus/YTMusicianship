import { useEffect, useState } from "react";
import { api } from "../api";

interface SettingsPageProps {
  onAuthChange?: () => void;
}

interface AISettings {
  ai_base_url: string;
  ai_api_key: string;
  ai_model: string;
}

export default function SettingsPage({ onAuthChange }: SettingsPageProps) {
  const [message, setMessage] = useState<{ text: string; type: "info" | "success" | "error" } | null>(null);
  const [deleting, setDeleting] = useState(false);

  // AI Settings state
  const [aiSettings, setAiSettings] = useState<AISettings>({
    ai_base_url: "",
    ai_api_key: "",
    ai_model: "",
  });
  const [aiLoading, setAiLoading] = useState(true);
  const [aiSaving, setAiSaving] = useState(false);

  useEffect(() => {
    loadAISettings();
  }, []);

  async function loadAISettings() {
    try {
      const settings = await api.getAISettings();
      setAiSettings({
        ai_base_url: settings.ai_base_url || "",
        ai_api_key: settings.ai_api_key === "***" ? "" : settings.ai_api_key || "",
        ai_model: settings.ai_model || "",
      });
    } catch (err: any) {
      console.error("Failed to load AI settings:", err);
    } finally {
      setAiLoading(false);
    }
  }

  async function handleDeleteAuth() {
    if (!confirm("Are you sure you want to delete your YouTube Music authorization? You'll need to re-authenticate to use the service again.")) {
      return;
    }

    setDeleting(true);
    setMessage({ text: "Deleting authorization...", type: "info" });

    try {
      const res = await api.deleteAuth();
      if (res.status === "ok") {
        setMessage({ text: res.message, type: "success" });
        onAuthChange?.();
      } else {
        setMessage({ text: "Error: " + (res.message || "Unknown error"), type: "error" });
      }
    } catch (err: any) {
      setMessage({ text: "Error: " + err.message, type: "error" });
    } finally {
      setDeleting(false);
    }
  }

  async function handleSaveAISettings(e: React.FormEvent) {
    e.preventDefault();
    setAiSaving(true);
    setMessage({ text: "Saving AI settings...", type: "info" });

    try {
      await api.saveAISettings({
        ai_base_url: aiSettings.ai_base_url,
        ai_api_key: aiSettings.ai_api_key,
        ai_model: aiSettings.ai_model,
      });
      setMessage({ text: "AI settings saved successfully!", type: "success" });
    } catch (err: any) {
      setMessage({ text: "Error saving AI settings: " + err.message, type: "error" });
    } finally {
      setAiSaving(false);
    }
  }

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
          {message.text}
        </div>
      )}

      <section className="rounded-xl border border-gray-700 bg-gray-800 p-6">
        <h1 className="text-2xl font-semibold mb-6">Settings</h1>

        <div className="space-y-8">
          {/* AI Settings Section */}
          <div className="p-4 rounded-lg bg-gray-900 border border-gray-700">
            <h2 className="text-lg font-medium mb-2 text-gray-200">AI Configuration</h2>
            <p className="text-sm text-gray-400 mb-4">
              Configure your AI provider for MusicMatch intelligent playlist generation.
              Supports OpenAI, OpenRouter, or any OpenAI-compatible API.
            </p>

            {aiLoading ? (
              <div className="text-gray-500 text-sm">Loading...</div>
            ) : (
              <form onSubmit={handleSaveAISettings} className="space-y-4">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Base URL</label>
                  <input
                    type="url"
                    value={aiSettings.ai_base_url}
                    onChange={(e) => setAiSettings({ ...aiSettings, ai_base_url: e.target.value })}
                    placeholder="https://api.openai.com/v1"
                    className="w-full rounded border border-gray-600 bg-gray-800 px-3 py-2 text-sm outline-none focus:border-indigo-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    OpenAI: https://api.openai.com/v1 | OpenRouter: https://openrouter.ai/api/v1
                  </p>
                </div>

                <div>
                  <label className="block text-xs text-gray-400 mb-1">API Key</label>
                  <input
                    type="password"
                    autoComplete="off"
                    value={aiSettings.ai_api_key}
                    onChange={(e) => setAiSettings({ ...aiSettings, ai_api_key: e.target.value })}
                    placeholder="sk-..."
                    className="w-full rounded border border-gray-600 bg-gray-800 px-3 py-2 text-sm outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs text-gray-400 mb-1">Model</label>
                  <input
                    type="text"
                    value={aiSettings.ai_model}
                    onChange={(e) => setAiSettings({ ...aiSettings, ai_model: e.target.value })}
                    placeholder="gpt-4"
                    className="w-full rounded border border-gray-600 bg-gray-800 px-3 py-2 text-sm outline-none focus:border-indigo-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Examples: gpt-4, gpt-4o-mini, claude-3-opus, meta-llama/llama-3.1-70b
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={aiSaving}
                  className="rounded bg-indigo-600 px-4 py-2 text-sm font-medium hover:bg-indigo-500 disabled:opacity-50"
                >
                  {aiSaving ? "Saving..." : "Save AI Settings"}
                </button>
              </form>
            )}
          </div>

          {/* Authentication Section */}
          <div className="p-4 rounded-lg bg-gray-900 border border-gray-700">
            <h2 className="text-lg font-medium mb-2 text-gray-200">Authentication</h2>
            <p className="text-sm text-gray-400 mb-4">
              Manage your YouTube Music authorization. Deleting auth will sign you out and allow you to connect a different account.
            </p>
            <button
              onClick={handleDeleteAuth}
              disabled={deleting}
              className="rounded bg-rose-600 px-4 py-2 text-sm font-medium hover:bg-rose-500 disabled:opacity-50"
            >
              {deleting ? "Deleting..." : "Delete Authorization"}
            </button>
          </div>

          {/* About Section */}
          <div className="p-4 rounded-lg bg-gray-900 border border-gray-700">
            <h2 className="text-lg font-medium mb-2 text-gray-200">About</h2>
            <div className="text-sm text-gray-400 space-y-1">
              <p><span className="text-gray-500">App:</span> YTMusicianship</p>
              <p><span className="text-gray-500">Version:</span> 1.0.0</p>
              <p>
                <a
                  href="https://github.com/ytmusicianship/ytmusicianship"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-indigo-400 hover:text-indigo-300"
                >
                  GitHub Repository
                </a>
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
