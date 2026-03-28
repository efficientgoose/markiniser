import { useMemo } from "react";
import { FileTree } from "./ui/file-tree";
import { useAppStore, useAppStoreApi } from "../store/useAppStore";
import {
  collectFolderIds,
  findAncestorFolderIds,
  transformTreeNodes
} from "../utils/treeTransform";

export function FileTreeSidebar() {
  const store = useAppStoreApi();
  const fileTree = useAppStore((state) => state.fileTree);
  const isTreeLoading = useAppStore((state) => state.isTreeLoading);
  const currentFile = useAppStore((state) => state.currentFile);

  const elements = useMemo(() => transformTreeNodes(fileTree), [fileTree]);
  const initialExpandedIds = useMemo(() => collectFolderIds(elements), [elements]);
  const expandedIds = useMemo(
    () => findAncestorFolderIds(elements, currentFile?.path),
    [elements, currentFile?.path]
  );

  if (isTreeLoading) {
    return (
      <div className="rounded-lg bg-[color:var(--ctp-mantle)]">
        <div className="space-y-2 px-2 py-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              data-testid="file-tree-skeleton-row"
              className="h-8 animate-pulse rounded-[6px] bg-[color:rgba(49,50,68,0.5)]"
            />
          ))}
        </div>
      </div>
    );
  }

  if (elements.length === 0) {
    return (
      <div className="flex h-full min-h-[220px] items-center justify-center rounded-lg bg-[color:var(--ctp-mantle)] px-4 text-center">
        <div>
          <div className="text-sm text-[color:var(--ctp-text)]">No files found</div>
          <div className="mt-2 text-xs text-[color:var(--ctp-subtext0)]">
            Check your .markiniserrc roots and ignore rules.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg bg-[color:var(--ctp-mantle)]">
      <FileTree
        elements={elements}
        selectedId={currentFile?.path ?? null}
        initialExpandedIds={initialExpandedIds}
        expandedIds={expandedIds}
        onSelect={(element) => {
          if (element.type !== "file") {
            return;
          }

          void store.getState().openFile(element.path);
        }}
      />
    </div>
  );
}
