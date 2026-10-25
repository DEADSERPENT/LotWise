import { Field, btn, btn2 } from "../../shared/ui";

export const FILTERS = ["make", "model", "category", "min", "max"] as const;
const CATEGORIES = ["SEDAN", "SUV", "HATCHBACK", "ELECTRIC", "TRUCK", "COUPE"];

interface Props {
  get: (key: string) => string;
  onApply: (values: Record<string, string>) => void;
  onReset: () => void;
}

/** Uncontrolled form seeded from the URL; it remounts whenever the applied filters change (back/forward, reset). */
export function Filters({ get, onApply, onReset }: Props) {
  const active = FILTERS.filter((k) => get(k)).length;
  return (
    <details open={typeof window !== "undefined" && window.innerWidth >= 768} className="card mb-4">
      <summary className="cursor-pointer px-5 py-3.5 font-semibold">
        Filters{active > 0 && <span className="ml-2 rounded-full bg-ink px-2 py-0.5 text-xs text-white">{active} active</span>}
      </summary>
      <form key={FILTERS.map(get).join("|")} role="search" className="grid gap-x-4 gap-y-3 border-t border-line p-5 sm:grid-cols-3 lg:grid-cols-[repeat(5,1fr)_auto]"
        onSubmit={(e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          onApply(Object.fromEntries(FILTERS.map((k) => [k, String(f.get(k) ?? "").trim()])));
        }}>
        <Field label="Make" name="make" placeholder="Brand, e.g. Toyota" defaultValue={get("make")} />
        <Field label="Model" name="model" defaultValue={get("model")} />
        <label className="label">
          Category
          <select name="category" className="input" defaultValue={get("category")}>
            <option value="">All</option>
            {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </label>
        <Field label="Min price (₹)" name="min" type="number" min="0" defaultValue={get("min")} />
        <Field label="Max price (₹)" name="max" type="number" min="0" defaultValue={get("max")} />
        <div className="flex items-end gap-2">
          <button className={btn}>Apply</button>
          <button type="button" className={btn2} onClick={onReset}>Reset</button>
        </div>
      </form>
    </details>
  );
}
