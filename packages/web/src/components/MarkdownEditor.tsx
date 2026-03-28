import Editor from "react-simple-code-editor";
import Prism from "prismjs";
import "prismjs/components/prism-markup";
import "prismjs/components/prism-markdown";
import { useCallback, useEffect, useEffectEvent, useId, useRef } from "react";
import type { CursorPosition } from "../store/useAppStore";

export interface MarkdownEditorProps {
  value: string;
  onChange(value: string): void;
  onSave(): void;
  onTogglePreview(): void;
  onCursorChange(position: CursorPosition): void;
}

function highlightMarkdown(value: string) {
  return Prism.highlight(value, Prism.languages.markdown, "markdown");
}

export function MarkdownEditor({
  value,
  onChange,
  onSave,
  onTogglePreview,
  onCursorChange
}: MarkdownEditorProps) {
  const editorId = useId();
  const hostRef = useRef<HTMLDivElement | null>(null);

  const updateCursorFromTextarea = useCallback(() => {
    const textarea = hostRef.current?.querySelector("textarea");
    if (!textarea) {
      return;
    }

    const cursorOffset = textarea.selectionStart ?? 0;
    const lines = textarea.value.slice(0, cursorOffset).split("\n");
    const currentLine = lines.at(-1) ?? "";
    onCursorChange({
      line: lines.length,
      column: currentLine.length + 1
    });
  }, [onCursorChange]);

  const handleSave = useEffectEvent(() => {
    onSave();
  });

  const handleTogglePreview = useEffectEvent(() => {
    onTogglePreview();
  });

  useEffect(() => {
    const host = hostRef.current;
    if (!host) {
      return;
    }

    const textarea = host.querySelector("textarea");
    const pre = host.querySelector("pre");
    if (!(textarea instanceof HTMLTextAreaElement) || !(pre instanceof HTMLElement)) {
      return;
    }

    const syncScroll = () => {
      pre.style.transform = `translate(${-textarea.scrollLeft}px, ${-textarea.scrollTop}px)`;
    };

    syncScroll();
    textarea.addEventListener("scroll", syncScroll, { passive: true });

    return () => {
      textarea.removeEventListener("scroll", syncScroll);
    };
  }, [value]);

  return (
    <div ref={hostRef} className="h-full min-h-0">
      <label htmlFor={editorId} className="sr-only">
        Markdown editor
      </label>
      <Editor
        value={value}
        onValueChange={(nextValue) => {
          onChange(nextValue);
        }}
        highlight={highlightMarkdown}
        textareaId={editorId}
        padding={8}
        textareaClassName="markdown-source-editor__input hide-scrollbar"
        preClassName="markdown-source-editor__pre"
        className="markdown-source-editor h-full min-h-0 bg-[color:var(--ctp-base)]"
        style={{
          minHeight: "100%",
          backgroundColor: "var(--ctp-base)",
          color: "var(--ctp-text)",
          fontFamily: "var(--font-mono)",
          fontSize: "14px",
          lineHeight: "1.7"
        }}
        onKeyDown={(event) => {
          if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
            event.preventDefault();
            handleSave();
            return;
          }

          if (
            (event.metaKey || event.ctrlKey) &&
            event.shiftKey &&
            event.key.toLowerCase() === "p"
          ) {
            event.preventDefault();
            handleTogglePreview();
            return;
          }

          requestAnimationFrame(() => {
            updateCursorFromTextarea();
          });
        }}
        onKeyUp={() => {
          updateCursorFromTextarea();
        }}
        onClick={() => {
          updateCursorFromTextarea();
        }}
        onFocus={() => {
          updateCursorFromTextarea();
        }}
      />
    </div>
  );
}
