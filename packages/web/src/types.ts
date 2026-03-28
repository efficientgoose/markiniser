import type { SearchResult, TreeNode } from "@markiniser/core";

export type { SearchResult, TreeNode };

export interface CurrentFile {
  path: string;
  name: string;
  content: string;
  lastModified: string;
  size: number;
}

export interface FileTreeResponse {
  tree: TreeNode[];
}

export interface SearchResponse {
  results: SearchResult[];
  count: number;
}

export interface SaveFileResponse {
  success: boolean;
  lastModified: string;
}

export interface WatcherMessage {
  event: "file-added" | "file-changed" | "file-removed";
  path: string;
  tree: TreeNode[];
}
