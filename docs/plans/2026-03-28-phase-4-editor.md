# Phase 4 Editor Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add the markdown editor, live preview, autosave, manual save, save status, and external-change conflict handling to the existing web app.

**Architecture:** Keep the current phase 3 shell intact and replace the read-only main panel with a CodeMirror-backed editor plus a real preview panel. Persist last-saved server state in `currentFile`, keep unsaved edits in `dirtyContent`, and drive save / conflict behavior from the Zustand store.

**Tech Stack:** React 19, Zustand, Vite, Vitest, CodeMirror 6, markdown-it

---

### Task 1: Add phase 4 web dependencies

**Files:**
- Modify: `packages/web/package.json`

**Step 1: Write the failing test**

Add a test that imports the planned phase 4 components or hooks and fails because the new modules or dependencies do not exist yet.

**Step 2: Run test to verify it fails**

Run: `npm run test --workspace @markiniser/web`

**Step 3: Write minimal implementation**

Install and wire the needed editor / preview dependencies:
- `@codemirror/state`
- `@codemirror/view`
- `@codemirror/lang-markdown`
- `@codemirror/commands`
- `@codemirror/theme-one-dark` if useful as a base
- `markdown-it`

**Step 4: Run test to verify it passes**

Run: `npm run test --workspace @markiniser/web`

### Task 2: Expand the store for save status, cursor position, and conflict snapshots

**Files:**
- Modify: `packages/web/src/store/useAppStore.tsx`
- Test: `packages/web/test/store.test.ts`

**Step 1: Write the failing test**

Add focused store tests for:
- `saveStatus` transitions
- `cursorPosition` updates
- conflict snapshot persistence
- `openFile()` resetting dirty / conflict state

**Step 2: Run test to verify it fails**

Run: `npm run test --workspace @markiniser/web -- packages/web/test/store.test.ts`

**Step 3: Write minimal implementation**

Add:
- `saveStatus`
- `cursorPosition`
- `externalFileSnapshot`
- actions for save lifecycle and conflict resolution

**Step 4: Run test to verify it passes**

Run: `npm run test --workspace @markiniser/web -- packages/web/test/store.test.ts`

### Task 3: Add API save support

**Files:**
- Modify: `packages/web/src/lib/api.ts`
- Test: `packages/web/test/app.test.tsx`

**Step 1: Write the failing test**

Add a test that expects a `PUT /api/files/:path` save call and updated saved state.

**Step 2: Run test to verify it fails**

Run: `npm run test --workspace @markiniser/web -- packages/web/test/app.test.tsx`

**Step 3: Write minimal implementation**

Add a typed `saveFile(path, content)` API helper returning the server save payload.

**Step 4: Run test to verify it passes**

Run: `npm run test --workspace @markiniser/web -- packages/web/test/app.test.tsx`

### Task 4: Build the editor, preview, and status bar

**Files:**
- Create: `packages/web/src/components/MarkdownEditor.tsx`
- Create: `packages/web/src/components/Preview.tsx`
- Create: `packages/web/src/components/StatusBar.tsx`
- Modify: `packages/web/src/styles.css`
- Test: `packages/web/test/app.test.tsx`

**Step 1: Write the failing test**

Add tests that expect:
- editable content instead of read-only `<pre>`
- preview rendering
- status bar output

**Step 2: Run test to verify it fails**

Run: `npm run test --workspace @markiniser/web -- packages/web/test/app.test.tsx`

**Step 3: Write minimal implementation**

Add:
- CodeMirror editor with markdown language
- preview rendering with `markdown-it`
- status bar showing file path, save state, cursor position, and metadata

**Step 4: Run test to verify it passes**

Run: `npm run test --workspace @markiniser/web -- packages/web/test/app.test.tsx`

### Task 5: Add autosave and manual save behavior

**Files:**
- Create: `packages/web/src/hooks/useAutosave.ts`
- Modify: `packages/web/src/App.tsx`
- Modify: `packages/web/src/store/useAppStore.tsx`
- Test: `packages/web/test/app.test.tsx`

**Step 1: Write the failing test**

Add tests for:
- dirty state after editing
- debounced autosave after 2 seconds
- `Cmd/Ctrl+S` immediate save
- save error preserving local edits

**Step 2: Run test to verify it fails**

Run: `npm run test --workspace @markiniser/web -- packages/web/test/app.test.tsx`

**Step 3: Write minimal implementation**

Implement autosave and manual save using `dirtyContent`, `saveStatus`, and the new API helper.

**Step 4: Run test to verify it passes**

Run: `npm run test --workspace @markiniser/web -- packages/web/test/app.test.tsx`

### Task 6: Add external-change reload and conflict handling

**Files:**
- Modify: `packages/web/src/hooks/useFileWatcher.ts`
- Modify: `packages/web/src/App.tsx`
- Test: `packages/web/test/fileWatcher.test.tsx`

**Step 1: Write the failing test**

Add tests for:
- silent reload when the active file changes and the editor is clean
- conflict notice with `Keep mine` / `Load external` when the editor is dirty

**Step 2: Run test to verify it fails**

Run: `npm run test --workspace @markiniser/web -- packages/web/test/fileWatcher.test.tsx`

**Step 3: Write minimal implementation**

Refetch the active file on watcher events, apply silent reload when clean, and preserve the local buffer plus store an external snapshot when dirty.

**Step 4: Run test to verify it passes**

Run: `npm run test --workspace @markiniser/web -- packages/web/test/fileWatcher.test.tsx`

### Task 7: Verify the full phase

**Files:**
- Verify only

**Step 1: Run focused web tests**

Run: `npm run test --workspace @markiniser/web`

**Step 2: Run workspace build**

Run: `npm run build`

**Step 3: Run workspace typecheck**

Run: `npm run typecheck`
