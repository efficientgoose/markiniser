import { useEffect, useMemo, useState } from "react";
import { ChevronRight, FileText, Folder, FolderDot, FolderOpen, FolderOpenDot } from "lucide-react";
import { countMarkdownFiles, type TreeViewElement } from "../../utils/treeTransform";

interface FileTreeProps {
  elements: TreeViewElement[];
  selectedId?: string | null;
  onSelect: (element: TreeViewElement) => void;
  initialExpandedIds?: string[];
  expandedIds?: string[];
}

const INDENT_SIZE = 14;
const GUIDE_COLOR = "rgba(88, 91, 112, 0.24)";

function sortElements(elements: TreeViewElement[]) {
  return [...elements].sort((a, b) => {
    if (a.type !== b.type) {
      return a.type === "folder" ? -1 : 1;
    }

    return a.name.localeCompare(b.name);
  });
}

function TreeBranch({
  elements,
  selectedId,
  onSelect,
  expandedIds,
  toggleExpanded,
  depth
}: {
  elements: TreeViewElement[];
  selectedId?: string | null;
  onSelect: (element: TreeViewElement) => void;
  expandedIds: Set<string>;
  toggleExpanded(id: string): void;
  depth: number;
}) {
  const sortedElements = useMemo(() => sortElements(elements), [elements]);
  const isNestedBranch = depth > 0;

  return (
    <div
      className="space-y-px"
      style={
        isNestedBranch
          ? {
              marginLeft: `${INDENT_SIZE}px`,
              paddingLeft: `${INDENT_SIZE - 8}px`,
              borderLeft: `1px solid ${GUIDE_COLOR}`
            }
          : undefined
      }
    >
      {sortedElements.map((element) => {
        const isFolder = element.type === "folder";
        const isExpanded = isFolder && expandedIds.has(element.id);
        const isSelected = element.type === "file" && selectedId === element.path;
        const Icon = isFolder
          ? depth === 0
            ? isExpanded
              ? FolderOpenDot
              : FolderDot
            : isExpanded
              ? FolderOpen
              : Folder
          : FileText;
        const fileCount = isFolder ? countMarkdownFiles(element) : 0;

        return (
          <div key={element.id} className="relative">
            <button
              type="button"
              className={`relative flex h-8 w-full items-center gap-2 rounded-[6px] pr-2 text-left text-[13px] font-medium font-[var(--font-mono)] transition ${
                isSelected
                  ? "bg-[color:var(--ctp-surface0)] text-[color:var(--ctp-lavender)]"
                  : "text-[color:var(--ctp-text)] hover:bg-[color:var(--ctp-surface0)]"
              }`}
              style={{ paddingLeft: isNestedBranch ? "14px" : "0px" }}
              aria-expanded={isFolder ? isExpanded : undefined}
              aria-selected={isSelected}
              aria-label={element.name}
              onClick={() => {
                if (isFolder) {
                  toggleExpanded(element.id);
                  return;
                }

                onSelect(element);
              }}
              onKeyDown={(event) => {
                if (event.key !== "Enter" && event.key !== " ") {
                  return;
                }

                event.preventDefault();
                if (isFolder) {
                  toggleExpanded(element.id);
                  return;
                }

                onSelect(element);
              }}
            >
              <ChevronRight
                aria-hidden="true"
                size={14}
                className={`shrink-0 text-[color:var(--ctp-overlay2)] transition-transform duration-150 ease-in-out ${
                  isExpanded ? "rotate-90" : ""
                } ${isFolder ? "opacity-100" : "opacity-0"}`}
              />
              <Icon
                aria-hidden="true"
                size={15}
                data-testid={
                  isFolder && depth === 0
                    ? isExpanded
                      ? "root-folder-open-icon"
                      : "root-folder-closed-icon"
                    : undefined
                }
                className={
                  isFolder
                    ? `shrink-0 text-[color:var(--ui-folder-accent)] ${
                        isExpanded ? "" : "fill-[color:var(--ui-folder-accent)]"
                      }`
                    : "shrink-0 text-[color:var(--ctp-subtext0)]"
                }
              />
              <span className="truncate">{element.name}</span>
              {isFolder ? (
                <span className="ml-auto shrink-0 text-[11px] text-[color:var(--ctp-subtext0)]">
                  ({fileCount})
                </span>
              ) : null}
            </button>

            {isFolder ? (
              <div
                className="relative grid overflow-hidden transition-[grid-template-rows,opacity] duration-150 ease-in-out"
                style={{
                  gridTemplateRows: isExpanded ? "1fr" : "0fr",
                  opacity: isExpanded ? 1 : 0.75
                }}
              >
                <div className="min-h-0 overflow-hidden">
                  <TreeBranch
                    elements={element.children ?? []}
                    selectedId={selectedId}
                    onSelect={onSelect}
                    expandedIds={expandedIds}
                    toggleExpanded={toggleExpanded}
                    depth={depth + 1}
                  />
                </div>
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

export function FileTree({
  elements,
  selectedId,
  onSelect,
  initialExpandedIds = [],
  expandedIds: externallyExpandedIds = []
}: FileTreeProps) {
  const [expandedIds, setExpandedIds] = useState(() => new Set(initialExpandedIds));

  useEffect(() => {
    setExpandedIds(new Set(initialExpandedIds));
  }, [initialExpandedIds]);

  useEffect(() => {
    if (externallyExpandedIds.length === 0) {
      return;
    }

    setExpandedIds((current) => new Set([...current, ...externallyExpandedIds]));
  }, [externallyExpandedIds]);

  return (
    <TreeBranch
      elements={elements}
      selectedId={selectedId}
      onSelect={onSelect}
      expandedIds={expandedIds}
      toggleExpanded={(id) => {
        setExpandedIds((current) => {
          const next = new Set(current);
          if (next.has(id)) {
            next.delete(id);
          } else {
            next.add(id);
          }

          return next;
        });
      }}
      depth={0}
    />
  );
}

export type { TreeViewElement };
