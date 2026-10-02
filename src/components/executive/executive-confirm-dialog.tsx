"use client";

import {
  useEffect,
  useId,
  useRef,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

import {
  EXECUTIVE_DIALOG_ACTIONS,
  EXECUTIVE_DIALOG_BODY,
  EXECUTIVE_DIALOG_CANCEL,
  EXECUTIVE_DIALOG_CONFIRM,
  EXECUTIVE_DIALOG_DESTRUCTIVE,
  EXECUTIVE_DIALOG_OVERLAY,
  EXECUTIVE_DIALOG_SURFACE,
  EXECUTIVE_DIALOG_TITLE,
} from "@/lib/design-system/executive-contract";

type ExecutiveConfirmDialogProps = {
  open: boolean;
  title: string;
  description: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  busy?: boolean;
  tone?: "confirm" | "destructive";
  onConfirm: () => void;
  onClose: () => void;
};

const FOCUSABLE_SELECTOR =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function ExecutiveConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel = "Cancel",
  busy = false,
  tone = "confirm",
  onConfirm,
  onClose,
}: ExecutiveConfirmDialogProps) {
  const titleId = useId();
  const descriptionId = useId();
  const panelRef = useRef<HTMLDivElement | null>(null);
  const cancelRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    cancelRef.current?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !busy) {
        event.preventDefault();
        onClose();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [busy, onClose, open]);

  function handlePanelKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    if (event.key !== "Tab" || !panelRef.current) return;

    const focusable = [
      ...panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
    ].filter((node) => !node.hasAttribute("disabled"));

    if (focusable.length === 0) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = document.activeElement as HTMLElement | null;

    if (event.shiftKey && active === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  }

  if (!open || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div
      className={EXECUTIVE_DIALOG_OVERLAY}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy) {
          onClose();
        }
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        onKeyDown={handlePanelKeyDown}
        className={EXECUTIVE_DIALOG_SURFACE}
      >
        <h2 id={titleId} className={EXECUTIVE_DIALOG_TITLE}>
          {title}
        </h2>
        <div id={descriptionId} className={EXECUTIVE_DIALOG_BODY}>
          {description}
        </div>
        <div className={EXECUTIVE_DIALOG_ACTIONS}>
          <button
            ref={cancelRef}
            type="button"
            onClick={onClose}
            disabled={busy}
            className={EXECUTIVE_DIALOG_CANCEL}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className={
              tone === "destructive"
                ? EXECUTIVE_DIALOG_DESTRUCTIVE
                : EXECUTIVE_DIALOG_CONFIRM
            }
          >
            {busy ? "Awarding..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
