import { execFile } from "node:child_process";

export interface DirectoryPickerOptions {
  onWarning?: (message: string) => void;
  platform?: NodeJS.Platform;
  execFile?: typeof execFile;
}

function execFileAsync(
  file: string,
  args: string[],
  execFileImpl: typeof execFile
): Promise<string> {
  return new Promise((resolve, reject) => {
    execFileImpl(file, args, (error, stdout) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(stdout);
    });
  });
}

function isUserCanceledError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes("User canceled") || message.includes("(-128)");
}

export async function pickDirectory(
  options: DirectoryPickerOptions = {}
): Promise<string | null> {
  const platform = options.platform ?? process.platform;
  const execFileImpl = options.execFile ?? execFile;

  if (platform !== "darwin") {
    options.onWarning?.("[warn] Native directory picking is only supported on macOS.");
    return null;
  }

  try {
    const stdout = await execFileAsync(
      "osascript",
      [
        "-e",
        'POSIX path of (choose folder with prompt "Choose a markdown root folder")'
      ],
      execFileImpl
    );
    const selectedPath = stdout.trim();
    return selectedPath || null;
  } catch (error) {
    if (isUserCanceledError(error)) {
      return null;
    }

    const message = error instanceof Error ? error.message : String(error);
    options.onWarning?.(`[warn] Native directory picker failed: ${message}`);
    throw error;
  }
}
