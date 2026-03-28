import {
  type ForwardedRef,
  forwardRef,
  useCallback,
  useEffect,
  useMemo,
  useImperativeHandle,
  useRef
} from "react";
import { renderPreviewSections } from "../lib/previewMarkdown";
import {
  getScrollTopForSectionPosition,
  getSectionScrollPosition,
  measureSections,
  type SectionScrollPosition
} from "../lib/scrollSync";

export interface PreviewProps {
  content: string;
  onScrollPositionChange?(position: SectionScrollPosition): void;
  isFullscreen?: boolean;
}

export interface PreviewHandle {
  scrollToPosition(position: SectionScrollPosition): void;
}

function PreviewInner(
  { content, onScrollPositionChange, isFullscreen = false }: PreviewProps,
  ref: ForwardedRef<PreviewHandle>
) {
  const surfaceRef = useRef<HTMLDivElement | null>(null);
  const scrollFlushFrameRef = useRef<number | null>(null);
  const suppressReleaseFrameRef = useRef<number | null>(null);
  const pendingScrollTopRef = useRef<number | null>(null);
  const suppressScrollSyncRef = useRef(false);
  const sections = useMemo(() => renderPreviewSections(content), [content]);

  const getSectionElements = useCallback(() => {
    const surface = surfaceRef.current;
    if (!surface) {
      return [];
    }

    return Array.from(surface.querySelectorAll<HTMLElement>("[data-sync-section-index]"));
  }, []);

  const emitViewportLine = useCallback(() => {
    if (!onScrollPositionChange || !surfaceRef.current || suppressScrollSyncRef.current) {
      return;
    }

    const sectionMetrics = measureSections(getSectionElements());
    const position = getSectionScrollPosition(
      surfaceRef.current.scrollTop,
      sectionMetrics,
      Math.max(0, surfaceRef.current.scrollHeight - surfaceRef.current.offsetHeight),
      surfaceRef.current.offsetHeight
    );
    if (!position) {
      onScrollPositionChange({ sectionIdx: 0, posInSection: 0 });
      return;
    }

    onScrollPositionChange(position);
  }, [getSectionElements, onScrollPositionChange]);

  useImperativeHandle(ref, () => ({
    scrollToPosition(position: SectionScrollPosition) {
      const surface = surfaceRef.current;
      if (!surface) {
        return;
      }

      const sectionMetrics = measureSections(getSectionElements());
      if (sectionMetrics.length === 0) {
        surface.scrollTop = 0;
        return;
      }

      const targetScrollTop = getScrollTopForSectionPosition(
        position,
        sectionMetrics,
        Math.max(0, surface.scrollHeight - surface.offsetHeight),
        surface.offsetHeight
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
        surface.scrollTop = latestTargetScrollTop;

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
  }), [getSectionElements]);

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
    <div
      data-testid="preview-surface"
      ref={surfaceRef}
      className={`preview-pane hide-scrollbar h-full overflow-auto bg-[color:var(--ctp-base)] ${
        isFullscreen ? "px-2 pb-2 pt-0" : "p-2"
      }`}
      onScroll={emitViewportLine}
    >
      <article
        data-testid="preview-document"
        className="preview-document h-full rounded-[14px] bg-[color:var(--ctp-base)]"
      >
        <div className={`markdown-preview ${isFullscreen ? "px-3 pb-3 pt-0" : "px-3 py-3"}`}>
          {sections.map((section) => (
            <div
              key={section.index}
              data-sync-section-index={section.index}
              className="preview-sync-section"
              dangerouslySetInnerHTML={{ __html: section.html }}
            />
          ))}
        </div>
      </article>
    </div>
  );
}

export const Preview = forwardRef(PreviewInner);
