import { createContext, useCallback, useContext, useState, type ReactNode } from "react";

type Push = (message: string, ok?: boolean) => void;
const ToastContext = createContext<Push>(() => undefined);

/** `const toast = useToast(); toast("Saved.")` or `toast(error.message, false)`. */
export const useToast = () => useContext(ToastContext);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<{ id: number; message: string; ok: boolean }[]>([]);
  const push = useCallback<Push>((message, ok = true) => {
    const id = Date.now() + Math.random();
    setItems((list) => [...list, { id, message, ok }]);
    setTimeout(() => setItems((list) => list.filter((t) => t.id !== id)), 5000);
  }, []);

  return (
    <ToastContext.Provider value={push}>
      {children}
      <div role="status" aria-live="polite" className="pointer-events-none fixed right-4 bottom-20 z-[70] flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-2 md:bottom-6">
        {items.map((t) => (
          <p key={t.id} className={`rise pointer-events-auto rounded-xl border bg-surface p-3.5 text-sm shadow-lg ${t.ok ? "border-ok/40" : "border-danger/40"}`}>
            <b className={t.ok ? "text-ok" : "text-danger"}>{t.ok ? "Done" : "Failed"}</b> — {t.message}
          </p>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
