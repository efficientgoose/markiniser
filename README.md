# Markiniser

Markiniser is a local-first markdown workspace for browsing, searching, editing, and previewing `.md` files on localhost. It runs entirely on your machine and only works against the root folders you configure.

## What It Does

- Scans one or more local roots for markdown files
- Shows a file tree sidebar
- Opens files in a raw markdown editor with autosave
- Renders a live preview beside the editor
- Supports command-palette search with `Cmd/Ctrl+K`
- Lets you change the active root from inside the app
- Includes a built-in `welcome.md` sample file on first launch

## Requirements

- Node.js 20+
- npm

## Install

```bash
npm install
```

## Configure Your Markdown Root

Markiniser looks for config in:

- `.markiniserrc`
- `.markiniserrc.json`
- `markiniser.config.js`

The simplest option is `.markiniserrc.json` in the repo root:

```json
{
  "roots": ["/absolute/path/to/your/notes"],
  "ignore": ["node_modules", ".git", "dist", "build", ".obsidian", ".trash", ".Trash"],
  "port": 4000
}
```

Notes:

- `roots` should be absolute paths or `~/...`
- only `.md` files inside configured roots are editable
- if you use a very large root, file watching may hit OS limits

## Build

Build everything once before running:

```bash
npm run build
```

## Run

Recommended local command:

```bash
node bin/markiniser.js --no-watch
```

What happens:

- the server starts on `127.0.0.1:4000` by default
- the browser opens automatically unless you pass `--no-open`
- if `packages/web/dist` exists, the app UI is served at `/`
- if the frontend is not built, Markiniser still serves the API

Useful flags:

```bash
node bin/markiniser.js --port 4001
node bin/markiniser.js --config /absolute/path/to/config.json
node bin/markiniser.js --no-watch
node bin/markiniser.js --no-open
```

If the browser does not open correctly, use:

```text
http://127.0.0.1:4000/
```

## How To Use

### On First Launch

- Markiniser opens the virtual sample file `welcome.md`
- use it to verify the editor, preview, and layout controls

### Open Files

- click any markdown file in the sidebar
- or press `Cmd/Ctrl+K` to open the command palette and search

### Edit Files

- edit directly in the raw markdown editor
- autosave runs for real disk-backed files
- `Cmd/Ctrl+S` triggers an immediate save and shows a toast

### Preview

- split view is available by default
- use the top-right pane buttons to switch between:
  - editor only
  - preview only
  - split view

### Rename Files

- click the filename in the top header
- edit the basename only
- press `Enter` to rename the file on disk

### Change Root Folder

- click the pencil beside `Files` in the sidebar
- use `Browse folder`
- apply the new root

This updates the config file and rebuilds the tree.

## Keyboard Shortcuts

- `Cmd/Ctrl+K`: open command palette
- `Cmd/Ctrl+S`: save file immediately
- `Cmd/Ctrl+Shift+P`: toggle preview panel

## Notes About Watching

If live watching causes issues on your machine, keep using:

```bash
node bin/markiniser.js --no-watch
```

That disables external file watching but keeps browsing, editing, searching, previewing, renaming, and root switching working normally.

## Development Checks

```bash
npm run test
npm run build
npm run typecheck
```
