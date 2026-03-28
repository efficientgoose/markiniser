import { useEffect } from "react";
import type { WatcherMessage } from "../types";
import { fetchFile } from "../lib/api";
import { useAppStoreApi } from "../store/useAppStore";

export function useFileWatcher() {
  const store = useAppStoreApi();

  useEffect(() => {
    let socket: WebSocket | null = null;
    let reconnectDelay = 1000;
    let reconnectTimer: number | undefined;
    let disposed = false;

    const connect = () => {
      if (disposed) {
        return;
      }

      store.getState().setWatcherStatus("connecting");
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      socket = new WebSocket(`${protocol}//${window.location.host}/ws`);

      socket.onopen = () => {
        reconnectDelay = 1000;
        store.getState().setWatcherStatus("connected");
      };

      socket.onmessage = (event) => {
        const payload = JSON.parse(event.data) as WatcherMessage;
        store.getState().setFileTree(payload.tree);

        void (async () => {
          const currentState = store.getState();
          if (currentState.currentFile?.path !== payload.path) {
            return;
          }

          const latestFile = await fetchFile(payload.path);
          const refreshedState = store.getState();

          if (refreshedState.currentFile?.path !== payload.path) {
            return;
          }

          if (!refreshedState.isDirty()) {
            refreshedState.openFile(latestFile);
            return;
          }

          refreshedState.setExternalFileSnapshot(latestFile);
          refreshedState.setExternalChangeNotice(
            `${refreshedState.currentFile.name} changed outside the app`
          );
        })();
      };

      socket.onclose = () => {
        store.getState().setWatcherStatus("disconnected");
        if (!disposed) {
          reconnectTimer = window.setTimeout(() => {
            reconnectDelay = Math.min(reconnectDelay * 2, 8000);
            connect();
          }, reconnectDelay);
        }
      };
    };

    connect();

    return () => {
      disposed = true;
      if (reconnectTimer) {
        window.clearTimeout(reconnectTimer);
      }
      socket?.close();
    };
  }, [store]);
}
