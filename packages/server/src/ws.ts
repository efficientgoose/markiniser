import type { Core } from "@markiniser/core";
import websocket from "@fastify/websocket";
import type { FastifyInstance } from "fastify";
import type { WebSocket } from "ws";

interface FileEventPayload {
  path: string;
  tree: unknown[];
}

interface SocketLike {
  OPEN: number;
  readyState: number;
  send(message: string): void;
  close?(): void;
}

export function bindWatcherBroadcasts(core: Core, sockets: Set<SocketLike>): () => void {
  const broadcast = (
    event: "file-added" | "file-changed" | "file-removed",
    payload: FileEventPayload
  ) => {
    const message = JSON.stringify({
      event,
      path: payload.path,
      tree: payload.tree
    });

    for (const socket of sockets) {
      if (socket.readyState === socket.OPEN) {
        socket.send(message);
      }
    }
  };

  const handleFileAdded = (payload: { path: string; tree: unknown[] }) => {
    broadcast("file-added", payload);
  };
  const handleFileChanged = (payload: { path: string; tree: unknown[] }) => {
    broadcast("file-changed", payload);
  };
  const handleFileRemoved = (payload: { path: string; tree: unknown[] }) => {
    broadcast("file-removed", payload);
  };

  core.watcher.on("file-added", handleFileAdded);
  core.watcher.on("file-changed", handleFileChanged);
  core.watcher.on("file-removed", handleFileRemoved);

  return () => {
    core.watcher.off("file-added", handleFileAdded);
    core.watcher.off("file-changed", handleFileChanged);
    core.watcher.off("file-removed", handleFileRemoved);
  };
}

export async function registerWebSocket(app: FastifyInstance, core: Core): Promise<void> {
  await app.register(websocket);

  const sockets = new Set<WebSocket>();

  app.get("/ws", { websocket: true }, (socket) => {
    sockets.add(socket);
    socket.on("close", () => {
      sockets.delete(socket);
    });
  });

  const cleanup = bindWatcherBroadcasts(core, sockets);

  app.addHook("onClose", async () => {
    cleanup();

    for (const socket of sockets) {
      socket.close();
    }
    sockets.clear();
  });
}
