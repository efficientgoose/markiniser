export interface StartupBoxOptions {
  version: string;
  indexedFiles: number;
  directoryCount: number;
  roots: string[];
  url: string;
}

function padLine(content: string, width: number): string {
  return `│ ${content.padEnd(width - 4)} │`;
}

export function formatStartupBox(options: StartupBoxOptions): string {
  const scannedRoots =
    options.roots.length > 0 ? options.roots.join(", ") : "(no roots configured)";
  const lines = [
    `Markiniser v${options.version}`,
    `Indexed ${options.indexedFiles} files from ${options.directoryCount} ${options.directoryCount === 1 ? "directory" : "directories"}`,
    `Scanned ${scannedRoots}`,
    `Running at ${options.url}`,
    "Press Ctrl+C to stop"
  ];
  const width = Math.max(42, Math.max(...lines.map((line) => line.length)) + 4);

  return [
    `┌${"─".repeat(width - 2)}┐`,
    ...lines.map((line) => padLine(line, width)),
    `└${"─".repeat(width - 2)}┘`
  ].join("\n");
}
