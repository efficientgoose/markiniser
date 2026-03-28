import { useEffect, useMemo, useRef, useState } from "react";
import { Command } from "cmdk";
import {
  Eye,
  FileText,
  PanelLeft,
  RefreshCw,
  Search
} from "lucide-react";
import { searchFiles } from "../lib/api";
import { useAppStore, useAppStoreApi } from "../store/useAppStore";
import "./CommandPalette.css";

interface CommandPaletteProps {
  open: boolean;
  onOpenChange(open: boolean): void;
}

interface PaletteCommand {
  id: string;
  name: string;
  shortcut: string[];
  icon: typeof Eye;
  run(): void | Promise<void>;
}

function getFileName(path: string) {
  return path.split("/").filter(Boolean).at(-1) ?? path;
}

function getFolderPath(path: string) {
  const segments = path.split("/").filter(Boolean);
  if (segments.length <= 1) {
    return "/";
  }

  return `/${segments.slice(0, -1).join("/")}`;
}

function highlightSnippet(snippet: string, query: string) {
  const normalizedQuery = query.trim();
  if (!normalizedQuery) {
    return snippet;
  }

  const index = snippet.toLowerCase().indexOf(normalizedQuery.toLowerCase());
  if (index === -1) {
    return snippet;
  }

  const before = snippet.slice(0, index);
  const match = snippet.slice(index, index + normalizedQuery.length);
  const after = snippet.slice(index + normalizedQuery.length);

  return (
    <>
      {before}
      <mark>{match}</mark>
      {after}
    </>
  );
}

function getMatchLabel(count: number) {
  return count === 1 ? "1 match" : `${count} matches`;
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const store = useAppStoreApi();
  const recentFiles = useAppStore((state) => state.recentFiles);
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [searchCount, setSearchCount] = useState(0);
  const [results, setResults] = useState<Awaited<ReturnType<typeof searchFiles>>["results"]>([]);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const requestIdRef = useRef(0);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        onOpenChange(!open);
        return;
      }

      if (event.key === "Escape" && open) {
        event.preventDefault();
        onOpenChange(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onOpenChange, open]);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setResults([]);
      setSearchCount(0);
      setIsLoading(false);
      return;
    }

    const focusId = window.setTimeout(() => {
      inputRef.current?.focus();
    }, 0);

    return () => {
      window.clearTimeout(focusId);
    };
  }, [open]);

  useEffect(() => {
    const normalizedQuery = query.trim();
    if (!open || !normalizedQuery) {
      setResults([]);
      setSearchCount(0);
      setIsLoading(false);
      return;
    }

    const currentRequestId = ++requestIdRef.current;
    setIsLoading(true);
    const timeoutId = window.setTimeout(() => {
      void searchFiles(normalizedQuery)
        .then((response) => {
          if (requestIdRef.current !== currentRequestId) {
            return;
          }

          setResults(response.results);
          setSearchCount(response.count);
          setIsLoading(false);
        })
        .catch(() => {
          if (requestIdRef.current !== currentRequestId) {
            return;
          }

          setResults([]);
          setSearchCount(0);
          setIsLoading(false);
        });
    }, 300);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [open, query]);

  const commands = useMemo<PaletteCommand[]>(
    () => [
      {
        id: "toggle-preview",
        name: "Toggle Preview Panel",
        shortcut: ["⌘", "⇧", "P"],
        icon: Eye,
        run: () => {
          store.getState().setPreviewOpen(!store.getState().isPreviewOpen);
        }
      },
      {
        id: "toggle-sidebar",
        name: "Toggle Sidebar",
        shortcut: ["⌘", "B"],
        icon: PanelLeft,
        run: () => {
          store.getState().setSidebarOpen(!store.getState().isSidebarOpen);
        }
      },
      {
        id: "refresh-tree",
        name: "Refresh File Tree",
        shortcut: ["R"],
        icon: RefreshCw,
        run: async () => {
          await store.getState().loadTree();
        }
      }
    ],
    [store]
  );

  const closePalette = () => {
    onOpenChange(false);
  };

  const handleOpenFile = async (path: string) => {
    await store.getState().openFile(path);
    closePalette();
  };

  const showSearchResults = query.trim().length > 0;

  return (
    open ? (
      <>
        <div
          cmdk-overlay=""
          onClick={closePalette}
        />
        <div
          cmdk-dialog=""
          role="dialog"
          aria-modal="true"
          aria-label="Search markdown files and commands"
          onClick={(event) => {
            event.stopPropagation();
          }}
        >
          <Command
            loop
            shouldFilter={false}
          >
            <div className="command-palette-header" data-testid="command-palette-header">
              <Search
                aria-hidden="true"
                size={18}
                className="command-palette-search-icon"
              />
              <Command.Input
                ref={inputRef}
                value={query}
                onValueChange={setQuery}
                placeholder="Search markdown files and commands"
              />
              <span className="command-palette-escape">esc</span>
            </div>
            <div className="command-palette-separator" data-testid="command-palette-separator" />
            <Command.List>
              {showSearchResults ? (
                <>
                  {isLoading ? <Command.Loading className="command-palette-loading">Searching...</Command.Loading> : null}
                  {!isLoading ? (
                    <>
                      <Command.Empty>No files matching '{query.trim()}'</Command.Empty>
                      {results.length > 0 ? (
                        <Command.Group heading={`Search results (${getMatchLabel(searchCount)})`}>
                          {results.map((result) => (
                            <Command.Item
                              key={result.path}
                              value={result.path}
                              onSelect={() => {
                                void handleOpenFile(result.path);
                              }}
                            >
                              <FileText size={16} />
                              <div className="command-palette-meta">
                                <div className="command-palette-title-row">
                                  <span className="command-palette-title">{result.name}</span>
                                  <span className="command-palette-path">{getFolderPath(result.path)}</span>
                                </div>
                                <div className="command-palette-snippet">
                                  {highlightSnippet(result.snippet, query)}
                                </div>
                              </div>
                            </Command.Item>
                          ))}
                        </Command.Group>
                      ) : null}
                    </>
                  ) : null}
                </>
              ) : (
                <>
                  {recentFiles.length > 0 ? (
                    <Command.Group heading="Recent files">
                      {recentFiles.map((path) => (
                        <Command.Item
                          key={path}
                          value={path}
                          onSelect={() => {
                            void handleOpenFile(path);
                          }}
                        >
                          <FileText size={16} />
                          <div className="command-palette-meta">
                            <div className="command-palette-title">{getFileName(path)}</div>
                            <div className="command-palette-path">{getFolderPath(path)}</div>
                          </div>
                        </Command.Item>
                      ))}
                    </Command.Group>
                  ) : null}
                  <Command.Group heading="Commands">
                    {commands.map((command) => {
                      const Icon = command.icon;
                      return (
                        <Command.Item
                          key={command.id}
                          value={command.name}
                          onSelect={() => {
                            void command.run();
                            closePalette();
                          }}
                        >
                          <Icon size={16} />
                          <div className="command-palette-meta">
                            <div className="command-palette-title">{command.name}</div>
                          </div>
                          <span className="command-palette-shortcut" aria-label={`Shortcut ${command.shortcut.join(" ")}`}>
                            {command.shortcut.map((part) => (
                              <span
                                key={`${command.id}-${part}`}
                                className="command-palette-shortcut-key"
                              >
                                {part}
                              </span>
                            ))}
                          </span>
                        </Command.Item>
                      );
                    })}
                  </Command.Group>
                </>
              )}
            </Command.List>
          </Command>
        </div>
      </>
    ) : null
  );
}
