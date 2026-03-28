# Markiniser — Codex Build Prompts (Phased)

> **What is Markiniser?**
> A local-first npm package that scans configured directories for `.md` files, indexes them for fast full-text search, and serves a React-based UI on localhost for browsing, searching, editing, and saving markdown files. Target audience: developers with markdown sprawl across multiple projects.

---

## Phase 1: Project Scaffolding + Core Package

```
Initialize a TypeScript monorepo for an npm package called "markiniser" — a local-first markdown file organizer that runs on localhost.

Project structure (monorepo using npm workspaces):

markiniser/
├── packages/
│   ├── core/          # scanning, indexing, file watching, config, file access
│   ├── server/        # Fastify REST API + WebSocket server
│   └── web/           # React frontend (Vite)
├── bin/
│   └── markiniser.js  # CLI entry point (just boots the server)
├── package.json       # workspace root
├── tsconfig.base.json # shared TS config
└── .markiniserrc.example

Requirements for this phase — ONLY build packages/core:

1. **Config loader** (`packages/core/src/config.ts`):
   - Use `cosmiconfig` to load config from `.markiniserrc`, `.markiniserrc.json`, or `markiniser.config.js`
   - Config shape: `{ roots: string[], ignore: string[], port: number }`
   - Resolve `~` to `process.env.HOME` in root paths
   - Merge CLI flags (port override) with file config
   - Sensible defaults: `roots: ["~/Documents"]`, `ignore: ["node_modules", ".git", "dist", "build", ".obsidian", ".trash"]`, `port: 4000`

2. **File scanner** (`packages/core/src/scanner.ts`):
   - Recursively scan all configured `roots` directories
   - Find all `.md` files, respecting the `ignore` list (glob patterns)
   - Return a tree structure: `TreeNode { id, name, path, isFolder, children?, lastModified?, size? }`
   - Use `fast-glob` for efficient scanning
   - Build both a flat file list (for indexing) and a nested tree (for the frontend file tree)

3. **Search indexer** (`packages/core/src/indexer.ts`):
   - Use `flexsearch` to build an in-memory full-text index
   - Index file path, filename, and file content
   - Expose `search(query: string): SearchResult[]` method
   - Expose `addToIndex(file)`, `removeFromIndex(filePath)`, `updateIndex(file)` for incremental updates
   - SearchResult: `{ path, name, snippet (matching context), score }`

4. **File watcher** (`packages/core/src/watcher.ts`):
   - Use `chokidar` to watch all configured roots for `.md` file changes
   - Emit events: `file-added`, `file-changed`, `file-removed`
   - On each event, update the search index incrementally and update the file tree
   - Respect the same ignore patterns from config
   - Expose an EventEmitter or callback-based API

5. **File access manager** (`packages/core/src/fileAccess.ts`):
   - Read and write `.md` files only
   - Critical: `validatePath()` method that resolves the path and checks it starts with one of the allowed roots — prevent path traversal attacks
   - Only allow `.md` extension for reads and writes
   - Use atomic writes: write to a `.tmp` file first, then `fs.rename()` to the target
   - Expose: `read(path): string`, `write(path, content): void`, `getMetadata(path): FileMetadata`

6. **Main entry** (`packages/core/src/index.ts`):
   - Export a `createCore(config)` function that initializes scanner, indexer, watcher, and file access
   - Return an object with all the methods the server will need

Tech stack for core:
- TypeScript (strict mode)
- cosmiconfig, fast-glob, flexsearch, chokidar
- Node.js fs/promises for file operations

Write comprehensive unit tests using vitest for scanner, indexer, and fileAccess (especially path validation). Include the workspace root package.json with npm workspaces config. Add a tsconfig.base.json with shared compiler options.
```

---

## Phase 2: Fastify Server + REST API

