import { readFile, stat } from "node:fs/promises";
import { basename, relative, sep } from "node:path";
import fg from "fast-glob";
import type { FlatFile, MarkiniserConfig, TreeNode } from "./types.js";

export interface ScanResult {
  tree: TreeNode[];
  files: FlatFile[];
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

function sortTreeNodes(nodes: TreeNode[]): TreeNode[] {
  return nodes
    .map((node) => ({
      ...node,
      children: node.children ? sortTreeNodes(node.children) : undefined
    }))
    .sort((left, right) => {
      if (left.isFolder !== right.isFolder) {
        return left.isFolder ? -1 : 1;
      }
      return left.name.localeCompare(right.name);
    });
}

function insertFileNode(rootNode: TreeNode, file: FlatFile): void {
  const relativePath = relative(rootNode.path, file.path);
  const segments = relativePath.split(sep).filter(Boolean);
  let currentNode = rootNode;

  for (const [index, segment] of segments.entries()) {
    const isLeaf = index === segments.length - 1;
    currentNode.children ??= [];

    if (isLeaf) {
      currentNode.children.push({
        id: file.path,
        name: segment,
        path: file.path,
        isFolder: false,
        lastModified: file.lastModified,
        size: file.size
      });
      continue;
    }

    const nextPath = `${currentNode.path}${sep}${segment}`;
    let childNode = currentNode.children.find(
      (child) => child.isFolder && child.path === nextPath
    );

    if (!childNode) {
      childNode = {
        id: nextPath,
        name: segment,
        path: nextPath,
        isFolder: true,
        children: []
      };
      currentNode.children.push(childNode);
    }

    currentNode = childNode;
  }
}

function isPermissionError(error: unknown): boolean {
  if (typeof error !== "object" || error === null || !("code" in error)) {
    return false;
  }

  const code = (error as NodeJS.ErrnoException).code;
  return code === "EACCES" || code === "EPERM";
}

export async function scanMarkdownFiles(config: MarkiniserConfig): Promise<ScanResult> {
  const ignore = normalizeIgnorePatterns(config.ignore);
  const filesByRoot = await Promise.all(
    config.roots.map(async (root) => {
      const markdownPaths = await fg("**/*.md", {
        absolute: true,
        cwd: root,
        dot: true,
        followSymbolicLinks: true,
        ignore,
        onlyFiles: true,
        suppressErrors: true
      });

      const files = (
        await Promise.all(
          markdownPaths.map(async (filePath) => {
            try {
          const [content, metadata] = await Promise.all([
            readFile(filePath, "utf8"),
            stat(filePath)
          ]);

              return {
                path: filePath,
                name: basename(filePath),
                content,
                size: metadata.size,
                lastModified: metadata.mtime.toISOString()
              } satisfies FlatFile;
            } catch (error) {
              if (isPermissionError(error)) {
                return null;
              }

              throw error;
            }
          })
        )
      ).filter((file): file is FlatFile => file !== null);

      return {
        root,
        files: files.sort((left, right) => left.path.localeCompare(right.path))
      };
    })
  );

  const tree = filesByRoot.map(({ root, files }) => {
    const rootNode: TreeNode = {
      id: root,
      name: basename(root) || root,
      path: root,
      isFolder: true,
      children: []
    };

    for (const file of files) {
      insertFileNode(rootNode, file);
    }

    return {
      ...rootNode,
      children: sortTreeNodes(rootNode.children ?? [])
    };
  });

  return {
    tree,
    files: filesByRoot.flatMap(({ files }) => files)
  };
}
