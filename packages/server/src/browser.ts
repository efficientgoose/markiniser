import { spawn as nodeSpawn } from "node:child_process";

export interface BrowserOpenCommand {
  command: string;
  args: string[];
}

export interface OpenBrowserOptions {
  platform?: NodeJS.Platform;
  onWarning?: (message: string) => void;
  spawn?: (command: string, args: string[]) => BrowserProcessLike;
}

export interface BrowserProcessLike {
  on(event: "error", handler: (error: Error) => void): BrowserProcessLike;
  unref(): void;
}

export function getBrowserOpenCommand(
  url: string,
  platform: NodeJS.Platform = process.platform
): BrowserOpenCommand | null {
  if (platform === "darwin") {
    return {
      command: "open",
      args: [url]
    };
  }

  if (platform === "linux") {
    return {
      command: "xdg-open",
      args: [url]
    };
  }

  if (platform === "win32") {
    return {
      command: "cmd",
      args: ["/c", "start", "", url]
    };
  }

  return null;
}

export function openBrowser(url: string, options: OpenBrowserOptions = {}): void {
  const command = getBrowserOpenCommand(url, options.platform);
  const onWarning = options.onWarning ?? ((message: string) => console.warn(message));

  if (!command) {
    onWarning("[warn] Could not open browser automatically: unsupported platform");
    return;
  }

  const spawn = options.spawn ?? ((executable: string, args: string[]) =>
    nodeSpawn(executable, args, {
      detached: true,
      stdio: "ignore"
    }));

  const child = spawn(command.command, command.args);
  child.on("error", (error: Error) => {
    onWarning(`[warn] Could not open browser automatically: ${error.message}`);
  });
  child.unref();
}
