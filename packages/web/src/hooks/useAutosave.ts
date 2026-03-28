import { useEffect, useEffectEvent } from "react";
import type { CurrentFile } from "../types";
import { saveFile } from "../lib/api";
import type { AppStore } from "../store/useAppStore";

export interface UseAutosaveOptions {
  store: AppStore;
  currentFile: CurrentFile | null;
  dirtyContent: string | null;
}

export function useAutosave({
  store,
  currentFile,
  dirtyContent
}: UseAutosaveOptions) {
  const saveNow = useEffectEvent(async () => {
    const state = store.getState();
    const activeFile = state.currentFile;
    const contentToSave = state.dirtyContent;
    if (!activeFile || contentToSave === null) {
      return;
    }

    state.setSaveStatus("saving");

    try {
      const response = await saveFile(activeFile.path, contentToSave);
      store.setState((currentState) => {
        if (
          !currentState.currentFile ||
          currentState.currentFile.path !== activeFile.path
        ) {
          return currentState;
        }

        return {
          ...currentState,
          currentFile: {
            ...currentState.currentFile,
            content: contentToSave,
            lastModified: response.lastModified,
            size: contentToSave.length
          },
          dirtyContent: null,
          saveStatus: "saved",
          externalChangeNotice: null,
          externalFileSnapshot: null
        };
      });
    } catch {
      store.getState().setSaveStatus("error");
    }
  });

  useEffect(() => {
    if (!currentFile || dirtyContent === null) {
      return;
    }

    const timeout = window.setTimeout(() => {
      void saveNow();
    }, 2000);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [currentFile, dirtyContent, saveNow]);

  return {
    saveNow
  };
}
