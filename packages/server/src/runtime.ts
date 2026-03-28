export interface WatcherSupervisor {
  start(): Promise<void>;
  stop(): Promise<void>;
}

export interface WatcherLike {
  on(event: "watcher-warning", listener: (error: Error & { code?: string }) => void): this;
  off(event: "watcher-warning", listener: (error: Error & { code?: string }) => void): this;
  start(): Promise<void>;
  stop(): Promise<void>;
}

export interface CreateWatcherSupervisorOptions {
  watcher: WatcherLike;
  onWarning(message: string): void;
}

function toWarningError(error: unknown): Error & { code?: string } {
  return error instanceof Error
    ? (error as Error & { code?: string })
    : Object.assign(new Error(String(error)), { code: undefined });
}

export function createWatcherSupervisor(
  options: CreateWatcherSupervisorOptions
): WatcherSupervisor {
  let started = false;
  let watcherDisabled = false;

  const handleWarning = async (error: Error & { code?: string }) => {
    if (watcherDisabled) {
      return;
    }

    if (error.code === "EMFILE" || error.code === "ENOSPC") {
      watcherDisabled = true;
      options.onWarning(`[warn] File watching disabled: ${error.message}`);
      options.onWarning(
        "[warn] Narrow your scan roots or raise the file descriptor limit to restore live updates."
      );
      await options.watcher.stop();
      return;
    }

    options.onWarning(`[warn] File watcher issue: ${error.message}`);
  };

  return {
    async start() {
      if (started) {
        return;
      }

      started = true;
      options.watcher.on("watcher-warning", handleWarning);
      await options.watcher.start();
    },
    async stop() {
      if (!started) {
        return;
      }

      started = false;
      options.watcher.off("watcher-warning", handleWarning);
      await options.watcher.stop();
    }
  };
}

export function startWatcherInBackground(
  supervisor: WatcherSupervisor,
  onWarning: (message: string) => void
): void {
  void supervisor.start().catch(async (error) => {
    const warning = toWarningError(error);
    onWarning(`[warn] File watching disabled: ${warning.message}`);
    await supervisor.stop();
  });
}
