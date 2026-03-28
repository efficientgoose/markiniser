import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { loadConfig } from "../src/config.js";

const tempDirs: string[] = [];

async function makeTempDir() {
  const directory = await mkdtemp(join(tmpdir(), "markiniser-config-"));
  tempDirs.push(directory);
  return directory;
}

describe("loadConfig", () => {
  afterEach(async () => {
    await Promise.all(
      tempDirs.splice(0).map(async (directory) => {
        await import("node:fs/promises").then(({ rm }) =>
          rm(directory, { force: true, recursive: true })
        );
      })
    );
  });

  it("returns defaults when no config file is present", async () => {
    const cwd = await makeTempDir();

    const config = await loadConfig({ cwd });

    expect(config).toEqual({
      roots: [`${process.env.HOME}/Documents`],
      ignore: ["node_modules", ".git", "dist", "build", ".obsidian", ".trash"],
      port: 4000
    });
  });

  it("loads config from file, resolves tildes, and applies CLI port overrides", async () => {
    const cwd = await makeTempDir();
    const docsRoot = "~/notes";
    await writeFile(
      join(cwd, ".markiniserrc.json"),
      JSON.stringify(
        {
          roots: [docsRoot],
          ignore: ["node_modules", ".cache"],
          port: 4567
        },
        null,
        2
      )
    );

    const config = await loadConfig({ cwd, port: 5001 });

    expect(config).toEqual({
      roots: [`${process.env.HOME}/notes`],
      ignore: ["node_modules", ".cache"],
      port: 5001
    });
  });

  it("supports an explicit config path", async () => {
    const cwd = await makeTempDir();
    const configDir = join(cwd, "config");
    await mkdir(configDir);
    const configPath = join(configDir, "markiniser.config.js");
    await writeFile(
      configPath,
      `export default { roots: ["~/vault"], ignore: [".git"], port: 4321 };`
    );

    const config = await loadConfig({ cwd, configPath });

    expect(config).toEqual({
      roots: [`${process.env.HOME}/vault`],
      ignore: [".git"],
      port: 4321
    });
  });
});
