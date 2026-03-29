import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { createGitHubPackageManifest } from "../scripts/github-package.mjs";

describe("GitHub Packages manifest", () => {
  it("creates a scoped publish manifest linked to the repository", async () => {
    const rootPackageJson = JSON.parse(
      await readFile(resolve(process.cwd(), "package.json"), "utf8")
    );

    expect(createGitHubPackageManifest(rootPackageJson)).toEqual({
      name: "@efficientgoose/markiniser",
      version: rootPackageJson.version,
      description: rootPackageJson.description,
      license: rootPackageJson.license,
      bin: rootPackageJson.bin,
      repository: "https://github.com/efficientgoose/markiniser",
      homepage: "https://github.com/efficientgoose/markiniser#readme",
      bugs: {
        url: "https://github.com/efficientgoose/markiniser/issues"
      },
      publishConfig: {
        registry: "https://npm.pkg.github.com"
      },
      dependencies: rootPackageJson.dependencies
    });
  });
});
