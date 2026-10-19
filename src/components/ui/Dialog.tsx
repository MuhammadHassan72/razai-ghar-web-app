"use client";
import { useEffect, useId, useRef, type ReactNode } from "react";
import { X } from "lucide-react";

export function Dialog({
  open,
  onClose,
  title,
  children,
  drawer = false,
  wide = false,
  fullscreen = false,
  inspection = false,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  drawer?: boolean;
  wide?: boolean;
  fullscreen?: boolean;
  inspection?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null),
    label = useId();
  useEffect(() => {
    const element = ref.current;
    if (!element || !open) return;
    const previous =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    element.showModal();
    element.querySelector<HTMLElement>("[data-dialog-autofocus]")?.focus();
    return () => {
      element.close();
      previous?.focus();
    };
  }, [open]);
  return (
    <dialog
      ref={ref}
      aria-labelledby={label}
      style={inspection ? { width: "min(720px, 100vw)" } : undefined}
      className={`${drawer ? "drawer-dialog" : "modal-dialog"} ${wide ? "modal-wide" : ""} ${fullscreen ? "fullscreen-dialog" : ""}`}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          const r = event.currentTarget.getBoundingClientRect();
          if (
            event.clientX < r.left ||
            event.clientX > r.right ||
            event.clientY < r.top ||
            event.clientY > r.bottom
          )
            onClose();
        }
      }}
    >
      <div className="dialog-header">
        <h2 id={label} className="font-serif text-3xl">
          {title}
        </h2>
        <button
          className="icon-button"
          type="button"
          aria-label={`Close ${title}`}
          onClick={onClose}
        >
          <X size={20} />
        </button>
      </div>
      {open && <div className="dialog-body">{children}</div>}
    </dialog>
  );
}
