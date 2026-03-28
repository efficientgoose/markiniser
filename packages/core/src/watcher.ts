import { EventEmitter } from "node:events";
import { readFile, stat } from "node:fs/promises";
import { basename, extname } from "node:path";
import chokidar, { type FSWatcher } from "chokidar";
import type { SearchIndexer } from "./indexer.js";
import { scanMarkdownFiles } from "./scanner.js";
import type { FlatFile, MarkiniserConfig, TreeNode } from "./types.js";

export interface FileWatcherEventMap {
  "file-added": [payload: { path: string; tree: TreeNode[]; file?: FlatFile }];
  "file-changed": [payload: { path: string; tree: TreeNode[]; file?: FlatFile }];
  "file-removed": [payload: { path: string; tree: TreeNode[] }];
  "watcher-warning": [warning: Error & { code?: string }];
}

export interface FileWatcher extends EventEmitter<FileWatcherEventMap> {
  start(): Promise<void>;
  stop(): Promise<void>;
}

export interface CreateFileWatcherOptions {
  config: MarkiniserConfig;
  indexer: SearchIndexer;
  refreshTree: () => Promise<TreeNode[]>;
}

function normalizeIgnorePatterns(ignorePatterns: string[]): string[] {
  return Array.from(
    new Set(
      ignorePatterns.flatMap((pattern) => {
        const normalizedPattern = pattern.replace(/\\/g, "/").replace(/^\.\/+/, "");
        if (normalizedPattern.includes("*")) {
          return [normalizedPattern];
        }
        return [
          normalizedPattern,
          `${normalizedPattern}/**`,
          `**/${normalizedPattern}`,
          `**/${normalizedPattern}/**`
        ];
      })
    )
  );
}

function isMarkdownFile(filePath: string): boolean {
  return extname(filePath).toLowerCase() === ".md";
}

async function readFlatFile(filePath: string): Promise<FlatFile> {
  const [content, metadata] = await Promise.all([readFile(filePath, "utf8"), stat(filePath)]);
  return {
    path: filePath,
    name: basename(filePath),
    content,
    size: metadata.size,
    lastModified: metadata.mtime.toISOString()
  };
}

class MarkiniserWatcher extends EventEmitter<FileWatcherEventMap> implements FileWatcher {
  private readonly ignorePatterns: string[];
  private fsWatcher?: FSWatcher;

  constructor(private readonly options: CreateFileWatcherOptions) {
    super();
    this.ignorePatterns = normalizeIgnorePatterns(options.config.ignore);
  }

  async start(): Promise<void> {
    if (this.fsWatcher) {
      return;
    }

    this.fsWatcher = chokidar.watch(this.options.config.roots, {
      ignoreInitial: true,
      ignored: this.ignorePatterns
    });

    this.fsWatcher.on("add", (filePath) => {
      void this.handleUpsert("file-added", filePath);
    });
    this.fsWatcher.on("change", (filePath) => {
      void this.handleUpsert("file-changed", filePath);
    });
    this.fsWatcher.on("unlink", (filePath) => {
      void this.handleRemove(filePath);
    });
    this.fsWatcher.on("error", (error) => {
      const normalizedError =
        error instanceof Error ? error : new Error(String(error));
      this.emit("watcher-warning", normalizedError as Error & { code?: string });
    });
  }

  async stop(): Promise<void> {
    if (!this.fsWatcher) {
      return;
    }

    await this.fsWatcher.close();
    this.fsWatcher = undefined;
  }

  private async handleUpsert(
    eventName: "file-added" | "file-changed",
    filePath: string
  ): Promise<void> {
    if (!isMarkdownFile(filePath)) {
      return;
    }

    const file = await readFlatFile(filePath);
    if (eventName === "file-added") {
      this.options.indexer.addToIndex(file);
    } else {
      this.options.indexer.updateIndex(file);
    }

    const tree = await this.options.refreshTree();
    this.emit(eventName, { path: filePath, tree, file });
  }

  private async handleRemove(filePath: string): Promise<void> {
    if (!isMarkdownFile(filePath)) {
      return;
    }

    this.options.indexer.removeFromIndex(filePath);
    const tree = await this.options.refreshTree();
    this.emit("file-removed", { path: filePath, tree });
  }
}

export function createFileWatcher(options: CreateFileWatcherOptions): FileWatcher {
  return new MarkiniserWatcher(options);
}
