import { writeFile } from "node:fs/promises";
import { extname } from "node:path";
import { homedir } from "node:os";
import { dirname, isAbsolute, resolve } from "node:path";
import { cosmiconfig } from "cosmiconfig";
import type { MarkiniserConfig } from "./types.js";

export interface LoadConfigOptions {
  cwd?: string;
  configPath?: string;
  port?: number;
}

const DEFAULT_CONFIG: MarkiniserConfig = {
  roots: ["~/Documents"],
  ignore: ["node_modules", ".git", "dist", "build", ".obsidian", ".trash"],
  port: 4000
};

const SEARCH_PLACES = [".markiniserrc", ".markiniserrc.json", "markiniser.config.js"];

export interface LoadedConfigDetails {
  config: MarkiniserConfig;
  sourcePath: string | null;
}

function resolveHomePath(pathValue: string): string {
  const homeDirectory = process.env.HOME ?? homedir();
  if (pathValue === "~") {
    return homeDirectory;
  }
  if (pathValue.startsWith("~/")) {
    return resolve(homeDirectory, pathValue.slice(2));
  }
  return pathValue;
}

function resolveRootPath(pathValue: string, baseDirectory: string): string {
  const expandedPath = resolveHomePath(pathValue);
  return isAbsolute(expandedPath) ? expandedPath : resolve(baseDirectory, expandedPath);
}

export async function loadConfigWithDetails(
  options: LoadConfigOptions = {}
): Promise<LoadedConfigDetails> {
  const cwd = options.cwd ? resolve(options.cwd) : process.cwd();
  const explorer = cosmiconfig("markiniser", {
    searchPlaces: SEARCH_PLACES
  });

  const loadedResult = options.configPath
    ? await explorer.load(resolve(cwd, options.configPath))
    : await explorer.search(cwd);
  const fileConfig = (loadedResult?.config ?? {}) as Partial<MarkiniserConfig>;
  const configBaseDirectory = loadedResult ? dirname(loadedResult.filepath) : cwd;

  return {
    config: {
      roots: (fileConfig.roots ?? DEFAULT_CONFIG.roots).map((root) =>
        resolveRootPath(root, configBaseDirectory)
      ),
      ignore: fileConfig.ignore ?? DEFAULT_CONFIG.ignore,
      port: options.port ?? fileConfig.port ?? DEFAULT_CONFIG.port
    },
    sourcePath: loadedResult?.filepath ?? null
  };
}

export async function loadConfig(options: LoadConfigOptions = {}): Promise<MarkiniserConfig> {
  const details = await loadConfigWithDetails(options);
  return details.config;
}

export async function writeConfig(
  sourcePath: string,
  config: MarkiniserConfig
): Promise<void> {
  if (extname(sourcePath) === ".js") {
    throw new Error("JavaScript config files cannot be updated automatically.");
  }

  await writeFile(
    sourcePath,
    `${JSON.stringify(
      {
        roots: config.roots,
        ignore: config.ignore,
        port: config.port
      },
      null,
      2
    )}\n`,
    "utf8"
  );
}
