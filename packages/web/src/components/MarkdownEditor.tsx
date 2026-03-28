import {
  EditorSelection,
  EditorState,
  type Extension
} from "@codemirror/state";
import { markdown } from "@codemirror/lang-markdown";
import { defaultKeymap } from "@codemirror/commands";
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import {
  EditorView,
  keymap
} from "@codemirror/view";
import { minimalSetup } from "codemirror";
import { tags } from "@lezer/highlight";
import {
  useCallback,
  useEffect,
  useEffectEvent,
  useRef
} from "react";
import type { CursorPosition } from "../store/useAppStore";

export interface MarkdownEditorProps {
  value: string;
  onChange(value: string): void;
  onSave(): void;
  onTogglePreview(): void;
  onCursorChange(position: CursorPosition): void;
}

const editorHighlightStyle = HighlightStyle.define([
  {
    tag: tags.heading,
    textDecoration: "none",
    color: "var(--ctp-lavender)",
    fontWeight: "600"
  },
  {
    tag: tags.heading1,
    fontSize: "1.65em",
    lineHeight: "1.25"
  },
  {
    tag: tags.heading2,
    fontSize: "1.45em",
    lineHeight: "1.3"
  },
  {
    tag: tags.heading3,
    fontSize: "1.28em",
    lineHeight: "1.35"
  },
  {
    tag: tags.heading4,
    fontSize: "1.16em",
    lineHeight: "1.4"
  },
  {
    tag: [tags.heading5, tags.heading6],
    fontSize: "1.05em",
    lineHeight: "1.45"
  },
  {
    tag: tags.emphasis,
    color: "var(--ctp-mauve)",
    fontStyle: "italic"
  },
  {
    tag: tags.strong,
    color: "var(--ctp-text)",
    fontWeight: "700"
  },
  {
    tag: [tags.monospace, tags.processingInstruction],
    color: "var(--ctp-mauve)",
    backgroundColor: "rgba(203, 166, 247, 0.10)"
  },
  {
    tag: [tags.link, tags.url],
    color: "var(--ctp-blue)",
    textDecoration: "none"
  },
  {
    tag: [tags.quote, tags.list, tags.contentSeparator],
    color: "var(--ctp-overlay2)"
  },
  {
    tag: [tags.meta, tags.labelName],
    color: "var(--ctp-subtext0)"
  }
]);

function supportsCodeMirrorLayout() {
  if (typeof document === "undefined" || typeof document.createRange !== "function") {
    return false;
  }

  return typeof document.createRange().getClientRects === "function";
}

