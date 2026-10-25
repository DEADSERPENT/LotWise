import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSession } from "../features/auth/AuthProvider";
import { useAllVehicles } from "../features/vehicles/queries";

interface Item { id: string; label: string; hint: string; run: () => void }

/** Ctrl/⌘+K: jump to any page, any vehicle, or a common action without leaving the keyboard. */
export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const { user, signOut } = useSession();
  const { data: vehicles } = useAllVehicles();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const isAdmin = user?.role === "ADMIN";

  const items = useMemo<Item[]>(() => {
    const go = (to: string) => () => navigate(to);
    return [
      { id: "p-inv", label: "Go to Inventory", hint: "Page", run: go("/inventory") },
      { id: "p-lot", label: "Open the Lot map", hint: "Page", run: go("/inventory?view=lot") },
      ...(isAdmin ? [
        { id: "p-man", label: "Go to Manage Vehicles", hint: "Page", run: go("/manage") },
        { id: "p-act", label: "Go to Activity", hint: "Page", run: go("/activity") },
        { id: "a-add", label: "Add a vehicle", hint: "Action", run: go("/manage?new=1") },
      ] : []),
      { id: "a-out", label: "Sign out", hint: "Action", run: signOut },
      ...(vehicles ?? []).map((v) => ({ id: v.id, label: `${v.make} ${v.model}`, hint: `${v.quantity} in stock`, run: go(`/inventory?v=${v.id}`) })),
    ];
  }, [isAdmin, vehicles, navigate, signOut]);

  const shown = items.filter((i) => i.label.toLowerCase().includes(query.trim().toLowerCase())).slice(0, 8);
  useEffect(() => { if (open) input.current?.focus(); }, [open]);
  if (!open) return null;

  const choose = (item?: Item) => { if (item) { onClose(); setQuery(""); item.run(); } };
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") onClose();
    else if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, shown.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
    else if (e.key === "Enter") choose(shown[active]);
  };

  return (
    <div className="fade fixed inset-0 z-[80] grid place-items-start justify-items-center bg-ink/50 p-4 pt-[15vh] backdrop-blur-[2px]" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label="Command palette" onClick={(e) => e.stopPropagation()} onKeyDown={onKey} className="card pop w-full max-w-lg overflow-hidden shadow-2xl">
        <input ref={input} role="combobox" aria-expanded="true" aria-controls="palette-list" aria-label="Search pages, vehicles and actions" placeholder="Search pages, vehicles and actions…"
          value={query} onChange={(e) => { setQuery(e.target.value); setActive(0); }} className="w-full border-b border-line bg-transparent px-4 py-3.5 text-base outline-none placeholder:text-muted" />
        <ul id="palette-list" role="listbox" className="max-h-80 overflow-y-auto p-2">
          {shown.length === 0 && <li className="px-3 py-6 text-center text-muted">Nothing matches “{query}”.</li>}
          {shown.map((item, i) => (
            <li key={item.id} role="option" aria-selected={i === active} onMouseEnter={() => setActive(i)} onClick={() => choose(item)}
              className={`flex cursor-pointer items-center justify-between rounded-lg px-3 py-2.5 ${i === active ? "bg-ink text-white" : ""}`}>
              <span className="font-medium">{item.label}</span><span className={`text-sm ${i === active ? "text-white/70" : "text-muted"}`}>{item.hint}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
