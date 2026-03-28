import { describe, expect, it } from "vitest";
import { createSearchIndexer } from "../src/indexer.js";
import type { FlatFile } from "../src/types.js";

function createFile(path: string, content: string): FlatFile {
  return {
    path,
    name: path.split("/").at(-1) ?? path,
    content,
    size: content.length,
    lastModified: new Date("2026-01-01T00:00:00.000Z").toISOString()
  };
}

describe("createSearchIndexer", () => {
  it("searches across filename, path, and content", () => {
    const indexer = createSearchIndexer([
      createFile("/docs/api-guide.md", "HTTP clients and authentication"),
      createFile("/notes/ideas.md", "A markdown search app for local notes")
    ]);

    const filenameMatches = indexer.search("api-guide");
    const contentMatches = indexer.search("authentication");
    const pathMatches = indexer.search("notes");

    expect(filenameMatches[0]?.path).toBe("/docs/api-guide.md");
    expect(contentMatches[0]?.path).toBe("/docs/api-guide.md");
    expect(pathMatches[0]?.path).toBe("/notes/ideas.md");
    expect(contentMatches[0]?.snippet).toContain("authentication");
  });

  it("supports incremental add, update, and remove operations", () => {
    const indexer = createSearchIndexer();
    const file = createFile("/docs/roadmap.md", "phase one shipping checklist");

    indexer.addToIndex(file);
    expect(indexer.search("shipping")).toHaveLength(1);

    indexer.updateIndex({ ...file, content: "phase two backlog" });
    expect(indexer.search("shipping")).toHaveLength(0);
    expect(indexer.search("backlog")[0]?.path).toBe(file.path);

    indexer.removeFromIndex(file.path);
    expect(indexer.search("backlog")).toHaveLength(0);
  });

  it("returns an empty list for empty queries", () => {
    const indexer = createSearchIndexer([createFile("/docs/roadmap.md", "phase one shipping checklist")]);

    expect(indexer.search("")).toEqual([]);
    expect(indexer.search("   ")).toEqual([]);
  });
});
