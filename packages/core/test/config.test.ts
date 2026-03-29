import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { ensureCliConfigPath, loadConfig } from "../src/config.js";

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

  it("falls back to default roots when config roots only contain blank strings", async () => {
    const cwd = await makeTempDir();
    await writeFile(
      join(cwd, ".markiniserrc.json"),
      JSON.stringify(
        {
          roots: [""],
          ignore: ["node_modules", ".cache"],
          port: 4567
        },
        null,
        2
      )
    );

    const config = await loadConfig({ cwd });

    expect(config).toEqual({
      roots: [`${process.env.HOME}/Documents`],
      ignore: ["node_modules", ".cache"],
      port: 4567
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

  it("creates a home config on first run using Desktop as the default root", async () => {
    const cwd = await makeTempDir();
    const home = await makeTempDir();
    const desktop = join(home, "Desktop");
    await mkdir(desktop);

    const configPath = await ensureCliConfigPath({
      cwd,
      homeDir: home
    });

    expect(configPath).toBe(join(home, ".markiniserrc.json"));
    const config = await loadConfig({ cwd, configPath });

    expect(config).toEqual({
      roots: [desktop],
      ignore: ["node_modules", ".git", "dist", "build", ".obsidian", ".trash"],
      port: 4000
    });
  });

  it("falls back to the current directory when Desktop does not exist", async () => {
    const cwd = await makeTempDir();
    const home = await makeTempDir();

    const configPath = await ensureCliConfigPath({
      cwd,
      homeDir: home
    });

    expect(configPath).toBe(join(home, ".markiniserrc.json"));
    const config = await loadConfig({ cwd, configPath });

    expect(config).toEqual({
      roots: [cwd],
      ignore: ["node_modules", ".git", "dist", "build", ".obsidian", ".trash"],
      port: 4000
    });
  });

  it("repairs an existing JSON config when roots is empty", async () => {
    const cwd = await makeTempDir();
    const home = await makeTempDir();
    const desktop = join(home, "Desktop");
    await mkdir(desktop);
    const configPath = join(home, ".markiniserrc.json");

    await writeFile(
      configPath,
      JSON.stringify(
        {
          roots: [],
          ignore: ["node_modules", ".git"],
          port: 4000
        },
        null,
        2
      )
    );

    const ensuredPath = await ensureCliConfigPath({
      cwd,
      homeDir: home
    });

    expect(ensuredPath).toBe(configPath);
    expect(await readFile(configPath, "utf8")).toContain(desktop);

    const config = await loadConfig({ cwd, configPath });
    expect(config.roots).toEqual([desktop]);
    expect(config.ignore).toEqual(["node_modules", ".git"]);
  });

  it("repairs an existing JSON config when roots only contain blank strings", async () => {
    const cwd = await makeTempDir();
    const home = await makeTempDir();
    const desktop = join(home, "Desktop");
    await mkdir(desktop);
    const configPath = join(home, ".markiniserrc.json");

    await writeFile(
      configPath,
      JSON.stringify(
        {
          roots: [""],
          ignore: ["node_modules", ".git"],
          port: 4000
        },
        null,
        2
      )
    );

    const ensuredPath = await ensureCliConfigPath({
      cwd,
      homeDir: home
    });

    expect(ensuredPath).toBe(configPath);
    expect(await readFile(configPath, "utf8")).toContain(desktop);

    const config = await loadConfig({ cwd, configPath });
    expect(config.roots).toEqual([desktop]);
    expect(config.ignore).toEqual(["node_modules", ".git"]);
  });
});
