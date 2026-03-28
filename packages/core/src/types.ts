export interface MarkiniserConfig {
  roots: string[];
  ignore: string[];
  port: number;
}

export interface FlatFile {
  path: string;
  name: string;
  content: string;
  size: number;
  lastModified: string;
}

export interface TreeNode {
  id: string;
  name: string;
  path: string;
  isFolder: boolean;
  children?: TreeNode[];
  lastModified?: string;
  size?: number;
}

export interface SearchResult {
  path: string;
  name: string;
  snippet: string;
  score: number;
}

export interface FileMetadata {
  path: string;
  name: string;
  size: number;
  lastModified: string;
}
