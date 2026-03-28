import { mkdtemp, mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createFileAccess } from "../src/fileAccess.js";

const tempDirs: string[] = [];

async function makeTempDir() {
  const directory = await mkdtemp(join(tmpdir(), "markiniser-file-access-"));
  tempDirs.push(directory);
  return directory;
}

describe("createFileAccess", () => {
  afterEach(async () => {
    await Promise.all(
      tempDirs.splice(0).map(async (directory) => {
        await import("node:fs/promises").then(({ rm }) =>
          rm(directory, { force: true, recursive: true })
        );
      })
    );
  });

  it("reads markdown files inside allowed roots", async () => {
    const root = await makeTempDir();
    const filePath = join(root, "docs", "guide.md");
    await mkdir(join(filePath, ".."), { recursive: true });
    await writeFile(filePath, "# Guide");
    const fileAccess = createFileAccess([root]);

    await expect(fileAccess.read(filePath)).resolves.toBe("# Guide");
  });

  it("rejects traversal outside allowed roots", async () => {
    const root = await makeTempDir();
    const outside = await makeTempDir();
    const fileAccess = createFileAccess([root]);

    await expect(fileAccess.validatePath(join(outside, "escape.md"))).rejects.toThrow(/allowed roots/i);
  });

  it("rejects non-markdown files", async () => {
    const root = await makeTempDir();
    const filePath = join(root, "docs", "notes.txt");
    await mkdir(join(filePath, ".."), { recursive: true });
    await writeFile(filePath, "plain text");
    const fileAccess = createFileAccess([root]);

    await expect(fileAccess.read(filePath)).rejects.toThrow(/markdown/i);
    await expect(fileAccess.write(filePath, "updated")).rejects.toThrow(/markdown/i);
  });

  it("writes files atomically and returns metadata", async () => {
    const root = await makeTempDir();
    const filePath = join(root, "docs", "guide.md");
    const fileAccess = createFileAccess([root]);

    await fileAccess.write(filePath, "# Updated");

    await expect(readFile(filePath, "utf8")).resolves.toBe("# Updated");
    await expect(stat(`${filePath}.tmp`)).rejects.toThrow();
    await expect(fileAccess.getMetadata(filePath)).resolves.toMatchObject({
      path: filePath,
      name: "guide.md",
      size: "# Updated".length
    });
  });
});
