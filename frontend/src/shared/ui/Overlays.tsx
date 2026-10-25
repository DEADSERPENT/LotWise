import { useEffect, useRef, type ReactNode } from "react";
import { Alert } from "./Field";

/**
 * A floating panel centred over the page (full-screen on phones). Escape or a click outside closes it; focus starts inside.
 * `narrow` suits short forms; the default width suits a two-column detail view.
 */
export function Modal({ title, onClose, narrow, children }: { title: string; onClose: () => void; narrow?: boolean; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.focus();
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden"; // the page behind must not scroll while the panel is open
    return () => { document.body.style.overflow = previous; };
  }, []);
  return (
    <div className="fade fixed inset-0 z-50 flex items-center justify-center bg-ink/55 backdrop-blur-[3px] md:p-6" onClick={onClose}>
      <div ref={ref} role="dialog" aria-modal="true" aria-label={title} tabIndex={-1}
        onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.key === "Escape" && onClose()}
        className={`pop flex h-full w-full flex-col overflow-hidden bg-surface outline-none md:h-auto md:max-h-[90vh] md:rounded-2xl md:shadow-2xl ${narrow ? "md:max-w-xl" : "md:max-w-4xl"}`}>
        <header className="flex items-start justify-between gap-4 border-b border-line px-6 py-4">
          <h2 className="text-2xl font-extrabold tracking-tight">{title}</h2>
          <button className="btn alt" onClick={onClose}>Close</button>
        </header>
        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

/** Sticky bottom bar so a form's primary action stays reachable in a long, scrolling panel. */
export const FormActions = ({ children }: { children: ReactNode }) => (
  <div className="sticky bottom-0 mt-2 flex items-center gap-3 border-t border-line bg-surface py-4 sm:col-span-2">{children}</div>
);

/** Focused confirmation for destructive actions. Escape cancels; focus starts inside. */
export function ConfirmDialog(p: {
  title: string; confirmLabel: string; pending: boolean; error?: string | null;
  onConfirm: () => void; onCancel: () => void; children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => ref.current?.focus(), []);
  return (
    <div className="fade fixed inset-0 z-[60] grid place-items-center bg-ink/60 p-4" onClick={p.onCancel}>
      <div ref={ref} role="alertdialog" aria-modal="true" aria-label={p.title} tabIndex={-1}
        onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.key === "Escape" && p.onCancel()}
        className="card pop w-full max-w-md space-y-4 p-6 shadow-2xl outline-none">
        <h2 className="text-xl font-extrabold tracking-tight">{p.title}</h2>
        <div className="space-y-2 text-muted">{p.children}</div>
        <Alert>{p.error}</Alert>
        <div className="flex justify-end gap-2">
          <button className="btn alt" onClick={p.onCancel}>Cancel</button>
          <button className="btn danger" disabled={p.pending} aria-busy={p.pending} onClick={p.onConfirm}>{p.confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}
