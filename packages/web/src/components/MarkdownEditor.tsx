import Editor from "react-simple-code-editor";
import Prism from "prismjs";
import "prismjs/components/prism-markup";
import "prismjs/components/prism-markdown";
import { type ReactNode } from "react";
import {
  type ForwardedRef,
  forwardRef,
  useCallback,
  useEffect,
  useEffectEvent,
  useId,
  useImperativeHandle,
  useRef
} from "react";
import type { CursorPosition } from "../store/useAppStore";
import {
  getScrollTopForSectionPosition,
  getSectionScrollPosition,
  measureSections,
  type SectionScrollPosition
} from "../lib/scrollSync";
import { parseMarkdownSections } from "../lib/markdownSections";

export interface MarkdownEditorProps {
  value: string;
  onChange(value: string): void;
  onSave(): void;
  onTogglePreview(): void;
  onCursorChange(position: CursorPosition): void;
  onScrollPositionChange?(position: SectionScrollPosition): void;
}

export interface MarkdownEditorHandle {
  getScrollPosition(): SectionScrollPosition | null;
  scrollToPosition(position: SectionScrollPosition): void;
}

function highlightMarkdown(value: string): ReactNode {
  const sections = parseMarkdownSections(value);

  return sections.map((section) => (
    <div
      key={section.index}
      data-sync-section-index={section.index}
      className="editor-sync-section"
    >
      <span
        dangerouslySetInnerHTML={{
          __html: Prism.highlight(section.text, Prism.languages.markdown, "markdown")
        }}
      />
    </div>
  ));
}

function MarkdownEditorInner({
  value,
  onChange,
  onSave,
  onTogglePreview,
  onCursorChange,
  onScrollPositionChange
}: MarkdownEditorProps, ref: ForwardedRef<MarkdownEditorHandle>) {
  const editorId = useId();
  const hostRef = useRef<HTMLDivElement | null>(null);
  const scrollFlushFrameRef = useRef<number | null>(null);
  const suppressReleaseFrameRef = useRef<number | null>(null);
  const pendingScrollTopRef = useRef<number | null>(null);
  const suppressScrollSyncRef = useRef(false);

  const getTextarea = useCallback(() => {
    const textarea = hostRef.current?.querySelector("textarea");
    return textarea instanceof HTMLTextAreaElement ? textarea : null;
  }, []);

  const getEditorMetrics = useCallback(() => {
    const textarea = getTextarea();
    if (!textarea) {
      return null;
    }

    return {
      textarea
    };
  }, [getTextarea]);

  const getSectionElements = useCallback(() => {
    const host = hostRef.current;
    if (!host) {
      return [];
    }

    return Array.from(host.querySelectorAll<HTMLElement>("[data-sync-section-index]"));
  }, []);

  const syncHighlightedLayer = useCallback((textarea: HTMLTextAreaElement) => {
    const pre = hostRef.current?.querySelector("pre");
    if (!(pre instanceof HTMLElement)) {
      return;
    }

    pre.style.transform = `translate(${-textarea.scrollLeft}px, ${-textarea.scrollTop}px)`;
  }, []);

  const updateCursorFromTextarea = useCallback(() => {
    const textarea = getTextarea();
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
  }, [getTextarea, onCursorChange]);

  const emitScrollPosition = useCallback(() => {
    if (!onScrollPositionChange) {
      return;
    }

    const metrics = getEditorMetrics();
    if (!metrics) {
      return;
    }

    const position = getSectionScrollPosition(
      metrics.textarea.scrollTop,
      measureSections(getSectionElements()),
      Math.max(0, metrics.textarea.scrollHeight - metrics.textarea.offsetHeight),
      metrics.textarea.offsetHeight
    );
    if (!position) {
      onScrollPositionChange({ sectionIdx: 0, posInSection: 0 });
      return;
    }

    onScrollPositionChange(position);
  }, [getEditorMetrics, getSectionElements, onScrollPositionChange]);

  const handleSave = useEffectEvent(() => {
    onSave();
  });

  const handleTogglePreview = useEffectEvent(() => {
    onTogglePreview();
  });

  useImperativeHandle(ref, () => ({
    getScrollPosition() {
      const metrics = getEditorMetrics();
      if (!metrics) {
        return null;
      }

      return getSectionScrollPosition(
        metrics.textarea.scrollTop,
        measureSections(getSectionElements()),
        Math.max(0, metrics.textarea.scrollHeight - metrics.textarea.offsetHeight),
        metrics.textarea.offsetHeight
      );
    },
    scrollToPosition(position: SectionScrollPosition) {
      const metrics = getEditorMetrics();
      if (!metrics) {
        return;
      }

      const targetScrollTop = getScrollTopForSectionPosition(
        position,
        measureSections(getSectionElements()),
        Math.max(0, metrics.textarea.scrollHeight - metrics.textarea.offsetHeight),
        metrics.textarea.offsetHeight
      );

      pendingScrollTopRef.current = targetScrollTop;

      if (scrollFlushFrameRef.current != null) {
        return;
      }

      const flushScroll = () => {
        scrollFlushFrameRef.current = null;
        const latestTargetScrollTop = pendingScrollTopRef.current;
        pendingScrollTopRef.current = null;
        if (latestTargetScrollTop == null) {
          return;
        }

        suppressScrollSyncRef.current = true;
        metrics.textarea.scrollTop = latestTargetScrollTop;
        syncHighlightedLayer(metrics.textarea);

        if (suppressReleaseFrameRef.current != null) {
          cancelAnimationFrame(suppressReleaseFrameRef.current);
        }

        suppressReleaseFrameRef.current = requestAnimationFrame(() => {
          suppressScrollSyncRef.current = false;
          suppressReleaseFrameRef.current = null;
          if (pendingScrollTopRef.current != null) {
            scrollFlushFrameRef.current = requestAnimationFrame(flushScroll);
          }
        });
      };

      scrollFlushFrameRef.current = requestAnimationFrame(flushScroll);
    }
  }), [getEditorMetrics, getSectionElements, syncHighlightedLayer]);

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
      syncHighlightedLayer(textarea);
      if (!suppressScrollSyncRef.current) {
        emitScrollPosition();
      }
    };

    syncScroll();
    textarea.addEventListener("scroll", syncScroll, { passive: true });

    return () => {
      textarea.removeEventListener("scroll", syncScroll);
    };
  }, [emitScrollPosition, value]);

  useEffect(() => {
    return () => {
      if (scrollFlushFrameRef.current != null) {
        cancelAnimationFrame(scrollFlushFrameRef.current);
      }
      if (suppressReleaseFrameRef.current != null) {
        cancelAnimationFrame(suppressReleaseFrameRef.current);
      }
    };
  }, []);

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
          emitScrollPosition();
        }}
      />
    </div>
  );
}

export const MarkdownEditor = forwardRef(MarkdownEditorInner);
