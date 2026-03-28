import type { TreeNode } from "../types";

export interface TreeViewElement {
  id: string;
  name: string;
  type: "folder" | "file";
  path: string;
  children?: TreeViewElement[];
}

function compareElements(a: TreeNode, b: TreeNode) {
  if (a.isFolder !== b.isFolder) {
    return a.isFolder ? -1 : 1;
  }

  return a.name.localeCompare(b.name);
}

export function transformTreeNodes(nodes: TreeNode[]): TreeViewElement[] {
  return [...nodes]
    .sort(compareElements)
    .map((node) => ({
      id: node.id,
      name: node.name,
      type: node.isFolder ? "folder" : "file",
      path: node.path,
      children: node.children ? transformTreeNodes(node.children) : undefined
    }));
}

export function countMarkdownFiles(element: TreeViewElement): number {
  if (element.type === "file") {
    return element.name.toLowerCase().endsWith(".md") ? 1 : 0;
  }

  return (element.children ?? []).reduce((count, child) => {
    return count + countMarkdownFiles(child);
  }, 0);
}

export function collectFolderIds(elements: TreeViewElement[]): string[] {
  return elements
    .filter((element) => element.type === "folder")
    .map((element) => element.id);
}

export function findAncestorFolderIds(
  elements: TreeViewElement[],
  targetPath: string | null | undefined
): string[] {
  if (!targetPath) {
    return [];
  }

  for (const element of elements) {
    if (element.type !== "folder") {
      continue;
    }

    const descendantIds = findAncestorFolderIds(element.children ?? [], targetPath);
    if (descendantIds.length > 0) {
      return [element.id, ...descendantIds];
    }

    const containsTarget = (element.children ?? []).some((child) => child.path === targetPath);
    if (containsTarget) {
      return [element.id];
    }
  }

  return [];
}
