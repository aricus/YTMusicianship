import { useEffect, useState } from "react";
import { api } from "../api";
import {
  Button,
  Card,
  CardHeader,
  CardContent,
  Input,
  Alert
} from "../components/ui";

// Icons
function KeyIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
    </svg>
  );
}

function BrainIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
    </svg>
  );
}

function InfoIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
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

function GithubIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
    </svg>
  );
}

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
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center py-8">
        <h1 className="font-display text-4xl font-bold bg-gradient-to-r from-white via-violet-200 to-fuchsia-200 bg-clip-text text-transparent">
          Settings
        </h1>
        <p className="mt-2 text-zinc-400">
          Configure AI providers and manage your account
        </p>
      </div>

      {/* Message */}
      {message && (
        <Alert variant={message.type} onClose={() => setMessage(null)}>
          {message.text}
        </Alert>
      )}

      {/* AI Configuration */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 flex items-center justify-center">
              <BrainIcon className="w-5 h-5 text-violet-400" />
            </div>
            <div>
              <h2 className="font-display font-semibold text-lg">AI Configuration</h2>
              <p className="text-sm text-zinc-500">Configure your AI provider for MusicMatch</p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {aiLoading ? (
            <div className="flex items-center gap-3 text-zinc-500 py-4">
              <div className="w-5 h-5 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
              Loading...
            </div>
          ) : (
            <form onSubmit={handleSaveAISettings} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <Input
                  label="Base URL"
                  type="url"
                  value={aiSettings.ai_base_url}
                  onChange={(e) => setAiSettings({ ...aiSettings, ai_base_url: e.target.value })}
                  placeholder="https://api.openai.com/v1"
                />
                <Input
                  label="API Key"
                  type="password"
                  autoComplete="off"
                  value={aiSettings.ai_api_key}
                  onChange={(e) => setAiSettings({ ...aiSettings, ai_api_key: e.target.value })}
                  placeholder="sk-..."
                />
              </div>

              <Input
                label="Model"
                value={aiSettings.ai_model}
                onChange={(e) => setAiSettings({ ...aiSettings, ai_model: e.target.value })}
                placeholder="gpt-4"
              />

              <div className="flex items-center justify-between">
                <div className="text-sm text-zinc-500">
                  <p>Supports OpenAI, OpenRouter, Ollama, or any OpenAI-compatible API</p>
                </div>
                <Button
                  type="submit"
                  isLoading={aiSaving}
                >
                  Save AI Settings
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>

      {/* Authentication */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500/20 to-orange-500/20 flex items-center justify-center">
              <KeyIcon className="w-5 h-5 text-rose-400" />
            </div>
            <div>
              <h2 className="font-display font-semibold text-lg">Authentication</h2>
              <p className="text-sm text-zinc-500">Manage your YouTube Music authorization</p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <p className="text-sm text-zinc-400 max-w-md">
              Deleting your authorization will sign you out and allow you to connect a different YouTube Music account.
            </p>
            <Button
              variant="danger"
              onClick={handleDeleteAuth}
              isLoading={deleting}
            >
              <TrashIcon className="w-4 h-4 mr-2" />
              Delete Auth
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* About */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center">
              <InfoIcon className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <h2 className="font-display font-semibold text-lg">About</h2>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-zinc-500">App</span>
                <p className="font-medium">YTMusicianship</p>
              </div>
              <div>
                <span className="text-zinc-500">Version</span>
                <p className="font-medium">1.0.0</p>
              </div>
            </div>
            <a
              href="https://github.com/aricus/YTMusicianship"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-violet-400 hover:text-violet-300 transition-colors"
            >
              <GithubIcon className="w-4 h-4" />
              GitHub Repository
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
