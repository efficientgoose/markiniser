import { describe, expect, it } from "vitest";
import { createAppStore } from "../src/store/useAppStore";

describe("createAppStore", () => {
  it("opens a file and clears dirty content", () => {
    const store = createAppStore();

    store.getState().setDirtyContent("draft");
    store.getState().openFile({
      path: "/docs/guide.md",
      name: "guide.md",
      content: "# Guide",
      lastModified: "2026-03-28T00:00:00.000Z",
      size: 7
    });

    expect(store.getState().currentFile?.path).toBe("/docs/guide.md");
    expect(store.getState().dirtyContent).toBeNull();
    expect(store.getState().recentFiles).toEqual(["/docs/guide.md"]);
  });

  it("tracks recent files as most-recent-first, deduplicated, and capped at three", () => {
    const store = createAppStore();
    const open = (path: string) => {
      store.getState().openFile({
        path,
        name: path.split("/").at(-1) ?? "file.md",
        content: "# File",
        lastModified: "2026-03-28T00:00:00.000Z",
        size: 6
      });
    };

    open("/docs/one.md");
    open("/docs/two.md");
    open("/docs/three.md");
    open("/docs/four.md");
    open("/docs/five.md");
    open("/docs/two.md");
    open("/docs/six.md");

    expect(store.getState().recentFiles).toEqual([
      "/docs/six.md",
      "/docs/two.md",
      "/docs/five.md"
    ]);
  });

  it("tracks draft changes separately from the saved file", () => {
    const store = createAppStore();

    store.getState().openFile({
      path: "/docs/guide.md",
      name: "guide.md",
      content: "# Guide",
      lastModified: "2026-03-28T00:00:00.000Z",
      size: 7
    });
    store.getState().setDirtyContent("# Guide\n\nDraft");

    expect(store.getState().dirtyContent).toBe("# Guide\n\nDraft");
    expect(store.getState().isDirty()).toBe(true);
  });

  it("replaces the tree without clearing the open file", () => {
    const store = createAppStore();

    store.getState().openFile({
      path: "/docs/guide.md",
      name: "guide.md",
      content: "# Guide",
      lastModified: "2026-03-28T00:00:00.000Z",
      size: 7
    });
    store.getState().setFileTree([
      {
        id: "root",
        name: "root",
        path: "/docs",
        isFolder: true,
        children: []
      }
    ]);

    expect(store.getState().currentFile?.path).toBe("/docs/guide.md");
    expect(store.getState().fileTree).toHaveLength(1);
  });

  it("resets save state, cursor state, and conflict state when opening a file", () => {
    const store = createAppStore();

    store.getState().setDirtyContent("draft");
    store.getState().setSaveStatus("error");
    store.getState().setCursorPosition({ line: 4, column: 2 });
    store.getState().setExternalFileSnapshot({
      path: "/docs/guide.md",
      name: "guide.md",
      content: "# External",
      lastModified: "2026-03-28T00:00:00.000Z",
      size: 10
    });

    store.getState().openFile({
      path: "/docs/guide.md",
      name: "guide.md",
      content: "# Guide",
      lastModified: "2026-03-28T00:00:00.000Z",
      size: 7
    });

    expect(store.getState().saveStatus).toBe("saved");
    expect(store.getState().cursorPosition).toBeNull();
    expect(store.getState().externalFileSnapshot).toBeNull();
    expect(store.getState().dirtyContent).toBeNull();
  });

  it("stores save status, cursor position, and external snapshots independently", () => {
    const store = createAppStore();

    store.getState().setSaveStatus("saving");
    store.getState().setCursorPosition({ line: 12, column: 8 });
    store.getState().setExternalFileSnapshot({
      path: "/docs/guide.md",
      name: "guide.md",
      content: "# External",
      lastModified: "2026-03-28T00:00:00.000Z",
      size: 10
    });

    expect(store.getState().saveStatus).toBe("saving");
    expect(store.getState().cursorPosition).toEqual({ line: 12, column: 8 });
    expect(store.getState().externalFileSnapshot?.content).toBe("# External");
  });

  it("clears the active file state when a root update excludes the open file", () => {
    const store = createAppStore();

    store.getState().openFile({
      path: "/docs/guide.md",
      name: "guide.md",
      content: "# Guide",
      lastModified: "2026-03-28T00:00:00.000Z",
      size: 7
    });
    store.getState().setDirtyContent("draft");
    store.getState().setCursorPosition({ line: 3, column: 5 });

    store.getState().applyRootUpdate("/workspace/notes", [
      {
        id: "root",
        name: "notes",
        path: "/workspace/notes",
        isFolder: true,
        children: []
      }
    ]);

    expect(store.getState().currentRootPath).toBe("/workspace/notes");
    expect(store.getState().currentFile).toBeNull();
    expect(store.getState().dirtyContent).toBeNull();
    expect(store.getState().cursorPosition).toBeNull();
  });

  it("opens a virtual sample file without adding it to recent files", () => {
    const store = createAppStore();

    store.getState().openFile({
      path: "/docs/guide.md",
      name: "guide.md",
      content: "# Guide",
      lastModified: "2026-03-28T00:00:00.000Z",
      size: 7
    });

    store.getState().openSampleFile();

    expect(store.getState().currentFile?.path).toBe("markiniser://sample/welcome.md");
    expect(store.getState().currentFile?.name).toBe("Markiniser Sample.md");
    expect(store.getState().currentFile?.isVirtual).toBe(true);
    expect(store.getState().recentFiles).toEqual(["/docs/guide.md"]);
    expect(store.getState().saveStatus).toBe("saved");
  });
});
