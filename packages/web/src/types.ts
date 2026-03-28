import type { SearchResult, TreeNode } from "@markiniser/core";

export type { SearchResult, TreeNode };

export interface CurrentFile {
  path: string;
  name: string;
  content: string;
  lastModified: string;
  size: number;
  isVirtual?: boolean;
}

export interface FileTreeResponse {
  tree: TreeNode[];
}

export interface RootConfigResponse {
  roots: string[];
}

export interface UpdateRootResponse {
  roots: string[];
  tree: TreeNode[];
}

export interface BrowseRootResponse {
  path: string | null;
}

export interface SearchResponse {
  results: SearchResult[];
  count: number;
}

export interface SaveFileResponse {
  success: boolean;
  lastModified: string;
}

export interface RenameFileResponse {
  path: string;
  name: string;
  size: number;
  lastModified: string;
  tree: TreeNode[];
}

export interface WatcherMessage {
  event: "file-added" | "file-changed" | "file-removed";
  path: string;
  tree: TreeNode[];
}
