import { stat, writeFile } from "node:fs/promises";
import { isAbsolute } from "node:path";
import type { Core, TreeNode } from "@markiniser/core";

export interface RootConfigController {
  getRoots(): string[];
  setPrimaryRoot(path: string): Promise<{ roots: string[]; tree: TreeNode[] }>;
  browseForRoot(): Promise<string | null>;
}

export interface CreateRootConfigControllerOptions {
  core: Core;
  configPath: string | null;
  browseForRoot: () => Promise<string | null>;
}

type RootMutableCore = Core & {
  updateRoots(roots: string[]): Promise<{ tree: TreeNode[] }>;
};

async function assertDirectory(path: string): Promise<void> {
  if (!isAbsolute(path)) {
    throw new Error("Root path must be an absolute path.");
  }

  let metadata;
  try {
    metadata = await stat(path);
  } catch {
    throw new Error("Selected root path does not exist.");
  }

  if (!metadata.isDirectory()) {
    throw new Error("Selected root path must be a directory.");
  }
}

export function createRootConfigController(
  options: CreateRootConfigControllerOptions
): RootConfigController {
  const rootMutableCore = options.core as RootMutableCore;

  return {
    getRoots() {
      return [...options.core.config.roots];
    },
    async setPrimaryRoot(path) {
      if (!options.configPath) {
        throw new Error("No writable config file was loaded.");
      }

      await assertDirectory(path);
      const nextConfig = {
        ...options.core.config,
        roots: [path]
      };
      await writeFile(
        options.configPath,
        `${JSON.stringify(nextConfig, null, 2)}\n`,
        "utf8"
      );
      const scan = await rootMutableCore.updateRoots([path]);

      return {
        roots: [...options.core.config.roots],
        tree: scan.tree
      };
    },
    async browseForRoot() {
      return options.browseForRoot();
    }
  };
}