```
Continue building "markiniser" — now build `packages/server`.

Context: `packages/core` already exists and exports a `createCore(config)` function that provides:
- `core.scanner.scan(): { tree: TreeNode[], files: FlatFile[] }`
- `core.indexer.search(query): SearchResult[]`
- `core.watcher.start()` — starts watching, emits `file-added`, `file-changed`, `file-removed`
- `core.fileAccess.read(path): string`
- `core.fileAccess.write(path, content): void`
- `core.fileAccess.getMetadata(path): FileMetadata`
- `core.getTree(): TreeNode[]` — returns current file tree

Build the Fastify server package:

1. **Server setup** (`packages/server/src/index.ts`):
   - Create a Fastify server instance
   - CRITICAL: bind to `127.0.0.1` only — never `0.0.0.0`
   - Register CORS for localhost origins
   - Serve the built React frontend from `packages/web/dist` as static files
   - Accept a `core` instance from the CLI entry point

2. **REST routes** (`packages/server/src/routes/`):

   `GET /api/files` — returns the full file tree as JSON
   - Response: `{ tree: TreeNode[] }`

   `GET /api/files/:path(*)` — read a single markdown file
   - Response: `{ content: string, name: string, path: string, lastModified: string, size: number }`
   - 403 if path is outside allowed roots
   - 404 if file doesn't exist
   - 400 if not a .md file

   `PUT /api/files/:path(*)` — save/update file content
   - Body: `{ content: string }`
   - Uses atomic write (core.fileAccess.write)
   - Response: `{ success: true, lastModified: string }`
   - Same error handling as GET

   `GET /api/search?q=keyword` — full-text search
   - Response: `{ results: SearchResult[], count: number }`
   - Return empty results for empty/missing query, don't error

3. **WebSocket** (`packages/server/src/ws.ts`):
   - Use `@fastify/websocket` for WebSocket support
   - Route: `GET /ws`
   - Listen to core.watcher events and broadcast to all connected clients
   - Message format: `{ event: "file-added" | "file-changed" | "file-removed", path: string, tree: TreeNode[] }`
   - This lets the frontend update the file tree and editor in real-time when files change externally

4. **CLI entry point** (`bin/markiniser.js`):
   - `#!/usr/bin/env node`
   - Parse CLI args with `commander`: `--port`, `--config`
   - Load config via core's config loader
   - Initialize core, start the scanner (initial scan), start the watcher
   - Boot the Fastify server
   - Print a nice startup message with the URL and file count
   - Handle graceful shutdown on SIGINT/SIGTERM

Add Fastify request validation schemas using `@fastify/type-provider-typebox` or JSON Schema. Write integration tests with vitest that spin up the server, hit the endpoints, and verify responses.
```

---

## Phase 3: React Frontend — File Tree + Layout Shell

```
Continue building "markiniser" — now build `packages/web` (React frontend), starting with the layout shell and file tree sidebar.

Context: The Fastify server (packages/server) serves this frontend as static files and provides:
- GET /api/files → { tree: TreeNode[] }
- GET /api/files/:path → { content, name, path, lastModified, size }
- PUT /api/files/:path → { success, lastModified }
- GET /api/search?q=keyword → { results: SearchResult[], count }
- WS /ws → real-time file change events

TreeNode shape: { id: string, name: string, path: string, isFolder: boolean, children?: TreeNode[], lastModified?: string, size?: number }

Build the React frontend with Vite + TypeScript:

1. **Project setup**:
   - Vite + React + TypeScript
   - Tailwind CSS for styling
   - Use a dark theme by default (devs love dark mode), with a clean minimal aesthetic
   - No component library — keep it lean, hand-craft the UI

2. **Layout shell** (`src/App.tsx`):
   - Three-panel layout like VS Code:
     - Left sidebar (280px, resizable): file tree + search
     - Main panel (flex): markdown editor
     - Right panel (optional, toggleable): live preview
   - Top bar with: app name "Markiniser", toggle buttons for preview panel, maybe a breadcrumb showing current file path
   - Use CSS Grid or flexbox for the layout
   - Panels should be resizable via drag handles

