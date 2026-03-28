import { Document } from "flexsearch";
import type { FlatFile, SearchResult } from "./types.js";

export interface SearchIndexer {
  addToIndex(file: FlatFile): void;
  removeFromIndex(filePath: string): void;
  updateIndex(file: FlatFile): void;
  search(query: string): SearchResult[];
}

interface SearchDocument {
  [key: string]: string | number | boolean | null;
  path: string;
  name: string;
  content: string;
  size: number;
  lastModified: string;
}

function createSnippet(content: string, query: string): string {
  const normalizedContent = content.toLowerCase();
  const normalizedQuery = query.toLowerCase();
  const matchIndex = normalizedContent.indexOf(normalizedQuery);

  if (matchIndex === -1) {
    return content.slice(0, 120);
  }

  const start = Math.max(0, matchIndex - 40);
  const end = Math.min(content.length, matchIndex + query.length + 40);
  return content.slice(start, end).trim();
}

export function createSearchIndexer(files: FlatFile[] = []): SearchIndexer {
  const documents = new Map<string, FlatFile>();
  const index = new Document<SearchDocument>({
    tokenize: "forward",
    document: {
      id: "path",
      index: ["path", "name", "content"],
      store: ["path", "name", "content"]
    }
  });

  const addToIndex = (file: FlatFile) => {
    documents.set(file.path, file);
    index.add({ ...file });
  };

  const removeFromIndex = (filePath: string) => {
    const file = documents.get(filePath);
    if (!file) {
      return;
    }

    documents.delete(filePath);
    index.remove({ ...file });
  };

  const updateIndex = (file: FlatFile) => {
    documents.set(file.path, file);
    index.update({ ...file });
  };

  for (const file of files) {
    addToIndex(file);
  }

  return {
    addToIndex,
    removeFromIndex,
    updateIndex,
    search(query: string): SearchResult[] {
      const normalizedQuery = query.trim();
      if (!normalizedQuery) {
        return [];
      }

      const results = index.search(normalizedQuery, {
        enrich: true,
        limit: 20,
        merge: true
      });

      return results.map((result, indexPosition) => {
        const file = documents.get(String(result.id));
        if (!file) {
          return {
            path: String(result.id),
            name: String(result.id).split("/").at(-1) ?? String(result.id),
            snippet: "",
            score: results.length - indexPosition
          };
        }

        return {
          path: file.path,
          name: file.name,
          snippet: createSnippet(file.content, normalizedQuery),
          score: results.length - indexPosition
        };
      });
    }
  };
}
