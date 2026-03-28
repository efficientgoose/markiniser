import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "../src/App";

const guideResponse = {
  content: "# Guide\n\nHello world",
  name: "guide.md",
  path: "/docs/guide.md",
  lastModified: "2026-03-28T00:00:00.000Z",
  size: 20
};

const treeResponse = {
  tree: [
    {
      id: "root",
      name: "docs",
      path: "/docs",
      isFolder: true,
      children: [
        {
          id: "guide",
          name: "guide.md",
          path: "/docs/guide.md",
          isFolder: false,
          size: 20,
          lastModified: "2026-03-28T00:00:00.000Z"
        }
      ]
    }
  ]
};

const rootConfigResponse = {
  roots: ["/docs"]
};

let currentGuideResponse = { ...guideResponse };
let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  currentGuideResponse = { ...guideResponse };
  fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (url.includes("/api/files/%2Fdocs%2Fguide.md") && init?.method === "PUT") {
      const body = JSON.parse(String(init.body)) as { content: string };
      currentGuideResponse = {
        ...currentGuideResponse,
        content: body.content,
        lastModified: "2026-03-28T00:05:00.000Z",
        size: body.content.length
      };
      return new Response(JSON.stringify({
        success: true,
        lastModified: currentGuideResponse.lastModified
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }

    if (url.includes("/api/files/%2Fdocs%2Fguide.md")) {
      return new Response(JSON.stringify(currentGuideResponse), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }

    if (url.includes("/api/search")) {
      return new Response(
        JSON.stringify({
          results: [
            {
              path: "/docs/guide.md",
              name: "guide.md",
              snippet: "Hello world",
              score: 1
            }
          ],
          count: 1
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" }
        }
      );
    }

    if (url.includes("/api/config/root/browse")) {
      return new Response(JSON.stringify({
        path: "/workspace/notes"
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }

    if (url.includes("/api/config/root") && init?.method === "PUT") {
      return new Response(JSON.stringify({
        roots: ["/workspace/notes"],
        tree: [
          {
            id: "workspace-root",
            name: "notes",
            path: "/workspace/notes",
            isFolder: true,
            children: [
              {
                id: "workspace-file",
                name: "updated.md",
                path: "/workspace/notes/updated.md",
                isFolder: false,
                size: 16,
                lastModified: "2026-03-28T00:00:00.000Z"
              }
            ]
          }
        ]
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }

    if (url.includes("/api/config")) {
      return new Response(JSON.stringify(rootConfigResponse), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }

    return new Response(JSON.stringify(treeResponse), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  });
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("App", () => {
  it("loads the tree and shows the empty state before file selection", async () => {
    render(<App />);

    expect(await screen.findByTestId("app-shell")).toHaveClass("theme-mocha");
    expect(await screen.findByRole("button", { name: "Open search palette" })).toBeInTheDocument();
    expect(
      await screen.findByText("Select a file from the sidebar or search to start editing")
    ).toBeInTheDocument();
    expect(await screen.findByText("guide.md")).toBeInTheDocument();
    expect(await screen.findByRole("button", { name: "Load sample file" })).toBeInTheDocument();
  });

  it("opens a file and renders raw content in the main panel", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(await screen.findByText("guide.md"));

    expect(await screen.findByLabelText("Markdown editor")).toBeInTheDocument();
    expect(await screen.findByText("Saved")).toBeInTheDocument();
    expect((await screen.findAllByText("Hello world")).length).toBeGreaterThan(0);
    expect(screen.getAllByText("guide.md").length).toBeGreaterThan(0);
  });

  it("switches between preview-only and editor-only modes from the pane controls", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(await screen.findByText("guide.md"));

    expect(await screen.findByLabelText("Markdown editor")).toBeInTheDocument();
    expect(screen.getByTestId("preview-surface")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Toggle preview focus" }));

    await waitFor(() => {
      expect(screen.queryByLabelText("Markdown editor")).not.toBeInTheDocument();
      expect(screen.queryByText("Saved")).not.toBeInTheDocument();
      expect(screen.getByTestId("preview-surface")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Show split view" })).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: "Show split view" }));

    await waitFor(() => {
      expect(screen.getByLabelText("Markdown editor")).toBeInTheDocument();
      expect(screen.getByTestId("preview-surface")).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Show split view" })).not.toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: "Toggle editor focus" }));

    await waitFor(() => {
      expect(screen.getByLabelText("Markdown editor")).toBeInTheDocument();
      expect(screen.queryByTestId("preview-surface")).not.toBeInTheDocument();
      expect(screen.getByText("Saved")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Show split view" })).toBeInTheDocument();
    });
  });

  it("opens the command palette with Cmd/Ctrl+K and shows recent files plus commands", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(await screen.findByText("guide.md"));

    fireEvent.keyDown(window, { key: "k", metaKey: true });

    const palette = await screen.findByRole("dialog", { name: "Search markdown files and commands" });
    expect(within(palette).getByTestId("command-palette-header")).toBeInTheDocument();
    expect(within(palette).getByText("esc")).toBeInTheDocument();
    expect(within(palette).getByText("Recent files")).toBeInTheDocument();
    expect(within(palette).getByText("Commands")).toBeInTheDocument();
    expect(within(palette).getByText("guide.md")).toBeInTheDocument();
    expect(within(palette).getByText("Toggle Preview Panel")).toBeInTheDocument();
    expect(within(palette).getByText("Toggle Sidebar")).toBeInTheDocument();
    expect(within(palette).getByText("Refresh File Tree")).toBeInTheDocument();
  });

  it("hides the recent files heading when there is no file history", async () => {
    render(<App />);

    fireEvent.keyDown(window, { key: "k", metaKey: true });

    const palette = await screen.findByRole("dialog", { name: "Search markdown files and commands" });
    expect(within(palette).queryByText("Recent files")).not.toBeInTheDocument();
    expect(within(palette).getByText("Commands")).toBeInTheDocument();
  });

  it("searches through the command palette and opens a selected result", async () => {
    const user = userEvent.setup();
    render(<App />);

    fireEvent.keyDown(window, { key: "k", metaKey: true });

    const palette = await screen.findByRole("dialog", { name: "Search markdown files and commands" });
    const input = within(palette).getByPlaceholderText("Search markdown files and commands");

    vi.useFakeTimers();
    fireEvent.change(input, { target: { value: "guide" } });

    expect(fetchMock).not.toHaveBeenCalledWith("/api/search?q=guide");

    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });
    await Promise.resolve();
    vi.useRealTimers();

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/api/search?q=guide");
    });

    expect(await within(palette).findByText("Search results (1 match)")).toBeInTheDocument();
    expect(await within(palette).findByText("Hello world")).toBeInTheDocument();

    await user.click(within(palette).getByText("guide.md"));

    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "Search markdown files and commands" })).not.toBeInTheDocument();
      expect(screen.getByLabelText("Markdown editor")).toBeInTheDocument();
    });
  });

  it("opens the root picker modal, browses for a folder, and reloads the tree", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(await screen.findByRole("button", { name: "Edit root path" }));

    const modal = await screen.findByRole("dialog", { name: "Change markdown root" });
    expect(within(modal).getAllByText("/docs")).toHaveLength(2);

    await user.click(within(modal).getByRole("button", { name: "Browse folder" }));

    expect(await within(modal).findByText("/workspace/notes")).toBeInTheDocument();

    await user.click(within(modal).getByRole("button", { name: "Apply root" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/api/config/root", expect.objectContaining({
        method: "PUT"
      }));
    });

    expect(await screen.findByText("updated.md")).toBeInTheDocument();
    expect(await screen.findByText("Root folder updated")).toBeInTheDocument();
    expect(screen.queryByRole("dialog", { name: "Change markdown root" })).not.toBeInTheDocument();
  });

  it("collapses and reopens the sidebar from the chevron rail", async () => {
    const user = userEvent.setup();
    render(<App />);

    expect(await screen.findByText("guide.md")).toBeInTheDocument();

    expect(screen.getByRole("button", { name: "Collapse sidebar" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Collapse sidebar" }));

    expect(screen.queryByText("guide.md")).not.toBeInTheDocument();

    expect(screen.getByRole("button", { name: "Expand sidebar" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Expand sidebar" }));

    expect(await screen.findByText("guide.md")).toBeInTheDocument();
  });

  it("uses a balanced editor and preview split when the sidebar is collapsed", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "Collapse sidebar" }));

    expect(screen.getByTestId("workspace-grid")).toHaveStyle({
      gridTemplateColumns: "0px 8px minmax(0, 1fr) 8px minmax(0, 1fr)"
    });
  });

  it("collapses the sidebar when resizing below the minimum width", async () => {
    render(<App />);

    await screen.findByText("guide.md");

    const workspaceGrid = screen.getByTestId("workspace-grid");
    const sidebarDivider = workspaceGrid.children[1] as HTMLElement;

    fireEvent.mouseDown(sidebarDivider, { clientX: 300 });
    fireEvent.mouseMove(window, { clientX: 150 });
    fireEvent.mouseUp(window);

    expect(screen.queryByText("guide.md")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Expand sidebar" })).toBeInTheDocument();
  });

  it("disables the grid transition while actively resizing the sidebar", async () => {
    render(<App />);

    await screen.findByText("guide.md");

    const workspaceGrid = screen.getByTestId("workspace-grid");
    const sidebarDivider = workspaceGrid.children[1] as HTMLElement;

    fireEvent.mouseDown(sidebarDivider, { clientX: 300 });
    fireEvent.mouseMove(window, { clientX: 280 });

    expect(workspaceGrid).toHaveStyle({ transition: "none" });

    fireEvent.mouseUp(window);

    expect(workspaceGrid).toHaveStyle({
      transition: "grid-template-columns 220ms ease"
    });
  });

  it("autosaves dirty editor content after debounce", async () => {
    render(<App />);

    const user = userEvent.setup();
    await user.click(await screen.findByText("guide.md"));

    const editor = await screen.findByLabelText("Markdown editor");
    vi.useFakeTimers();
    await act(async () => {
      fireEvent.change(editor, {
        target: {
          value: "# Guide\n\nHello world updated"
        }
      });
    });

    expect(screen.getByText("Unsaved changes")).toBeInTheDocument();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });
    await Promise.resolve();
    vi.useRealTimers();

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/files/%2Fdocs%2Fguide.md",
        expect.objectContaining({
          method: "PUT"
        })
      );
    });

    expect(await screen.findByText("Saved")).toBeInTheDocument();
  });

  it("opens an in-memory sample file from the empty state", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(await screen.findByRole("button", { name: "Load sample file" }));

    expect(await screen.findByLabelText("Markdown editor")).toBeInTheDocument();
    expect(await screen.findByText("Markiniser Sample.md")).toBeInTheDocument();
    expect(await screen.findByText("Sample file · local only")).toBeInTheDocument();
    expect((await screen.findAllByText("Command Palette")).length).toBeGreaterThan(0);
    expect(
      screen.getAllByText("Edit your markdown files with live preview, autosave, and a local-first workflow.").length
    ).toBeGreaterThan(0);
  });
});
