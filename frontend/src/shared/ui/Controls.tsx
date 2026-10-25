import { useState, type MouseEvent, type ReactNode } from "react";
import { btn2 } from "./Field";

export const PageHeader = ({ title, sub, children }: { title: string; sub: string; children?: ReactNode }) => (
  <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
    <div>
      <h1 className="text-3xl font-extrabold tracking-tight">{title}</h1>
      <p className="mt-1 max-w-2xl text-muted">{sub}</p>
    </div>
    {children}
  </div>
);

/** Quantity control: − [n] +, clamped to 1..max. */
export function Stepper({ value, onChange, label, max, disabled }: { value: string; onChange: (v: string) => void; label: string; max?: number; disabled?: boolean }) {
  const [bumps, setBumps] = useState(0);
  const n = Math.max(1, Number(value) || 1);
  const set = (x: number) => { setBumps(bumps + 1); onChange(String(Math.min(Math.max(1, x), max ?? Infinity))); };
  const side = "h-full w-9 text-lg text-muted transition hover:text-fg disabled:opacity-30 focus-visible:outline-2 focus-visible:outline-accent";
  return (
    <div className="inline-flex h-10 items-center rounded-lg border border-line bg-surface">
      <button type="button" className={side} aria-label={`Decrease quantity for ${label}`} disabled={disabled || n <= 1} onClick={() => set(n - 1)}>−</button>
      <span key={bumps} className="bump inline-flex h-full">
        <input type="number" min="1" max={max} step="1" aria-label={`Quantity for ${label}`} value={value} disabled={disabled}
          onChange={(e) => onChange(e.target.value)} className="h-full w-10 bg-transparent text-center font-semibold tabular-nums focus-visible:outline-2 focus-visible:outline-accent" />
      </span>
      <button type="button" className={side} aria-label={`Increase quantity for ${label}`} disabled={disabled || n >= (max ?? Infinity)} onClick={() => set(n + 1)}>+</button>
    </div>
  );
}

/** Previous / Next with an optional summary on the left. */
export function Pager({ page, totalPages, onPage, summary }: { page: number; totalPages: number; onPage: (p: number) => void; summary?: ReactNode }) {
  return (
    <nav aria-label="Pagination" className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-muted">
      <span>{summary}</span>
      <span className="flex items-center gap-2">
        <button className={btn2} disabled={page <= 1} onClick={() => onPage(page - 1)}>Previous</button>
        <span>Page {page} of {Math.max(totalPages, 1)}</span>
        <button className={btn2} disabled={page >= totalPages} onClick={() => onPage(page + 1)}>Next</button>
      </span>
    </nav>
  );
}

/** Moves the cursor-spotlight gradient on `.spot` cards. */
export const spot = (e: MouseEvent<HTMLElement>) => {
  const r = e.currentTarget.getBoundingClientRect();
  e.currentTarget.style.setProperty("--x", `${e.clientX - r.left}px`);
  e.currentTarget.style.setProperty("--y", `${e.clientY - r.top}px`);
};
