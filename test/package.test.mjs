import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const rootPackagePath = resolve(process.cwd(), "package.json");
const binPath = resolve(process.cwd(), "bin/markiniser.js");

describe("publish package metadata", () => {
  it("is publishable as a single npx package with a tight files whitelist", async () => {
    const packageJson = JSON.parse(await readFile(rootPackagePath, "utf8"));
    const binScript = await readFile(binPath, "utf8");

    expect(packageJson.private).not.toBe(true);
    expect(packageJson.name).toBe("markiniser");
    expect(packageJson.bin).toEqual({
      markiniser: "./bin/markiniser.js"
    });
    expect(packageJson.files).toEqual([
      "bin/",
      "packages/core/dist/*.js",
      "packages/server/dist/*.js",
      "packages/web/dist/**",
      "README.md",
      "LICENSE"
    ]);
    expect(packageJson.scripts.prepack).toBe("npm run build");
    expect(packageJson.dependencies).toMatchObject({
      "@fastify/cors": expect.any(String),
      "@fastify/static": expect.any(String),
      "@fastify/type-provider-typebox": expect.any(String),
      "@sinclair/typebox": expect.any(String),
      chalk: expect.any(String),
      chokidar: expect.any(String),
      commander: expect.any(String),
      cosmiconfig: expect.any(String),
      "fast-glob": expect.any(String),
      fastify: expect.any(String),
      flexsearch: expect.any(String),
      ora: expect.any(String)
    });
    expect(binScript).not.toContain('import("@markiniser/core")');
    expect(binScript).not.toContain('import("@markiniser/server")');
  });
});
