import type { FileAccessManager } from "./fileAccess.js";
import { createFileAccess } from "./fileAccess.js";
import type { SearchIndexer } from "./indexer.js";
import { createSearchIndexer } from "./indexer.js";
import type { ScanResult } from "./scanner.js";
import { scanMarkdownFiles } from "./scanner.js";
import type { FileWatcher } from "./watcher.js";
import { createFileWatcher } from "./watcher.js";
import type { FlatFile, MarkiniserConfig, TreeNode } from "./types.js";

export { loadConfig } from "./config.js";
export { scanMarkdownFiles } from "./scanner.js";
export { createSearchIndexer } from "./indexer.js";
export { createFileAccess } from "./fileAccess.js";
export { createFileWatcher } from "./watcher.js";
export type {
  FileMetadata,
  FlatFile,
  MarkiniserConfig,
  SearchResult,
  TreeNode
} from "./types.js";

export interface Core {
  config: MarkiniserConfig;
  scanner: {
    scan(): Promise<ScanResult>;
  };
  indexer: SearchIndexer;
  watcher: FileWatcher;
  fileAccess: FileAccessManager;
  getTree(): TreeNode[];
  getFiles(): FlatFile[];
}

export async function createCore(config: MarkiniserConfig): Promise<Core> {
  const fileAccess = createFileAccess(config.roots);
  let currentScan = await scanMarkdownFiles(config);
  const indexer = createSearchIndexer(currentScan.files);

  const refreshScan = async () => {
    currentScan = await scanMarkdownFiles(config);
    return currentScan.tree;
  };

  const watcher = createFileWatcher({
    config,
    indexer,
    refreshTree: refreshScan
  });

  return {
    config,
    scanner: {
      async scan() {
        await refreshScan();
        return currentScan;
      }
    },
    indexer,
    watcher,
    fileAccess,
    getTree() {
      return currentScan.tree;
    },
    getFiles() {
      return currentScan.files;
    }
  };
}
