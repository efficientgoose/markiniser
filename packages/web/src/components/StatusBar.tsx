import type { CursorPosition } from "../store/useAppStore";

function formatSaveStatus(status: "saved" | "saving" | "unsaved" | "error") {
  switch (status) {
    case "saving":
      return "Saving...";
    case "unsaved":
      return "Unsaved changes";
    case "error":
      return "Save failed";
    case "saved":
    default:
      return "Saved";
  }
}

function formatTimestamp(timestamp: string) {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return timestamp;
  }

  return date.toLocaleString();
}

export interface StatusBarProps {
  size: number;
  lastModified: string;
  saveStatus: "saved" | "saving" | "unsaved" | "error";
  cursorPosition: CursorPosition | null;
  isVirtual?: boolean;
}

export function StatusBar({
  size,
  lastModified,
  saveStatus,
  cursorPosition,
  isVirtual = false
}: StatusBarProps) {
  return (
    <footer className="flex items-center justify-between gap-4 border-t border-[color:var(--ctp-surface2)] bg-[color:var(--ctp-crust)] px-4 py-2 text-xs text-[color:var(--ctp-subtext0)]">
      <div className="flex min-w-0 items-center gap-4">
        <span>{size} bytes</span>
        <span>{formatTimestamp(lastModified)}</span>
      </div>
      <div className="flex items-center gap-4">
        <span className="text-[color:var(--ctp-text)]">
          {isVirtual ? "Sample file · local only" : formatSaveStatus(saveStatus)}
        </span>
        <span>
          {cursorPosition
            ? `Ln ${cursorPosition.line}, Col ${cursorPosition.column}`
            : "Ln -, Col -"}
        </span>
      </div>
    </footer>
  );
}