export function MarkdownEditor({
  value,
  onChange,
  onSave,
  onTogglePreview,
  onCursorChange
}: MarkdownEditorProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const viewRef = useRef<EditorView | null>(null);
  const syncingRef = useRef(false);
  const useTextareaFallback = !supportsCodeMirrorLayout();

  const handleChange = useEffectEvent((nextValue: string) => {
    onChange(nextValue);
  });
  const handleSave = useEffectEvent(() => {
    onSave();
  });
  const handleTogglePreview = useEffectEvent(() => {
    onTogglePreview();
  });
  const handleCursorChange = useEffectEvent((position: CursorPosition) => {
    onCursorChange(position);
  });

  const handleTextareaCursor = useCallback(
    (target: HTMLTextAreaElement) => {
      const cursorOffset = target.selectionStart ?? 0;
      const lines = target.value.slice(0, cursorOffset).split("\n");
      const currentLine = lines.at(-1) ?? "";
      handleCursorChange({
        line: lines.length,
        column: currentLine.length + 1
      });
    },
    [handleCursorChange]
  );

  if (useTextareaFallback) {
    return (
      <textarea
        aria-label="Markdown editor"
        className="hide-scrollbar h-full w-full resize-none overflow-auto border-0 bg-[color:var(--ctp-base)] px-3 py-3 font-[var(--font-mono)] text-sm leading-7 text-[color:var(--ctp-text)] outline-none"
        value={value}
        onChange={(event) => {
          handleChange(event.target.value);
        }}
        onKeyDown={(event) => {
          if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
            event.preventDefault();
            handleSave();
          }

          if (
            (event.metaKey || event.ctrlKey) &&
            event.shiftKey &&
            event.key.toLowerCase() === "p"
          ) {
            event.preventDefault();
            handleTogglePreview();
          }
        }}
        onClick={(event) => {
          handleTextareaCursor(event.currentTarget);
        }}
        onKeyUp={(event) => {
          handleTextareaCursor(event.currentTarget);
        }}
      />
    );
  }

  useEffect(() => {
    if (!hostRef.current || viewRef.current) {
      return;
    }

    const editorExtensions: Extension[] = [
      minimalSetup,
      markdown(),
      syntaxHighlighting(editorHighlightStyle),
      EditorView.lineWrapping,
      keymap.of([
        ...defaultKeymap,
        {
          key: "Mod-s",
          run() {
            handleSave();
            return true;
          }
        },
        {
          key: "Mod-Shift-p",
          run() {
            handleTogglePreview();
            return true;
          }
        }
      ]),
      EditorView.theme({
        "&": {
          height: "100%",
          backgroundColor: "var(--ctp-base)",
          color: "var(--ctp-text)",
          fontFamily: "var(--font-mono)",
          fontSize: "14px"
        },
        ".cm-scroller": {
          fontFamily: "var(--font-mono)",
          lineHeight: "1.7"
        },
        ".cm-content": {
          padding: "12px 14px",
          caretColor: "var(--ctp-lavender)"
        },
        ".cm-activeLine": {
          backgroundColor: "rgba(69, 71, 90, 0.35)"
        },
        ".cm-activeLineGutter": {
          backgroundColor: "var(--ctp-mantle)"
        },
        ".cm-gutters": {
          backgroundColor: "var(--ctp-mantle)",
          color: "var(--ctp-overlay2)",
          borderRight: "1px solid var(--ctp-surface2)"
        },
        ".cm-selectionBackground, ::selection": {
          backgroundColor: "rgba(180, 190, 254, 0.28)"
        },
        "&.cm-focused": {
          outline: "none"
        }
      }),
      EditorView.contentAttributes.of({
        "aria-label": "Markdown editor"
      }),
      EditorView.updateListener.of((update) => {
        if (update.docChanged && !syncingRef.current) {
          handleChange(update.state.doc.toString());
        }

        if (update.selectionSet || update.docChanged) {
          const head = update.state.selection.main.head;
          const line = update.state.doc.lineAt(head);
          handleCursorChange({
            line: line.number,
            column: head - line.from + 1
          });
        }
      })
    ];

    const view = new EditorView({
      state: EditorState.create({
        doc: value,
        extensions: editorExtensions
      }),
      parent: hostRef.current
    });

    viewRef.current = view;
    const initialLine = view.state.doc.lineAt(0);
    handleCursorChange({
      line: initialLine.number,
      column: 1
    });

    return () => {
      view.destroy();
      viewRef.current = null;
    };
  }, [handleChange, handleCursorChange, handleSave, handleTogglePreview, value]);

  useEffect(() => {
    const view = viewRef.current;
    if (!view) {
      return;
    }

    const currentValue = view.state.doc.toString();
    if (currentValue === value) {
      return;
    }

    syncingRef.current = true;
    const selection = view.state.selection.main;
    const nextAnchor = Math.min(selection.anchor, value.length);
    const nextHead = Math.min(selection.head, value.length);

    view.dispatch({
      changes: {
        from: 0,
        to: currentValue.length,
        insert: value
      },
      selection: EditorSelection.single(nextAnchor, nextHead)
    });

    syncingRef.current = false;
  }, [value]);

  return <div ref={hostRef} className="h-full min-h-0" />;
}
