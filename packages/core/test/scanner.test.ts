import { chmod, mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { scanMarkdownFiles } from "../src/scanner.js";
import type { MarkiniserConfig } from "../src/types.js";

const tempDirs: string[] = [];

async function makeTempDir() {
  const directory = await mkdtemp(join(tmpdir(), "markiniser-scanner-"));
  tempDirs.push(directory);
  return directory;
}

async function writeMarkdownFile(root: string, relativePath: string, content: string) {
  const absolutePath = join(root, relativePath);
  await mkdir(join(absolutePath, ".."), { recursive: true });
  await writeFile(absolutePath, content);
}

describe("scanMarkdownFiles", () => {
  afterEach(async () => {
    await Promise.all(
      tempDirs.splice(0).map(async (directory) => {
        await import("node:fs/promises").then(({ rm }) =>
          rm(directory, { force: true, recursive: true })
        );
      })
    );
  });

  it("returns a nested tree and flat file list for markdown files across roots", async () => {
    const rootA = await makeTempDir();
    const rootB = await makeTempDir();
    await writeMarkdownFile(rootA, "guides/getting-started.md", "# Start here");
    await writeMarkdownFile(rootA, "README.md", "# Root");
    await writeMarkdownFile(rootB, "ideas/todo.md", "- ship phase 1");
    await writeFile(join(rootA, "guides", "draft.txt"), "ignore me");

    const config: MarkiniserConfig = {
      roots: [rootA, rootB],
      ignore: ["node_modules", ".git"],
      port: 4000
    };

    const result = await scanMarkdownFiles(config);

    expect(result.files.map((file) => file.path).sort()).toEqual(
      [join(rootA, "README.md"), join(rootA, "guides/getting-started.md"), join(rootB, "ideas/todo.md")].sort()
    );
    expect(result.tree).toHaveLength(2);
    expect(result.tree[0]?.isFolder).toBe(true);
    expect(result.tree[0]?.children?.some((child) => child.name === "README.md")).toBe(true);
    expect(
      result.tree[0]?.children?.some(
        (child) =>
          child.name === "guides" &&
          child.children?.some((nestedChild) => nestedChild.name === "getting-started.md")
      )
    ).toBe(true);
  });

  it("respects ignore patterns while scanning", async () => {
    const root = await makeTempDir();
    await writeMarkdownFile(root, "content/keep.md", "# keep");
    await writeMarkdownFile(root, "content/build/generated.md", "# skip");
    await writeMarkdownFile(root, ".obsidian/workspace.md", "# skip");

    const config: MarkiniserConfig = {
      roots: [root],
      ignore: ["build", ".obsidian"],
      port: 4000
    };

    const result = await scanMarkdownFiles(config);

    expect(result.files.map((file) => file.path)).toEqual([join(root, "content/keep.md")]);
  });

  it("skips unreadable directories instead of aborting the scan", async () => {
    const root = await makeTempDir();
    const unreadableDirectory = join(root, "restricted");
    await writeMarkdownFile(root, "content/keep.md", "# keep");
    await mkdir(unreadableDirectory, { recursive: true });
    await writeMarkdownFile(root, "restricted/secret.md", "# secret");
    await chmod(unreadableDirectory, 0o000);

    try {
      const config: MarkiniserConfig = {
        roots: [root],
        ignore: [".git"],
        port: 4000
      };

      const result = await scanMarkdownFiles(config);

      expect(result.files.map((file) => file.path)).toContain(join(root, "content/keep.md"));
    } finally {
      await chmod(unreadableDirectory, 0o755);
    }
  });
});
