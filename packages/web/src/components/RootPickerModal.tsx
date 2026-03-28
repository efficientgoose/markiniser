import { useEffect, useRef, useState } from "react";
import { FolderOpen, Pencil } from "lucide-react";
import { browseRootPath, fetchRootConfig, updateRootPath } from "../lib/api";
import { useAppStoreApi } from "../store/useAppStore";
import "./RootPickerModal.css";

interface RootPickerModalProps {
  open: boolean;
  onOpenChange(open: boolean): void;
  onRootApplied?(rootPath: string): void;
}

export function RootPickerModal({ open, onOpenChange, onRootApplied }: RootPickerModalProps) {
  const store = useAppStoreApi();
  const [currentRoot, setCurrentRoot] = useState<string | null>(null);
  const [selectedRoot, setSelectedRoot] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const browseButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!open) {
      setCurrentRoot(null);
      setSelectedRoot(null);
      setError(null);
      setIsLoading(false);
      setIsSubmitting(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    void fetchRootConfig()
      .then((response) => {
        const nextRoot = response.roots[0] ?? null;
        setCurrentRoot(nextRoot);
        setSelectedRoot(nextRoot);
        setIsLoading(false);
      })
      .catch((fetchError) => {
        setError(fetchError instanceof Error ? fetchError.message : String(fetchError));
        setIsLoading(false);
      });

    const focusId = window.setTimeout(() => {
      browseButtonRef.current?.focus();
    }, 0);

    return () => {
      window.clearTimeout(focusId);
    };
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onOpenChange(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onOpenChange, open]);

  const close = () => {
    onOpenChange(false);
  };

  const handleBrowse = async () => {
    setError(null);
    setIsLoading(true);
    try {
      const response = await browseRootPath();
      if (response.path) {
        setSelectedRoot(response.path);
      }
    } catch (browseError) {
      setError(browseError instanceof Error ? browseError.message : String(browseError));
    } finally {
      setIsLoading(false);
    }
  };

  const handleApply = async () => {
    if (!selectedRoot) {
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      const response = await updateRootPath(selectedRoot);
      const appliedRoot = response.roots[0] ?? selectedRoot;
      store.getState().applyRootUpdate(appliedRoot, response.tree);
      onRootApplied?.(appliedRoot);
      close();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : String(submitError));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!open) {
    return null;
  }

  return (
    <>
      <div className="root-picker-overlay" onClick={close} />
      <div
        className="root-picker-dialog"
        role="dialog"
        aria-modal="true"
        aria-label="Change markdown root"
        onClick={(event) => {
          event.stopPropagation();
        }}
      >
        <div className="root-picker-header">
          <div className="root-picker-title-wrap">
            <Pencil size={16} className="root-picker-title-icon" />
            <div>
              <div className="root-picker-title">Change markdown root</div>
              <div className="root-picker-subtitle">
                Pick a root folder for Markiniser to index.
              </div>
            </div>
          </div>
          <span className="root-picker-escape">esc</span>
        </div>

        <div className="root-picker-separator" />

        <div className="root-picker-body">
          <div className="root-picker-field">
            <span className="root-picker-label">Current root</span>
            <div className="root-picker-path-card">
              {currentRoot ?? "No root configured"}
            </div>
          </div>

          <div className="root-picker-field">
            <span className="root-picker-label">Selected root</span>
            <div className="root-picker-path-card root-picker-path-card--selected">
              <FolderOpen size={15} className="root-picker-path-icon" />
              <span>{selectedRoot ?? "Browse to choose a folder"}</span>
            </div>
          </div>

          {error ? <div className="root-picker-error">{error}</div> : null}

          <div className="root-picker-actions">
            <button
              ref={browseButtonRef}
              type="button"
              className="root-picker-button root-picker-button--secondary"
              onClick={() => {
                void handleBrowse();
              }}
              disabled={isLoading || isSubmitting}
              aria-label="Browse folder"
            >
              Browse folder
            </button>
            <div className="root-picker-actions-right">
              <button
                type="button"
                className="root-picker-button root-picker-button--ghost"
                onClick={close}
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="root-picker-button root-picker-button--primary"
                onClick={() => {
                  void handleApply();
                }}
                disabled={!selectedRoot || isLoading || isSubmitting}
                aria-label="Apply root"
              >
                {isSubmitting ? "Applying..." : "Apply root"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
