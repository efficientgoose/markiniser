import { EventEmitter } from "node:events";
import { describe, expect, it, vi } from "vitest";
import {
  createWatcherSupervisor,
  startWatcherInBackground
} from "../src/runtime.js";

class FakeWatcher extends EventEmitter {
  public startCalls = 0;
  public stopCalls = 0;

  constructor(private readonly startImpl: () => Promise<void> = async () => {}) {
    super();
  }

  async start(): Promise<void> {
    this.startCalls += 1;
    await this.startImpl();
  }

  async stop(): Promise<void> {
    this.stopCalls += 1;
  }
}

describe("createWatcherSupervisor", () => {
  it("disables watching after EMFILE warnings", async () => {
    const watcher = new FakeWatcher();
    const warnings: string[] = [];
    const supervisor = createWatcherSupervisor({
      watcher,
      onWarning(message) {
        warnings.push(message);
      }
    });

    await supervisor.start();
    watcher.emit("watcher-warning", Object.assign(new Error("too many open files"), { code: "EMFILE" }));
    await new Promise((resolve) => setImmediate(resolve));

    expect(watcher.stopCalls).toBe(1);
    expect(warnings).toEqual([
      "[warn] File watching disabled: too many open files",
      "[warn] Narrow your scan roots or raise the file descriptor limit to restore live updates."
    ]);
  });

  it("logs generic watcher warnings without disabling watching", async () => {
    const watcher = new FakeWatcher();
    const warnings: string[] = [];
    const supervisor = createWatcherSupervisor({
      watcher,
      onWarning(message) {
        warnings.push(message);
      }
    });

    await supervisor.start();
    watcher.emit("watcher-warning", new Error("temporary issue"));
    await new Promise((resolve) => setImmediate(resolve));

    expect(watcher.stopCalls).toBe(0);
    expect(warnings).toEqual([
      "[warn] File watcher issue: temporary issue"
    ]);
  });
});

describe("startWatcherInBackground", () => {
  it("logs startup failures instead of throwing", async () => {
    const watcher = new FakeWatcher(async () => {
      throw new Error("watch bootstrap failed");
    });
    const onWarning = vi.fn<(message: string) => void>();
    const supervisor = createWatcherSupervisor({
      watcher,
      onWarning
    });

    startWatcherInBackground(supervisor, onWarning);
    await new Promise((resolve) => setImmediate(resolve));

    expect(onWarning).toHaveBeenCalledWith(
      "[warn] File watching disabled: watch bootstrap failed"
    );
  });
});
