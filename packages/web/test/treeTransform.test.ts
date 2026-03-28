import { describe, expect, it } from "vitest";
import type { TreeNode } from "../src/types";
import {
  countMarkdownFiles,
  transformTreeNodes
} from "../src/utils/treeTransform";

describe("transformTreeNodes", () => {
  it("sorts folders first, then files, both alphabetically", () => {
    const input: TreeNode[] = [
      {
        id: "b-file",
        name: "zeta.md",
        path: "/zeta.md",
        isFolder: false
      },
      {
        id: "a-folder",
        name: "alpha",
        path: "/alpha",
        isFolder: true,
        children: [
          {
            id: "child-file",
            name: "note.md",
            path: "/alpha/note.md",
            isFolder: false
          }
        ]
      },
      {
        id: "c-file",
        name: "beta.md",
        path: "/beta.md",
        isFolder: false
      },
      {
        id: "d-folder",
        name: "docs",
        path: "/docs",
        isFolder: true,
        children: []
      }
    ];

    const result = transformTreeNodes(input);

    expect(result.map((element) => element.name)).toEqual([
      "alpha",
      "docs",
      "beta.md",
      "zeta.md"
    ]);
    expect(result[0]?.type).toBe("folder");
    expect(result[2]?.type).toBe("file");
  });

  it("counts markdown files recursively for folders", () => {
    const folder = transformTreeNodes([
      {
        id: "docs",
        name: "docs",
        path: "/docs",
        isFolder: true,
        children: [
          {
            id: "guide",
            name: "guide.md",
            path: "/docs/guide.md",
            isFolder: false
          },
          {
            id: "nested",
            name: "nested",
            path: "/docs/nested",
            isFolder: true,
            children: [
              {
                id: "child",
                name: "child.md",
                path: "/docs/nested/child.md",
                isFolder: false
              }
            ]
          }
        ]
      }
    ])[0];

    expect(folder).toBeDefined();
    expect(countMarkdownFiles(folder!)).toBe(2);
  });
});
