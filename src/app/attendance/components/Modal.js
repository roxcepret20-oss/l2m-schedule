"use client";

import { useEffect } from "react";
import ui from "./attendance-ui.module.css";

export function Modal({ title, onClose, children, footer, wide = false }) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className={ui.modalOverlay} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`${ui.modal} ${wide ? ui.modalWide : ""}`} role="dialog" aria-modal="true" aria-label={title}>
        <div className={ui.modalHeader}>
          <h2 className={ui.modalTitle}>{title}</h2>
          <button type="button" className={ui.modalClose} onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>
        <div className={ui.modalBody}>{children}</div>
        {footer && <div className={ui.modalFooter}>{footer}</div>}
      </div>
    </div>
  );
}

export function ConfirmModal({ title, message, confirmLabel = "Confirm", danger = false, busy = false, onConfirm, onClose }) {
  return (
    <Modal
      title={title}
      onClose={busy ? () => {} : onClose}
      footer={
        <>
          <button type="button" className={ui.btnGhost} onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button type="button" className={danger ? ui.btnDanger : ui.btnPrimary} onClick={onConfirm} disabled={busy}>
            {busy ? "Working…" : confirmLabel}
          </button>
        </>
      }
    >
      <p className={ui.muted} style={{ marginBottom: 12 }}>{message}</p>
    </Modal>
  );
}
