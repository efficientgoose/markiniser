import { EventEmitter } from "node:events";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createSearchIndexer } from "../src/indexer.js";

const fakeFsWatcher = new EventEmitter() as EventEmitter & { close: ReturnType<typeof vi.fn> };
fakeFsWatcher.close = vi.fn(async () => {});

vi.mock("chokidar", () => ({
  default: {
    watch: vi.fn(() => fakeFsWatcher)
  }
}));

describe("createFileWatcher", () => {
  beforeEach(() => {
    fakeFsWatcher.removeAllListeners();
    fakeFsWatcher.close.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("emits non-fatal watcher warnings for chokidar errors", async () => {
    const { createFileWatcher } = await import("../src/watcher.js");
    const watcher = createFileWatcher({
      config: {
        roots: ["/tmp"],
        ignore: [".git"],
        port: 4000
      },
      indexer: createSearchIndexer(),
      refreshTree: async () => []
    });
    const warningHandler = vi.fn();
    watcher.on("watcher-warning", warningHandler);

    await watcher.start();
    fakeFsWatcher.emit("error", Object.assign(new Error("too many files"), { code: "EMFILE" }));

    expect(warningHandler).toHaveBeenCalledTimes(1);
    expect(warningHandler.mock.calls[0]?.[0]).toMatchObject({
      code: "EMFILE"
    });
  });
});
