import {
  useEffect,
  useEffectEvent,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent
} from "react";
import { BookOpen, BriefcaseBusiness, CheckCheck, Eye, MousePointerClick, PanelLeft, Pencil, Search } from "lucide-react";
import logo from "./assets/Markiniser Logo.png";
import { CommandPalette } from "./components/CommandPalette";
import { FileTreeSidebar } from "./components/FileTreeSidebar";
import { MarkdownEditor } from "./components/MarkdownEditor";
import { Preview } from "./components/Preview";
import { RootPickerModal } from "./components/RootPickerModal";
import { StatusBar } from "./components/StatusBar";
import {
  AppStoreProvider,
  useAppStore,
  useAppStoreApi
} from "./store/useAppStore";
import { useFileWatcher } from "./hooks/useFileWatcher";
import { useAutosave } from "./hooks/useAutosave";

const SIDEBAR_COLLAPSE_THRESHOLD = 220;

interface AppLayoutProps {
  onOpenPalette(): void;
  onOpenRootPicker(): void;
}

function AppLayout({ onOpenPalette, onOpenRootPicker }: AppLayoutProps) {
  const store = useAppStoreApi();
  const fileTree = useAppStore((state) => state.fileTree);
  const currentFile = useAppStore((state) => state.currentFile);
  const dirtyContent = useAppStore((state) => state.dirtyContent);
  const saveStatus = useAppStore((state) => state.saveStatus);
  const cursorPosition = useAppStore((state) => state.cursorPosition);
  const isPreviewOpen = useAppStore((state) => state.isPreviewOpen);
  const isSidebarOpen = useAppStore((state) => state.isSidebarOpen);
  const externalChangeNotice = useAppStore((state) => state.externalChangeNotice);
  const externalFileSnapshot = useAppStore((state) => state.externalFileSnapshot);
  const sidebarWidth = useAppStore((state) => state.sidebarWidth);
  const previewWidth = useAppStore((state) => state.previewWidth);
  const [activeResizeMode, setActiveResizeMode] = useState<"sidebar" | "preview" | null>(null);

  useFileWatcher();
  const { saveNow } = useAutosave({
    store,
    currentFile,
    dirtyContent
  });

  useEffect(() => {
    void store.getState().loadTree();
  }, [store]);

  const handleEditorChange = useEffectEvent((nextContent: string) => {
    const activeFile = store.getState().currentFile;
    if (!activeFile) {
      return;
    }

    if (nextContent === activeFile.content) {
      store.getState().setDirtyContent(null);
      store.getState().setSaveStatus("saved");
      return;
    }

    store.getState().setDirtyContent(nextContent);
    store.getState().setSaveStatus(activeFile.isVirtual ? "saved" : "unsaved");
  });

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.shiftKey && event.key.toLowerCase() === "p") {
        event.preventDefault();
        store.getState().setPreviewOpen(!store.getState().isPreviewOpen);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [store]);

  const resizeMode = useRef<"sidebar" | "preview" | null>(null);

  useEffect(() => {
    const handleResizeMove = (clientX: number) => {
      if (resizeMode.current === "sidebar") {
        if (clientX < SIDEBAR_COLLAPSE_THRESHOLD) {
          store.getState().setSidebarOpen(false);
          resizeMode.current = null;
          return;
        }

        if (!store.getState().isSidebarOpen) {
          store.getState().setSidebarOpen(true);
        }

        store.getState().setSidebarWidth(clientX);
      }

      if (resizeMode.current === "preview") {
        store.getState().setPreviewWidth(window.innerWidth - clientX);
      }
    };

    const handlePointerMove = (event: PointerEvent) => {
      handleResizeMove(event.clientX);
    };

    const handleMouseMove = (event: MouseEvent) => {
      handleResizeMove(event.clientX);
    };

    const stopResize = () => {
      resizeMode.current = null;
      setActiveResizeMode(null);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", stopResize);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", stopResize);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", stopResize);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", stopResize);
    };
  }, [store]);

  const collapsedBalancedLayout = !isSidebarOpen && isPreviewOpen;
  const balancedOpenLayout = isSidebarOpen && isPreviewOpen && previewWidth === 0;
  const panelStyle = {
    gridTemplateColumns: collapsedBalancedLayout
      ? "0px 8px minmax(0, 1fr) 8px minmax(0, 1fr)"
      : balancedOpenLayout
        ? `${sidebarWidth}px 8px minmax(0, 1fr) 8px minmax(0, 1fr)`
      : `${isSidebarOpen ? `${sidebarWidth}px` : "0px"} 8px minmax(0, 1fr) ${
          isPreviewOpen ? `8px ${previewWidth}px` : ""
        }`,
    transition: activeResizeMode ? "none" : "grid-template-columns 220ms ease"
  };
  const editorContent = dirtyContent ?? currentFile?.content ?? "";
  const startResize = (
    event: ReactPointerEvent<HTMLDivElement> | ReactMouseEvent<HTMLDivElement>,
    mode: "sidebar" | "preview"
  ) => {
    event.preventDefault();
    resizeMode.current = mode;
    setActiveResizeMode(mode);
  };
  const chromeButtonClass =
    "rounded-md border border-[color:rgba(255,255,255,0.06)] bg-[color:rgba(49,50,68,0.5)] px-3.5 py-1 text-sm text-[color:var(--ctp-subtext1)] shadow-[inset_0_1px_0_rgba(255,255,255,0.025)] transition hover:bg-[color:rgba(69,71,90,0.52)] hover:text-[color:var(--ctp-text)]";
  const iconButtonClass =
    "flex h-7 w-7 items-center justify-center rounded-md border border-[color:rgba(255,255,255,0.06)] bg-[color:rgba(49,50,68,0.5)] text-[color:var(--ctp-subtext1)] shadow-[inset_0_1px_0_rgba(255,255,255,0.025)] transition hover:bg-[color:rgba(69,71,90,0.52)] hover:text-[color:var(--ctp-text)]";
  const searchTriggerClass =
    "flex h-8 w-full min-w-[13rem] max-w-[16.75rem] items-center gap-3 rounded-lg border border-[color:rgba(255,255,255,0.05)] bg-[color:rgba(49,50,68,0.32)] px-4 text-[13px] text-[color:var(--ctp-subtext0)] shadow-[inset_0_1px_0_rgba(255,255,255,0.02)] transition hover:bg-[color:rgba(49,50,68,0.42)] hover:text-[color:var(--ctp-subtext1)]";
  const headerIconButtonClass =
    "flex h-8 w-10 items-center justify-center rounded-lg border border-[color:rgba(255,255,255,0.05)] bg-[color:rgba(49,50,68,0.32)] text-[color:var(--ctp-subtext0)] shadow-[inset_0_1px_0_rgba(255,255,255,0.02)] transition hover:bg-[color:rgba(49,50,68,0.42)] hover:text-[color:var(--ctp-subtext1)]";

  return (
    <div data-testid="app-shell" className="theme-mocha font-[var(--font-sans)]">
      <header className="border-b border-[color:rgba(255,255,255,0.05)] bg-[color:var(--ctp-crust)] px-5 py-2">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2.5">
            <img
              src={logo}
              alt="Markiniser logo"
              className="h-8 w-8 rounded-md object-cover"
            />
            <div className="leading-tight">
              <div
                className="text-xl text-[color:var(--ctp-lavender)]"
                style={{ fontFamily: "var(--font-brand)", fontWeight: 400 }}
              >
                Markiniser
              </div>
              <div className="text-[11px] text-[color:var(--ctp-subtext0)]">
              Your very own local markdown workspace
              </div>
            </div>
          </div>
          <div className="mx-auto text-sm font-medium text-[color:var(--ctp-subtext1)]">
            {currentFile?.name ?? ""}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label="Open search palette"
              className={searchTriggerClass}
              onClick={onOpenPalette}
            >
              <Search size={16} className="shrink-0 text-[color:var(--ctp-overlay2)]" />
              <span className="flex-1 truncate text-left">Search</span>
              <span className="flex items-center gap-1 rounded-lg border border-[color:rgba(255,255,255,0.05)] bg-[color:rgba(17,17,27,0.6)] px-2 py-1 text-[11px] text-[color:var(--ctp-subtext0)] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.02)]">
                <span aria-hidden="true" className="text-[12px] leading-none">
                  ⌘
                </span>
                <span>K</span>
              </span>
            </button>
            <button
              type="button"
              aria-label="Toggle preview"
              className={headerIconButtonClass}
              onClick={() => {
                store.getState().setPreviewOpen(!isPreviewOpen);
              }}
            >
              <Eye size={16} />
            </button>
          </div>
        </div>
      </header>

      <main
        data-testid="workspace-grid"
        className="grid h-[calc(100vh-58px)]"
        style={panelStyle}
      >
        {isSidebarOpen ? (
          <aside className="overflow-hidden border-r border-[color:rgba(255,255,255,0.05)] bg-[color:var(--ctp-mantle)] px-4 py-3">
            <div className="flex h-full flex-col gap-2">
              <div className="flex items-center justify-between text-xs text-[color:var(--ctp-subtext0)]">
                <div className="flex items-center">
                  <span className="flex items-center gap-1.5 text-[13px] font-medium text-[color:var(--ctp-subtext1)]">
                    <BriefcaseBusiness size={14} strokeWidth={2} className="text-[color:var(--ctp-overlay2)]" />
                    <span>Files</span>
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    aria-label="Edit root path"
                    className={iconButtonClass}
                    onClick={onOpenRootPicker}
                  >
                    <Pencil size={14} strokeWidth={2.1} />
                  </button>
                  <button
                    type="button"
                    aria-label="Collapse sidebar"
                    className={iconButtonClass}
                    onClick={() => {
                      store.getState().setSidebarOpen(false);
                    }}
                  >
                    <PanelLeft size={14} strokeWidth={2.1} />
                  </button>
                </div>
              </div>

              <div className="hide-scrollbar min-h-0 flex-1 overflow-auto">
                <FileTreeSidebar />
              </div>
            </div>
          </aside>
        ) : (
          <div />
        )}

        <div
          className={`relative bg-[color:var(--ctp-crust)] ${isSidebarOpen ? "cursor-col-resize" : ""}`}
          onPointerDown={(event: ReactPointerEvent<HTMLDivElement>) => {
            if (!isSidebarOpen) {
              return;
            }

            startResize(event, "sidebar");
          }}
          onMouseDown={(event: ReactMouseEvent<HTMLDivElement>) => {
            if (!isSidebarOpen) {
              return;
            }

            startResize(event, "sidebar");
          }}
        />
        {!isSidebarOpen ? (
          <button
            type="button"
            aria-label="Expand sidebar"
            className="absolute left-0 top-[88px] z-10 flex h-8 w-[24px] items-center justify-center rounded-r-md border border-l-0 border-[color:rgba(255,255,255,0.05)] bg-[color:rgba(49,50,68,0.58)] text-[color:var(--ctp-subtext1)] shadow-[inset_0_1px_0_rgba(255,255,255,0.025)] transition hover:bg-[color:rgba(69,71,90,0.54)] hover:text-[color:var(--ctp-text)]"
            onClick={() => {
              store.getState().setSidebarOpen(true);
            }}
          >
            <PanelLeft size={14} strokeWidth={2.1} />
          </button>
        ) : null}

        <section className="flex min-h-0 flex-col bg-[color:var(--ctp-base)]">
          {externalChangeNotice ? (
            <div className="mx-6 mt-6 rounded-lg border border-[color:var(--ctp-peach)]/40 bg-[color:var(--ctp-peach)]/10 px-4 py-3 text-sm text-[color:var(--ctp-peach)]">
              <div>{externalChangeNotice}</div>
              {externalFileSnapshot ? (
                <div className="mt-3 flex items-center gap-2">
                  <button
                    type="button"
                    className="rounded-md border border-[color:var(--ctp-surface2)] bg-[color:var(--ctp-crust)] px-3 py-1.5 text-sm text-[color:var(--ctp-text)] transition hover:bg-[color:var(--ctp-surface0)]"
                    onClick={() => {
                      store.getState().setExternalChangeNotice(null);
                      store.getState().setExternalFileSnapshot(null);
                    }}
                  >
                    Keep mine
                  </button>
                  <button
                    type="button"
                    className="rounded-md border border-[color:var(--ctp-surface2)] bg-[color:var(--ctp-crust)] px-3 py-1.5 text-sm text-[color:var(--ctp-text)] transition hover:bg-[color:var(--ctp-surface0)]"
                    onClick={() => {
                      const snapshot = store.getState().externalFileSnapshot;
                      if (!snapshot) {
                        return;
                      }

                      store.getState().openFile(snapshot);
                    }}
                  >
                    Load external
                  </button>
                </div>
              ) : null}
            </div>
          ) : null}

          {currentFile ? (
            <>
              <div className="min-h-0 flex-1 p-2">
                <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl bg-[color:var(--ctp-base)]">
                  <div className="min-h-0 flex-1">
                    <MarkdownEditor
                      value={editorContent}
                      onChange={handleEditorChange}
                      onSave={() => {
                        void saveNow();
                      }}
                      onTogglePreview={() => {
                        store.getState().setPreviewOpen(!store.getState().isPreviewOpen);
                      }}
                      onCursorChange={(position) => {
                        store.getState().setCursorPosition(position);
                      }}
                    />
                  </div>
                </div>
              </div>
              <StatusBar
                size={dirtyContent?.length ?? currentFile.size}
                lastModified={currentFile.lastModified}
                saveStatus={saveStatus}
                cursorPosition={cursorPosition}
                isVirtual={currentFile.isVirtual}
              />
            </>
          ) : (
            <div className="flex h-full min-h-[320px] items-center justify-center px-6 py-6">
              <div className="max-w-md text-center">
                <MousePointerClick
                  aria-hidden="true"
                  size={56}
                  className="mx-auto mb-8 text-[color:var(--ctp-subtext0)]"
                />
                <p className="text-lg text-[color:var(--ctp-text)]">
                  Select a file from the sidebar or search to start editing
                </p>
                <p className="mt-3 text-sm text-[color:var(--ctp-subtext0)]">
                  Cmd/Ctrl+K opens the command palette. Edit, preview and autosave supported.
                </p>
                <button
                  type="button"
                  className="mt-6 rounded-lg border border-[color:rgba(255,255,255,0.06)] bg-[color:rgba(49,50,68,0.44)] px-4 py-2 text-sm text-[color:var(--ctp-text)] shadow-[inset_0_1px_0_rgba(255,255,255,0.025)] transition hover:bg-[color:rgba(69,71,90,0.52)]"
                  onClick={() => {
                    store.getState().openSampleFile();
                  }}
                >
                  Load sample file
                </button>
              </div>
            </div>
          )}
        </section>

        {isPreviewOpen ? (
          <>
            <div
              className="cursor-col-resize bg-[color:var(--ctp-crust)]"
              onPointerDown={(event: ReactPointerEvent<HTMLDivElement>) => {
                startResize(event, "preview");
              }}
              onMouseDown={(event: ReactMouseEvent<HTMLDivElement>) => {
                startResize(event, "preview");
              }}
            />
            <aside className="overflow-hidden border-l border-[color:rgba(255,255,255,0.05)] bg-[color:var(--ctp-mantle)]">
              {currentFile ? (
                <Preview content={editorContent} />
              ) : (
                <div className="flex h-full items-center justify-center px-4 py-6">
                  <div className="flex w-full max-w-xs flex-col items-center rounded-2xl border border-dashed border-[color:rgba(88,91,112,0.3)] bg-[color:rgba(49,50,68,0.42)] px-6 py-8 text-center text-sm text-[color:var(--ctp-subtext0)]">
                    <BookOpen
                      aria-hidden="true"
                      size={44}
                      className="mb-5 text-[color:var(--ctp-subtext0)]"
                    />
                    <span>Open a markdown file to see the live preview.</span>
                  </div>
                </div>
              )}
            </aside>
          </>
        ) : null}
      </main>
    </div>
  );
}