3. **File tree sidebar** (`src/components/FileTree.tsx`):
   - Use `react-arborist` for the virtualized tree view
   - Fetch tree data from `GET /api/files` on mount
   - Custom node renderer:
     - Folder icon (▸/▾) for directories, document icon for .md files
     - Show filename only, not full path
     - Highlight currently selected file
     - Hover effect on nodes
   - Clicking a .md file should: fetch its content via `GET /api/files/:path` and open it in the editor panel
   - Clicking a folder should expand/collapse it
   - Style it to feel like a code editor's sidebar — monospace font for filenames, subtle indentation lines

4. **Search bar** (`src/components/SearchBar.tsx`):
   - Sits above the file tree in the sidebar
   - Debounced input (300ms) that hits `GET /api/search?q=...`
   - Show results as a flat list below the search input, replacing the file tree temporarily
   - Each result shows: filename, folder path (dimmed), and a snippet with the match highlighted
   - Clicking a search result opens that file in the editor
   - Escape or clearing the input returns to the file tree view
   - Keyboard shortcut: Cmd/Ctrl+K to focus search

5. **WebSocket integration** (`src/hooks/useFileWatcher.ts`):
   - Connect to `ws://localhost:{port}/ws` on mount
   - On `file-added`/`file-changed`/`file-removed` events:
     - Update the file tree state
     - If the currently open file was changed externally, show a subtle notification and offer to reload
   - Auto-reconnect with exponential backoff if connection drops

6. **State management**:
   - Use React Context or Zustand (prefer Zustand for simplicity)
   - Global state: fileTree, currentFile (path + content), searchResults, isPreviewOpen
   - Keep it simple — no Redux, no over-engineering

Don't build the editor or preview yet — just show a placeholder in the main panel that says "Select a file to start editing" and shows the file path + raw content as plain text when a file is selected. Editor and preview come in Phase 4.
```

---

## Phase 4: Markdown Editor + Live Preview

```
Continue building "markiniser" — now add the markdown editor and live preview to `packages/web`.

Context: The layout shell, file tree, and search are already built. When a user clicks a file in the tree, `currentFile` state is populated with `{ path, content, name, lastModified }`. There's a placeholder in the main panel.

Build the editor and preview panels:

1. **Markdown editor** (`src/components/Editor.tsx`):
   - Use CodeMirror 6 via `@codemirror/view`, `@codemirror/state`, and related packages
   - Extensions to include:
     - `@codemirror/lang-markdown` for markdown syntax highlighting
     - `@codemirror/theme-one-dark` (or a custom dark theme matching the app)
     - Line numbers
     - Bracket matching
     - Code folding for headings
     - Active line highlighting
     - Search/replace (Cmd+F / Ctrl+F)
   - Load file content into the editor when `currentFile` changes
   - Track dirty state: compare current editor content with last saved content
   - Show a dot indicator on the tab/filename when there are unsaved changes
   - Auto-save: debounced save (2 seconds after last keystroke) via `PUT /api/files/:path`
   - Manual save: Cmd+S / Ctrl+S triggers immediate save
   - Show save status in the bottom bar: "Saved", "Saving...", "Unsaved changes"
   - Handle external file changes: if WebSocket reports the file changed and user has no unsaved edits, silently reload. If user HAS unsaved edits, show a conflict notification with options: "Keep mine" / "Load external" / "Diff" (diff can be v2, just the buttons for now)

2. **Live preview** (`src/components/Preview.tsx`):
   - Use `markdown-it` to render markdown to HTML
   - Enable common plugins: tables, task lists, strikethrough, fenced code blocks
   - Use `highlight.js` or `shiki` for syntax highlighting in code blocks
   - Preview should update in real-time as user types (debounce 150ms)
   - Scroll sync: when user scrolls the editor, the preview scrolls proportionally (basic percentage-based sync is fine for v1)
   - Style the preview to look like GitHub's markdown rendering — clean typography, proper spacing, styled code blocks, tables, blockquotes
   - Toggle preview panel with a button or keyboard shortcut (Cmd+Shift+P)

