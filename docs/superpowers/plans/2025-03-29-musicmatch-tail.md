">flex gap-4 text-sm">`:

```tsx
<Link to="/ai-settings" className="hover:text-white text-gray-300">AI</Link>
```

Add route inside `<Routes>`:

```tsx
<Route path="/ai-settings" element={<AiSettings />} />
```

- [ ] **Step 3: Commit**

```bash
git add web/src/pages/AiSettings.tsx web/src/App.tsx
git commit -m "feat: add AI Settings page

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 9: Web Frontend — Dashboard MusicMatch Card

**Files:**
- Modify: `web/src/pages/Dashboard.tsx`

- [ ] **Step 1: Add MusicMatch state and UI**

Add imports at top of `Dashboard.tsx`:

```tsx
import { api } from "../api";
```

Add new state hooks inside `Dashboard` component (after existing `useState` declarations):

```tsx
const [sourcePlaylist, setSourcePlaylist] = useState("");
const [mmName, setMmName] = useState("");
const [mmDesc, setMmDesc] = useState("");
const [mmMode, setMmMode] = useState<"exact" | "search" | "auto">("auto");
const [mmLoading, setMmLoading] = useState(false);
```

Add helper function before `return`:

```tsx
async function handleMusicMatch() {
  if (!sourcePlaylist || !mmName) return;
  setMmLoading(true);
  setMessage("Generating playlist with AI...");
  try {
    const res = await api.musicmatch({
      source_playlist_id: sourcePlaylist,
      name: mmName,
      description: mmDesc,
      mode: mmMode,
    });
    if (res.status === "ok") {
      setMessage(`Created playlist "${mmName}" with ${res.tracks.length} tracks!`);
      setMmName("");
      setMmDesc("");
      loadAll();
    } else {
      setMessage("Error: " + (res.message || "Unknown error"));
    }
  } catch (err: any) {
    setMessage("MusicMatch error: " + err.message);
  } finally {
    setMmLoading(false);
  }
}
```

Add the MusicMatch card JSX before the closing `</div>` of the component:

```tsx
<section className="rounded-xl border border-gray-700 bg-gray-800 p-4">
  <h2 className="text-lg font-semibold mb-3">MusicMatch — Generate from Playlist</h2>
  <div className="space-y-3">
    <div>
      <label className="block text-xs text-gray-400 mb-1">Source Playlist</label>
      <select
        value={sourcePlaylist}
        onChange={(e) => setSourcePlaylist(e.target.value)}
        className="w-full rounded border border-gray-600 bg-gray-900 px-3 py-2 text-sm outline-none focus:border-indigo-500"
      >
        <option value="">Select a playlist...</option>
        {playlists.map((pl) => (
          <option key={pl.playlist_id} value={pl.playlist_id}>{pl.title}</option>
        ))}
      </select>
    </div>
    <div>
      <label className="block text-xs text-gray-400 mb-1">New Playlist Name</label>
      <input
        type="text"
        value={mmName}
        onChange={(e) => setMmName(e.target.value)}
        placeholder="Inspired Mix"
        className="w-full rounded border border-gray-600 bg-gray-900 px-3 py-2 text-sm outline-none focus:border-indigo-500"
      />
    </div>
    <div>
      <label className="block text-xs text-gray-400 mb-1">Description (optional)</label>
      <input
        type="text"
        value={mmDesc}
        onChange={(e) => setMmDesc(e.target.value)}
        placeholder="AI-generated based on my favorites"
        className="w-full rounded border border-gray-600 bg-gray-900 px-3 py-2 text-sm outline-none focus:border-indigo-500"
      />
    </div>
    <div>
      <label className="block text-xs text-gray-400 mb-1">Mode</label>
      <div className="flex gap-2">
        {(["exact", "search", "auto"] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMmMode(m)}
            className={`rounded px-3 py-1 text-xs font-medium capitalize ${
              mmMode === m ? "bg-indigo-600 text-white" : "bg-gray-700 text-gray-300 hover:bg-gray-600"
            }`}
          >
            {m}
          </button>
        ))}
      </div>
      <p className="text-xs text-gray-500 mt-1">
        Exact = specific songs • Search = creative queries • Auto = intelligent mix
      </p>
    </div>
    <button
      onClick={handleMusicMatch}
      disabled={mmLoading || !sourcePlaylist || !mmName}
      className="w-full rounded bg-emerald-600 px-4 py-2 text-sm font-medium hover:bg-emerald-500 disabled:opacity-50"
    >
      {mmLoading ? "Generating..." : "Generate Playlist"}
    </button>
  </div>
</section>
```

- [ ] **Step 2: Build and verify**

```bash
cd /home/rob/YTMusicianship/web
npm run build
```

Expected: Build succeeds with no errors.

- [ ] **Step 3: Commit**

```bash
git add web/src/pages/Dashboard.tsx
git commit -m "feat: add MusicMatch card to Dashboard

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 10: Integration Test — Full Stack

**Files:**
- None (manual verification)

- [ ] **Step 1: Start the server**

```bash
cd /home/rob/YTMusicianship
source venv/bin/activate
python -m ytmusicianship
```

- [ ] **Step 2: Open web GUI**

Navigate to `http://localhost:8080`

- [ ] **Step 3: Test AI Settings**

1. Click "AI" in the nav
2. Enter a test OpenAI-compatible config (or use `http://localhost:11434/v1` for local Ollama)
3. Save
4. Refresh page — settings should persist

- [ ] **Step 4: Test MusicMatch**

1. Go to Dashboard
2. Select a source playlist (need to be authenticated with YouTube Music)
3. Enter a name like "Test Inspired"
4. Select mode "auto"
5. Click Generate
6. Wait for AI response and playlist creation
7. Verify new playlist appears in your YouTube Music

- [ ] **Step 5: Test MCP tool (optional)**

If using an MCP client like Claude Desktop:

```
Create a new playlist based on my Christmas playlist using musicmatch with mode auto
```

Expected: MCP tool executes, returns new playlist ID and track count.

---

## Spec Coverage Check

| Requirement | Task |
|-------------|------|
| `Setting` database model | Task 1 |
| AI client with configurable base URL/key/model | Task 2 |
| Prompt builder with mode awareness | Task 2 |
| JSON response parser with markdown fence handling | Task 2 |
| Suggestion resolution (exact vs search) | Task 3 |
| MusicMatch orchestrator | Task 4 |
| REST endpoints for settings | Task 5 |
| REST endpoint for musicmatch | Task 5 |
| MCP tool for musicmatch | Task 6 |
| Web API wrappers | Task 7 |
| AI Settings page | Task 8 |
| Dashboard MusicMatch card | Task 9 |
| Genre diversity rule in prompt | Task 2 (SYSTEM_PROMPT) |

---

## Execution Handoff

**Plan complete and saved to `docs/superpowers/plans/2025-03-29-musicmatch.md`.**

Two execution options:

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach would you like?
