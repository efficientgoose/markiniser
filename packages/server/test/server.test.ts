import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createCore } from "@markiniser/core";
import { createServer } from "../src/index.js";
import { bindWatcherBroadcasts } from "../src/ws.js";

const tempDirs: string[] = [];

async function makeTempDir(prefix: string) {
  const directory = await mkdtemp(join(tmpdir(), prefix));
  tempDirs.push(directory);
  return directory;
}

async function writeMarkdownFile(root: string, relativePath: string, content: string) {
  const absolutePath = join(root, relativePath);
  await mkdir(join(absolutePath, ".."), { recursive: true });
  await writeFile(absolutePath, content, "utf8");
  return absolutePath;
}

afterEach(async () => {
  await Promise.all(
    tempDirs.splice(0).map(async (directory) => {
      await import("node:fs/promises").then(({ rm }) =>
        rm(directory, { force: true, recursive: true })
      );
    })
  );
});

describe("createServer", () => {
  it("serves the file tree, file reads, writes, and search results", async () => {
    const root = await makeTempDir("markiniser-server-root-");
    const filePath = await writeMarkdownFile(root, "docs/guide.md", "# Guide\n\nhello search");
    await writeMarkdownFile(root, "notes/ideas.md", "phase two");

    const core = await createCore({
      roots: [root],
      ignore: [".git"],
      port: 4123
    });
    const server = await createServer({
      core,
      frontendDistPath: join(root, "missing-dist")
    });

    await server.ready();

    const filesResponse = await server.inject({ method: "GET", url: "/api/files" });
    expect(filesResponse.statusCode).toBe(200);
    expect(filesResponse.json()).toEqual({
      tree: core.getTree()
    });

    const readResponse = await server.inject({
      method: "GET",
      url: `/api/files/${encodeURIComponent(filePath)}`
    });
    expect(readResponse.statusCode).toBe(200);
    expect(readResponse.json()).toMatchObject({
      path: filePath,
      name: "guide.md",
      content: "# Guide\n\nhello search"
    });

    const writeResponse = await server.inject({
      method: "PUT",
      url: `/api/files/${encodeURIComponent(filePath)}`,
      payload: {
        content: "# Guide\n\nupdated body"
      }
    });
    expect(writeResponse.statusCode).toBe(200);
    expect(writeResponse.json()).toMatchObject({
      success: true
    });

    const searchResponse = await server.inject({
      method: "GET",
      url: "/api/search?q=updated"
    });
    expect(searchResponse.statusCode).toBe(200);
    expect(searchResponse.json()).toMatchObject({
      count: 1
    });
    expect(searchResponse.json().results[0]?.path).toBe(filePath);

    await server.close();
  });

  it("maps file access errors to 400, 403, and 404 responses", async () => {
    const root = await makeTempDir("markiniser-server-errors-");
    const outsideRoot = await makeTempDir("markiniser-server-outside-");
    const insideFile = await writeMarkdownFile(root, "docs/guide.md", "# Guide");
    const outsideFile = await writeMarkdownFile(outsideRoot, "escape.md", "# Escape");
    const missingFile = join(root, "docs", "missing.md");
    const wrongExtension = join(root, "docs", "plain.txt");

    const core = await createCore({
      roots: [root],
      ignore: [".git"],
      port: 4124
    });
    const server = await createServer({
      core,
      frontendDistPath: join(root, "missing-dist")
    });

    await server.ready();

    const forbiddenResponse = await server.inject({
      method: "GET",
      url: `/api/files/${encodeURIComponent(outsideFile)}`
    });
    expect(forbiddenResponse.statusCode).toBe(403);

    const missingResponse = await server.inject({
      method: "GET",
      url: `/api/files/${encodeURIComponent(missingFile)}`
    });
    expect(missingResponse.statusCode).toBe(404);

    const badRequestResponse = await server.inject({
      method: "GET",
      url: `/api/files/${encodeURIComponent(wrongExtension)}`
    });
    expect(badRequestResponse.statusCode).toBe(400);

    const insideResponse = await server.inject({
      method: "GET",
      url: `/api/files/${encodeURIComponent(insideFile)}`
    });
    expect(insideResponse.statusCode).toBe(200);

    await server.close();
  });

  it("returns empty search results for blank queries", async () => {
    const root = await makeTempDir("markiniser-server-search-");
    await writeMarkdownFile(root, "docs/guide.md", "# Guide");
    const core = await createCore({
      roots: [root],
      ignore: [".git"],
      port: 4125
    });
    const server = await createServer({
      core,
      frontendDistPath: join(root, "missing-dist")
    });

    await server.ready();

    const response = await server.inject({
      method: "GET",
      url: "/api/search"
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      results: [],
      count: 0
    });

    await server.close();
  });

  it("serves a fallback root page and logs a warning when the frontend build is missing", async () => {
    const root = await makeTempDir("markiniser-server-fallback-");
    const warnings: string[] = [];
    const core = await createCore({
      roots: [root],
      ignore: [".git"],
      port: 4126
    });
    const server = await createServer({
      core,
      frontendDistPath: join(root, "missing-dist"),
      onWarning(message) {
        warnings.push(message);
      }
    });

    await server.ready();

    const response = await server.inject({
      method: "GET",
      url: "/"
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers["content-type"]).toContain("text/html");
    expect(response.body).toContain("Markiniser API is running. Frontend not built yet.");
    expect(response.body).toContain("npm run build -w packages/web");
    expect(warnings).toContain(
      "[warn] Frontend build not found at packages/web/dist — serving API only"
    );

    await server.close();
  });

  it("serves the built frontend at the root route when dist exists", async () => {
    const root = await makeTempDir("markiniser-server-static-");
    const frontendDistPath = join(root, "web-dist");
    await mkdir(frontendDistPath, { recursive: true });
    await writeFile(join(frontendDistPath, "index.html"), "<html><body>frontend</body></html>", "utf8");

    const core = await createCore({
      roots: [root],
      ignore: [".git"],
      port: 4127
    });
    const server = await createServer({
      core,
      frontendDistPath
    });

    await server.ready();

    const response = await server.inject({
      method: "GET",
      url: "/"
    });

    expect(response.statusCode).toBe(200);
    expect(response.body).toContain("frontend");

    await server.close();
  });

  it("broadcasts watcher events to connected sockets", async () => {
    const root = await makeTempDir("markiniser-server-ws-");
    const core = await createCore({
      roots: [root],
      ignore: [".git"],
      port: 4128
    });
    const sentMessages: string[] = [];
    const fakeSocket = {
      OPEN: 1,
      readyState: 1,
      send(message: string) {
        sentMessages.push(message);
      }
    };

    const cleanup = bindWatcherBroadcasts(core, new Set([fakeSocket]));
    const eventPayload = {
      path: join(root, "docs", "guide.md"),
      tree: core.getTree()
    };

    core.watcher.emit("file-changed", eventPayload);

    const [message] = sentMessages.map((payload) => JSON.parse(payload));

    expect(message).toMatchObject({
      event: "file-changed",
      path: eventPayload.path
    });
    expect(Array.isArray(message.tree)).toBe(true);

    cleanup();
  });
});
