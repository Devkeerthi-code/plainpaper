"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";

interface Props {
  open: boolean;
  title: string;
  children: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  pending?: boolean;
  danger?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

/** Native <dialog>: focus trap, Esc to close and a backdrop for free. */
export function ConfirmDialog({ open, title, children, confirmLabel, cancelLabel = "Keep it", pending, danger = true, onConfirm, onClose }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className="dialog"
      aria-labelledby={titleId}
      onClose={onClose}
      onCancel={(e) => {
        if (pending) e.preventDefault();
      }}
    >
      <form
        method="dialog"
        onSubmit={(e) => {
          e.preventDefault();
          onConfirm();
        }}
      >
        <h2 id={titleId} className="h3">
          {title}
        </h2>
        {children}
        <div className="dialog-actions">
          <button type="button" className="btn btn-quiet" onClick={onClose} disabled={pending} autoFocus>
            {cancelLabel}
          </button>
          <button type="submit" className={`btn ${danger ? "btn-danger" : "btn-primary"}`} disabled={pending}>
            {pending && <span className="spin" aria-hidden="true" />}
            {confirmLabel}
          </button>
        </div>
      </form>
    </dialog>
  );
}
