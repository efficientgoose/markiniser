import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "../src/App";

class FakeWebSocket {
  static instances: FakeWebSocket[] = [];
  static OPEN = 1;
  static CLOSED = 3;

  readyState = FakeWebSocket.OPEN;
  url: string;
  onmessage: ((event: MessageEvent<string>) => void) | null = null;
  onopen: (() => void) | null = null;
  onclose: (() => void) | null = null;

  constructor(url: string) {
    this.url = url;
    FakeWebSocket.instances.push(this);
    queueMicrotask(() => {
      this.onopen?.();
    });
  }

  close() {
    this.readyState = FakeWebSocket.CLOSED;
    this.onclose?.();
  }

  emit(data: unknown) {
    this.onmessage?.({ data: JSON.stringify(data) } as MessageEvent<string>);
  }
}

let currentGuideResponse = {
  content: "# Guide",
  name: "guide.md",
  path: "/docs/guide.md",
  lastModified: "2026-03-28T00:00:00.000Z",
  size: 7
};

beforeEach(() => {
  currentGuideResponse = {
    content: "# Guide",
    name: "guide.md",
    path: "/docs/guide.md",
    lastModified: "2026-03-28T00:00:00.000Z",
    size: 7
  };
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/api/files/%2Fdocs%2Fguide.md")) {
        return new Response(
          JSON.stringify(currentGuideResponse),
          {
            status: 200,
            headers: { "Content-Type": "application/json" }
          }
        );
      }

      return new Response(
        JSON.stringify({
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
                  size: 7,
                  lastModified: "2026-03-28T00:00:00.000Z"
                }
              ]
            }
          ]
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" }
        }
      );
    })
  );
  vi.stubGlobal("WebSocket", FakeWebSocket);
});

afterEach(() => {
  FakeWebSocket.instances = [];
  vi.unstubAllGlobals();
});

describe("useFileWatcher", () => {
  it("silently reloads the active file when there are no unsaved edits", async () => {
    const user = userEvent.setup();
    render(<App />);

    const socket = FakeWebSocket.instances[0];
    expect(socket).toBeDefined();

    await user.click(await screen.findByText("guide.md"));

    await screen.findByText("# Guide");

    await act(async () => {
      currentGuideResponse = {
        ...currentGuideResponse,
        content: "# Guide\n\nExternal update",
        lastModified: "2026-03-28T00:05:00.000Z",
        size: 24
      };
      socket?.emit({
        event: "file-changed",
        path: "/docs/guide.md",
        tree: [
          {
            id: "root",
            name: "docs",
            path: "/docs",
            isFolder: true,
            children: []
          }
        ]
      });
    });

    await waitFor(() => {
      expect(screen.getByLabelText("Markdown editor")).toHaveValue("# Guide\n\nExternal update");
    });
    expect(screen.queryByText(/changed outside the app/i)).not.toBeInTheDocument();
  });

  it("shows conflict actions when the active file changes during unsaved edits", async () => {
    const user = userEvent.setup();
    render(<App />);

    const socket = FakeWebSocket.instances[0];
    await user.click(await screen.findByText("guide.md"));

    const editor = await screen.findByLabelText("Markdown editor");
    fireEvent.change(editor, {
      target: {
        value: "# Guide\n\nMy local draft"
      }
    });

    await act(async () => {
      currentGuideResponse = {
        ...currentGuideResponse,
        content: "# Guide\n\nExternal update",
        lastModified: "2026-03-28T00:05:00.000Z",
        size: 24
      };
      socket?.emit({
        event: "file-changed",
        path: "/docs/guide.md",
        tree: [
          {
            id: "root",
            name: "docs",
            path: "/docs",
            isFolder: true,
            children: []
          }
        ]
      });
    });

    expect(await screen.findByText(/guide.md changed outside the app/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Keep mine" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Load external" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Load external" }));

    await waitFor(() => {
      expect(screen.getByLabelText("Markdown editor")).toHaveValue("# Guide\n\nExternal update");
    });
  });
});
