import { useSearchParams } from "react-router-dom";

// Changing these keys keeps the current page; changing any other key (a filter or sort) returns to page 1.
const KEEP_PAGE = new Set(["page", "v", "new", "view"]);

/** The URL query string as view state, so every view is shareable and back/forward just work. */
export function useUrlState() {
  const [params, setParams] = useSearchParams();
  const get = (key: string) => params.get(key) ?? "";
  const update = (changes: Record<string, string>) => {
    const next = new URLSearchParams(params);
    if (Object.keys(changes).some((k) => !KEEP_PAGE.has(k))) next.delete("page");
    for (const [k, v] of Object.entries(changes)) { if (v) next.set(k, v); else next.delete(k); }
    setParams(next);
  };
  return { get, update, reset: () => setParams({}) };
}
