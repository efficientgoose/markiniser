import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { AppStoreProvider, createAppStore } from "../src/store/useAppStore";
import { FileTreeSidebar } from "../src/components/FileTreeSidebar";

vi.mock("../src/lib/api", async () => {
  const actual = await vi.importActual<typeof import("../src/lib/api")>("../src/lib/api");
  return {
    ...actual,
    fetchFile: vi.fn(async (path: string) => ({
      path,
      name: path.split("/").at(-1) ?? "file.md",
      content: "# File",
      lastModified: "2026-03-28T00:00:00.000Z",
      size: 6
    }))
  };
});

describe("FileTreeSidebar", () => {
  it("shows loading skeleton rows while the tree is loading", () => {
    const store = createAppStore();
    store.getState().setTreeLoading(true);

    render(
      <AppStoreProvider store={store}>
        <FileTreeSidebar />
      </AppStoreProvider>
    );

    expect(screen.getAllByTestId("file-tree-skeleton-row")).toHaveLength(4);
  });

  it("shows an empty state after loading when no files exist", () => {
    const store = createAppStore();
    store.getState().setFileTree([]);

    render(
      <AppStoreProvider store={store}>
        <FileTreeSidebar />
      </AppStoreProvider>
    );

    expect(screen.getByText("No files found")).toBeInTheDocument();
    expect(screen.getByText("Check your .markiniserrc roots and ignore rules.")).toBeInTheDocument();
  });

  it("shows recursive file counts and opens files on selection", async () => {
    const user = userEvent.setup();
    const store = createAppStore();
    store.getState().setFileTree([
      {
        id: "docs",
        name: "docs",
        path: "/docs",
        isFolder: true,
        children: [
          {
            id: "guide",
            name: "guide.md",
            path: "/docs/guide.md",
            isFolder: false
          },
          {
            id: "nested",
            name: "nested",
            path: "/docs/nested",
            isFolder: true,
            children: [
              {
                id: "child",
                name: "child.md",
                path: "/docs/nested/child.md",
                isFolder: false
              }
            ]
          }
        ]
      }
    ]);

    render(
      <AppStoreProvider store={store}>
        <FileTreeSidebar />
      </AppStoreProvider>
    );

    expect(screen.getByText("docs")).toBeInTheDocument();
    expect(screen.getByText("(2)")).toBeInTheDocument();
    const nestedBranch = document.querySelector(
      'div[style*="border-left: 1px solid rgba(88, 91, 112, 0.42)"]'
    );
    expect(nestedBranch).not.toBeNull();

    await user.click(screen.getByRole("button", { name: "guide.md" }));

    expect(store.getState().currentFile?.path).toBe("/docs/guide.md");
  });

  it("expands only root folders by default", async () => {
    const user = userEvent.setup();
    const store = createAppStore();
    store.getState().setFileTree([
      {
        id: "docs",
        name: "docs",
        path: "/docs",
        isFolder: true,
        children: [
          {
            id: "nested",
            name: "nested",
            path: "/docs/nested",
            isFolder: true,
            children: [
              {
                id: "child",
                name: "child.md",
                path: "/docs/nested/child.md",
                isFolder: false
              }
            ]
          }
        ]
      }
    ]);

    render(
      <AppStoreProvider store={store}>
        <FileTreeSidebar />
      </AppStoreProvider>
    );

    expect(screen.getByRole("button", { name: "docs" })).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("button", { name: "nested" })).toHaveAttribute("aria-expanded", "false");

    await user.click(screen.getByRole("button", { name: "nested" }));

    expect(screen.getByRole("button", { name: "nested" })).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("button", { name: "child.md" })).toBeInTheDocument();
  });

  it("uses the dotted root icon for both expanded and collapsed root folders", async () => {
    const user = userEvent.setup();
    const store = createAppStore();
    store.getState().setFileTree([
      {
        id: "root",
        name: "workspace",
        path: "/workspace",
        isFolder: true,
        children: [
          {
            id: "readme",
            name: "README.md",
            path: "/workspace/README.md",
            isFolder: false
          }
        ]
      }
    ]);

    render(
      <AppStoreProvider store={store}>
        <FileTreeSidebar />
      </AppStoreProvider>
    );

    expect(screen.getByTestId("root-folder-open-icon")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "workspace" }));

    expect(screen.getByTestId("root-folder-closed-icon")).toBeInTheDocument();
  });

  it("expands ancestor folders for the active file", async () => {
    const store = createAppStore();
    store.getState().setFileTree([
      {
        id: "root",
        name: "workspace",
        path: "/workspace",
        isFolder: true,
        children: [
          {
            id: "docs",
            name: "docs",
            path: "/workspace/docs",
            isFolder: true,
            children: [
              {
                id: "plans",
                name: "plans",
                path: "/workspace/docs/plans",
                isFolder: true,
                children: [
                  {
                    id: "phase4",
                    name: "phase-4.md",
                    path: "/workspace/docs/plans/phase-4.md",
                    isFolder: false
                  }
                ]
              }
            ]
          }
        ]
      }
    ]);

    await store.getState().openFile({
      path: "/workspace/docs/plans/phase-4.md",
      name: "phase-4.md",
      content: "# Phase 4",
      lastModified: "2026-03-28T00:00:00.000Z",
      size: 9
    });

    render(
      <AppStoreProvider store={store}>
        <FileTreeSidebar />
      </AppStoreProvider>
    );

    expect(screen.getByRole("button", { name: "workspace" })).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("button", { name: "docs" })).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("button", { name: "plans" })).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("button", { name: "phase-4.md" })).toBeInTheDocument();
  });
});