export function App() {
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);
  const [isRootPickerOpen, setIsRootPickerOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isToastVisible, setIsToastVisible] = useState(false);

  useEffect(() => {
    if (!toastMessage) {
      return;
    }

    setIsToastVisible(true);

    const hideId = window.setTimeout(() => {
      setIsToastVisible(false);
    }, 3000);
    const removeId = window.setTimeout(() => {
      setToastMessage(null);
    }, 3260);

    return () => {
      window.clearTimeout(hideId);
      window.clearTimeout(removeId);
    };
  }, [toastMessage]);

  return (
    <AppStoreProvider>
      <AppLayout
        onOpenPalette={() => {
          setIsPaletteOpen(true);
        }}
        onOpenRootPicker={() => {
          setIsRootPickerOpen(true);
        }}
      />
      <CommandPalette
        open={isPaletteOpen}
        onOpenChange={setIsPaletteOpen}
      />
      <RootPickerModal
        open={isRootPickerOpen}
        onOpenChange={setIsRootPickerOpen}
        onRootApplied={() => {
          setIsToastVisible(true);
          setToastMessage("Root folder updated");
        }}
      />
      {toastMessage ? (
        <div className="pointer-events-none fixed bottom-6 left-1/2 z-[60] -translate-x-1/2">
          <div
            className={`flex items-center gap-3 rounded-xl bg-[color:rgba(24,24,37,0.94)] px-4 py-3 text-sm text-[color:var(--ctp-text)] shadow-[0_20px_50px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.03)] ring-1 ring-[color:rgba(255,255,255,0.04)] backdrop-blur-xl transition-all duration-250 ${
              isToastVisible
                ? "translate-y-0 opacity-100"
                : "translate-y-2 opacity-0"
            }`}
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[color:rgba(166,227,161,0.14)] text-[color:var(--ctp-green)]">
              <CheckCheck size={15} strokeWidth={2.25} />
            </span>
            <span>{toastMessage}</span>
          </div>
        </div>
      ) : null}
    </AppStoreProvider>
  );
}
