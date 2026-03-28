import { mkdir, readFile, realpath, rename, stat, writeFile } from "node:fs/promises";
import { basename, dirname, extname, relative, resolve } from "node:path";
import type { FileMetadata } from "./types.js";

export interface FileAccessManager {
  validatePath(filePath: string): Promise<string>;
  read(filePath: string): Promise<string>;
  write(filePath: string, content: string): Promise<void>;
  getMetadata(filePath: string): Promise<FileMetadata>;
}

function ensureMarkdownPath(filePath: string): void {
  if (extname(filePath).toLowerCase() !== ".md") {
    throw new Error("Only markdown files are allowed.");
  }
}

async function normalizeExistingPath(pathValue: string): Promise<string> {
  try {
    return await realpath(pathValue);
  } catch {
    return resolve(pathValue);
  }
}

async function normalizeCandidatePath(pathValue: string): Promise<string> {
  const resolvedPath = resolve(pathValue);
  const parentPath = dirname(resolvedPath);

  if (parentPath === resolvedPath) {
    return normalizeExistingPath(resolvedPath);
  }

  try {
    return await realpath(resolvedPath);
  } catch {
    const normalizedParentPath = await normalizeCandidatePath(parentPath);
    return resolve(normalizedParentPath, basename(resolvedPath));
  }
}

export function createFileAccess(allowedRoots: string[]): FileAccessManager {
  const normalizedRootsPromise = Promise.all(
    allowedRoots.map((rootPath) => normalizeExistingPath(rootPath))
  );

  return {
    async validatePath(filePath: string): Promise<string> {
      ensureMarkdownPath(filePath);
      const normalizedRoots = await normalizedRootsPromise;
      const resolvedPath = resolve(filePath);
      const normalizedPath = await normalizeCandidatePath(filePath);
      const isInsideAllowedRoot = normalizedRoots.some((rootPath) => {
        const relativePath = relative(rootPath, normalizedPath);
        return relativePath === "" || (!relativePath.startsWith("..") && !relativePath.startsWith("../"));
      });

      if (!isInsideAllowedRoot) {
        throw new Error("Path must stay within the allowed roots.");
      }

      return resolvedPath;
    },

    async read(filePath: string): Promise<string> {
      const validatedPath = await this.validatePath(filePath);
      return readFile(validatedPath, "utf8");
    },

    async write(filePath: string, content: string): Promise<void> {
      const validatedPath = await this.validatePath(filePath);
      await mkdir(dirname(validatedPath), { recursive: true });
      const tempPath = `${validatedPath}.tmp`;
      await writeFile(tempPath, content, "utf8");
      await rename(tempPath, validatedPath);
    },

    async getMetadata(filePath: string): Promise<FileMetadata> {
      const validatedPath = await this.validatePath(filePath);
      const metadata = await stat(validatedPath);
      return {
        path: validatedPath,
        name: basename(validatedPath),
        size: metadata.size,
        lastModified: metadata.mtime.toISOString()
      };
    }
  };
}
