import type { TreeNode } from "@markiniser/core";
import { createContext, useContext, useRef, type ReactNode } from "react";
import { createStore, type StoreApi } from "zustand/vanilla";
import { useStore } from "zustand";
import { fetchFile, fetchFileTree } from "../lib/api";
import { createSampleFile } from "../lib/sampleFile";
import type { CurrentFile, RenameFileResponse } from "../types";

export interface CursorPosition {
  line: number;
  column: number;
}

export interface AppStoreState {
  fileTree: TreeNode[];
  isTreeLoading: boolean;
  currentRootPath: string | null;
  currentFile: CurrentFile | null;
  recentFiles: string[];
  dirtyContent: string | null;
  saveStatus: "saved" | "saving" | "unsaved" | "error";
  isPreviewOpen: boolean;
  isSidebarOpen: boolean;
  externalChangeNotice: string | null;
  externalFileSnapshot: CurrentFile | null;
  cursorPosition: CursorPosition | null;
  sidebarWidth: number;
  previewWidth: number;
  setFileTree(tree: TreeNode[]): void;
  setTreeLoading(isLoading: boolean): void;
  loadTree(): Promise<void>;
  openFile(fileOrPath: CurrentFile | string): Promise<void>;
  openSampleFile(): void;
  applyRootUpdate(rootPath: string, tree: TreeNode[]): void;
  applyFileRename(rename: RenameFileResponse): void;
  setDirtyContent(content: string | null): void;
  setSaveStatus(status: AppStoreState["saveStatus"]): void;
  setPreviewOpen(isOpen: boolean): void;
  setSidebarOpen(isOpen: boolean): void;
  setExternalChangeNotice(message: string | null): void;
  setExternalFileSnapshot(file: CurrentFile | null): void;
  setCursorPosition(position: CursorPosition | null): void;
  setSidebarWidth(width: number): void;
  setPreviewWidth(width: number): void;
  isDirty(): boolean;
}

export type AppStore = StoreApi<AppStoreState>;

export function createAppStore(): AppStore {
  return createStore<AppStoreState>((set, get) => ({
    fileTree: [],
    isTreeLoading: true,
    currentRootPath: null,
    currentFile: null,
    recentFiles: [],
    dirtyContent: null,
    saveStatus: "saved",
    isPreviewOpen: true,
    isSidebarOpen: true,
    externalChangeNotice: null,
    externalFileSnapshot: null,
    cursorPosition: null,
    sidebarWidth: 300,
    previewWidth: 0,
    setFileTree(tree) {
      set({ fileTree: tree, isTreeLoading: false });
    },
    setTreeLoading(isLoading) {
      set({ isTreeLoading: isLoading });
    },
    async loadTree() {
      set({ isTreeLoading: true });
      try {
        const response = await fetchFileTree();
        set({
          fileTree: response.tree,
          currentRootPath: response.tree[0]?.path ?? get().currentRootPath,
          isTreeLoading: false
        });
      } catch (error) {
        set({ isTreeLoading: false });
        throw error;
      }
    },
    async openFile(fileOrPath) {
      const file = typeof fileOrPath === "string" ? await fetchFile(fileOrPath) : fileOrPath;
      const recentFiles = file.isVirtual
        ? get().recentFiles
        : [file.path, ...get().recentFiles.filter((path) => path !== file.path)].slice(0, 3);
      set({
        currentFile: file,
        recentFiles,
        dirtyContent: null,
        saveStatus: "saved",
        externalChangeNotice: null,
        externalFileSnapshot: null,
        cursorPosition: null
      });
    },
    openSampleFile() {
      const file = createSampleFile();
      set({
        currentFile: file,
        dirtyContent: null,
        saveStatus: "saved",
        externalChangeNotice: null,
        externalFileSnapshot: null,
        cursorPosition: null
      });
    },
    applyRootUpdate(rootPath, tree) {
      const currentFile = get().currentFile;
      const fileStillInsideRoot = currentFile
        ? currentFile.path === rootPath || currentFile.path.startsWith(`${rootPath}/`)
        : false;

      set({
        currentRootPath: rootPath,
        fileTree: tree,
        isTreeLoading: false,
        currentFile: fileStillInsideRoot ? currentFile : null,
        dirtyContent: fileStillInsideRoot ? get().dirtyContent : null,
        saveStatus: fileStillInsideRoot ? get().saveStatus : "saved",
        externalChangeNotice: fileStillInsideRoot ? get().externalChangeNotice : null,
        externalFileSnapshot: fileStillInsideRoot ? get().externalFileSnapshot : null,
        cursorPosition: fileStillInsideRoot ? get().cursorPosition : null
      });
    },
    applyFileRename(rename) {
      const currentFile = get().currentFile;
      const previousPath = currentFile?.path;

      set({
        fileTree: rename.tree,
        currentFile: currentFile
          ? {
              ...currentFile,
              path: rename.path,
              name: rename.name,
              size: rename.size,
              lastModified: rename.lastModified
            }
          : currentFile,
        recentFiles: previousPath
          ? [
              rename.path,
              ...get().recentFiles.filter((path) => path !== previousPath && path !== rename.path)
            ].slice(0, 3)
          : get().recentFiles
      });
    },
    setDirtyContent(content) {
      set({ dirtyContent: content });
    },
    setSaveStatus(status) {
      set({ saveStatus: status });
    },
    setPreviewOpen(isOpen) {
      set({ isPreviewOpen: isOpen });
    },
    setSidebarOpen(isOpen) {
      set({ isSidebarOpen: isOpen });
    },
    setExternalChangeNotice(message) {
      set({ externalChangeNotice: message });
    },
    setExternalFileSnapshot(file) {
      set({ externalFileSnapshot: file });
    },
    setCursorPosition(position) {
      set((state) => {
        if (
          state.cursorPosition?.line === position?.line &&
          state.cursorPosition?.column === position?.column
        ) {
          return state;
        }

        return { cursorPosition: position };
      });
    },
    setSidebarWidth(width) {
      set({ sidebarWidth: Math.max(220, Math.min(width, 460)) });
    },
    setPreviewWidth(width) {
      set({ previewWidth: Math.max(280, Math.min(width, 520)) });
    },
    isDirty() {
      return get().dirtyContent !== null;
    }
  }));
}

const AppStoreContext = createContext<AppStore | null>(null);

export function AppStoreProvider({
  children,
  store
}: {
  children: ReactNode;
  store?: AppStore;
}) {
  const storeRef = useRef<AppStore | null>(null);
  if (storeRef.current === null) {
    storeRef.current = store ?? createAppStore();
  } else if (store) {
    storeRef.current = store;
  }

  if (storeRef.current === null) {
    storeRef.current = createAppStore();
  }

  return (
    <AppStoreContext.Provider value={storeRef.current}>
      {children}
    </AppStoreContext.Provider>
  );
}

export function useAppStore<T>(selector: (state: AppStoreState) => T): T {
  const store = useContext(AppStoreContext);
  if (!store) {
    throw new Error("useAppStore must be used inside AppStoreProvider.");
  }

  return useStore(store, selector);
}

export function useAppStoreApi(): AppStore {
  const store = useContext(AppStoreContext);
  if (!store) {
    throw new Error("useAppStoreApi must be used inside AppStoreProvider.");
  }

  return store;
}