3. **Bottom status bar** (`src/components/StatusBar.tsx`):
   - Show: current file path, file size, last modified time, save status, cursor position (line:col)
   - Subtle, non-intrusive — like VS Code's status bar

4. **Keyboard shortcuts**:
   - Cmd/Ctrl+S: Save current file
   - Cmd/Ctrl+K: Focus search
   - Cmd/Ctrl+Shift+P: Toggle preview panel
   - Cmd/Ctrl+B: Toggle sidebar
   - Register these globally, not per-component

5. **Empty states**:
   - No file selected: centered message "Select a file from the sidebar or search to start editing" with a keyboard shortcut hint
   - No files found (empty roots): "No markdown files found. Check your .markiniserrc configuration."
   - Search no results: "No files matching '{query}'"

Keep the UI clean and minimal. This is a dev tool, not a design portfolio. Prioritize fast load times and snappy interactions over animations. Use Tailwind for all styling.
```

---

## Phase 5: Polish, CLI UX, and npm Publish Prep

```
Continue building "markiniser" — final phase. Polish the app, improve CLI experience, and prepare for npm publish.

1. **CLI experience** (`bin/markiniser.js`):
   - On first run, if no `.markiniserrc` exists, run an interactive setup:
     - Ask which directories to scan (default: current dir)
     - Ask for port (default: 4000)
     - Write `.markiniserrc` to the user's home directory
   - Startup output should look clean:
     ```
     ┌─────────────────────────────────────────┐
     │  Markiniser v1.0.0                      │
     │  Indexed 847 files from 3 directories   │
     │  Running at http://localhost:4000        │
     │  Press Ctrl+C to stop                   │
     └─────────────────────────────────────────┘
     ```
   - Use `ora` for the scanning spinner
   - Use `chalk` for colored output
   - Open the browser automatically after startup (use `open` package), with a `--no-open` flag to skip

2. **Error handling hardening**:
   - Graceful handling of: permission denied on directories, broken symlinks, files deleted mid-read, disk full on write
   - If a configured root directory doesn't exist, warn but don't crash — skip it and continue
   - If ALL roots are invalid, show a helpful error message and exit

3. **Performance**:
   - Lazy-load file content: don't read file contents during initial scan, only read when needed for search indexing
   - Stagger the search indexing: scan the tree first (fast), show the UI immediately, then index file contents in the background
   - Add a loading state in the UI for "Indexing files..." with a progress indicator

4. **Package.json + npm publish setup**:
   - Main package.json: set `bin: { "markiniser": "./bin/markiniser.js" }`
   - Add `"files"` field to include only built output
   - Add a `prepublish` script that builds all three packages
   - Build pipeline: core (tsc) → server (tsc) → web (vite build) → copy web/dist into server/public
   - README.md with: installation, quick start, configuration options, screenshots placeholder, contributing guide
   - LICENSE: MIT
   - Add `.npmignore` or use `files` field to keep package size small

5. **Final touches**:
   - Add a "recently opened" section at the top of the sidebar showing last 5 opened files (stored in memory, not persisted)
   - Add file count badge next to each folder in the tree (e.g., "notes (12)")
   - Add a "Refresh" button in the sidebar header to manually re-scan
   - Favicon for the browser tab

Write a comprehensive README.md covering installation, usage, configuration, and keyboard shortcuts.
```

---

## Tips for Using These Prompts with Codex

1. **Run phases sequentially** — each phase depends on the previous one
2. **After each phase, review and test** before moving to the next
3. **If Codex misses something**, create a follow-up prompt referencing the specific file and issue
4. **For bug fixes**, give Codex the error message + the relevant file path and ask it to fix
5. **Phase 1 is the most critical** — if the core is solid, everything else builds on it cleanly