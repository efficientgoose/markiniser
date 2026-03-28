import type { CurrentFile } from "../types";

export const SAMPLE_FILE_PATH = "markiniser://sample/welcome.md";

export const SAMPLE_FILE_CONTENT = `# Welcome to Markiniser

Edit your markdown files with live preview, autosave, and a local-first workflow.

## Workspace

- Browse your markdown workspace from the sidebar
- Open files instantly from the command palette

## Writing

- Write in the editor and preview changes side by side
- Autosave keeps disk-backed files up to date as you work

## Command Palette

Press \`⌘ K\` or \`Ctrl K\` to search files and actions.

Jump to recent files quickly.

Toggle the preview panel or sidebar without leaving the keyboard.

## Layout

Resize the sidebar, editor, and preview to fit the way you work.

Switch between split, editor-only, and preview-only views from the top-right controls.

## Root Switching

Use the pencil button beside **Files** to pick a new root folder and rebuild the tree.

## Local-First

Markiniser keeps your markdown local. This sample document is virtual and lives only in memory, so you can explore the interface without writing anything to disk.
`;

export function createSampleFile(): CurrentFile {
  return {
    path: SAMPLE_FILE_PATH,
    name: "welcome.md",
    content: SAMPLE_FILE_CONTENT,
    lastModified: new Date("2026-03-28T00:00:00.000Z").toISOString(),
    size: SAMPLE_FILE_CONTENT.length,
    isVirtual: true
  };
}
