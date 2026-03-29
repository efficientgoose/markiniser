import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, "..");
const stageRoot = resolve(projectRoot, ".pkg/github");

const STAGED_PATHS = [
  "bin",
  "packages/core/dist",
  "packages/server/dist",
  "packages/web/dist",
  "README.md",
  "LICENSE"
];

const GITHUB_REPOSITORY_URL = "https://github.com/efficientgoose/markiniser";
const GITHUB_NPM_REGISTRY = "https://npm.pkg.github.com";

export function createGitHubPackageManifest(rootPackageJson) {
  return {
    name: "@efficientgoose/markiniser",
    version: rootPackageJson.version,
    description: rootPackageJson.description,
    license: rootPackageJson.license,
    bin: rootPackageJson.bin,
    repository: GITHUB_REPOSITORY_URL,
    homepage: `${GITHUB_REPOSITORY_URL}#readme`,
    bugs: {
      url: `${GITHUB_REPOSITORY_URL}/issues`
    },
    publishConfig: {
      registry: GITHUB_NPM_REGISTRY
    },
    dependencies: rootPackageJson.dependencies
  };
}

export async function prepareGitHubPackage(rootDir = projectRoot) {
  const rootPackageJson = JSON.parse(
    await readFile(resolve(rootDir, "package.json"), "utf8")
  );
  const manifest = createGitHubPackageManifest(rootPackageJson);

  await rm(stageRoot, { recursive: true, force: true });
  await mkdir(stageRoot, { recursive: true });

  for (const relativePath of STAGED_PATHS) {
    await cp(resolve(rootDir, relativePath), resolve(stageRoot, relativePath), {
      recursive: true
    });
  }

  await writeFile(
    resolve(stageRoot, "package.json"),
    `${JSON.stringify(manifest, null, 2)}\n`,
    "utf8"
  );
  await writeFile(
    resolve(stageRoot, ".npmrc"),
    `@efficientgoose:registry=${GITHUB_NPM_REGISTRY}\n`,
    "utf8"
  );

  return stageRoot;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const directory = await prepareGitHubPackage();
  console.log(`Prepared GitHub Packages publish directory at ${directory}`);
}
