import { LOW_STOCK_THRESHOLD } from "../../shared/lib/format";
import { useCountUp } from "../../shared/lib/useCountUp";
import { Alert, spot } from "../../shared/ui";
import { useAllVehicles } from "./queries";

const PALETTE = ["#17140f", "#4d6b5c", "#a16207", "#6b7a8f", "#8a6f4d", "#9a3f5b", "#2f6f8f"];

function Tile({ label, value, tone }: { label: string; value?: number; tone: string }) {
  const shown = useCountUp(value ?? 0);
  return (
    <div onMouseMove={spot} className="card spot lift rise px-5 py-4">
      <dt className="text-sm font-medium text-muted">{label}</dt>
      <dd className={`mt-1 text-3xl font-extrabold tracking-tight tabular-nums ${value ? tone : ""}`}>
        {value === undefined ? <span className="shimmer inline-block h-8 w-14 rounded" /> : shown}
      </dd>
    </div>
  );
}

/** Real totals derived from every active vehicle: never sampled or estimated. */
export function StockSummary() {
  const { data, error } = useAllVehicles();
  if (error) return <Alert>{error.message}</Alert>;
  const units = data?.reduce((n, v) => n + v.quantity, 0);
  const byCategory = Object.entries((data ?? []).reduce<Record<string, number>>((m, v) => ({ ...m, [v.category]: (m[v.category] ?? 0) + v.quantity }), {}))
    .filter(([, u]) => u > 0).sort((a, b) => b[1] - a[1]);

  return (
    <>
      <dl className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Inventory summary" aria-busy={!data}>
        <Tile label="Vehicle listings" value={data?.length} tone="" />
        <Tile label="Units in stock" value={units} tone="" />
        <Tile label={`Low stock (≤ ${LOW_STOCK_THRESHOLD})`} value={data?.filter((v) => v.quantity > 0 && v.quantity <= LOW_STOCK_THRESHOLD).length} tone="text-warn" />
        <Tile label="Sold out" value={data?.filter((v) => v.quantity === 0).length} tone="text-bad" />
      </dl>
      {units ? (
        <div onMouseMove={spot} className="card spot rise mb-6 p-5">
          <div className="flex items-baseline justify-between">
            <h2 className="font-bold">Units by category</h2>
            <span className="text-sm text-muted tabular-nums">{units} units on the lot</span>
          </div>
          <div role="img" aria-label={`Units by category: ${byCategory.map(([c, u]) => `${c} ${u}`).join(", ")}`} className="mt-3 flex h-3.5 gap-0.5 overflow-hidden rounded-full">
            {byCategory.map(([c, u], i) => (
              <span key={c} title={`${c}: ${u}`} className="grow-x h-full" style={{ width: `${(u / units) * 100}%`, background: PALETTE[i % PALETTE.length], animationDelay: `${i * 90}ms` }} />
            ))}
          </div>
          <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm">
            {byCategory.map(([c, u], i) => (
              <li key={c} className="flex items-center gap-2 text-muted">
                <span className="size-2.5 rounded-sm" style={{ background: PALETTE[i % PALETTE.length] }} />{c} <b className="text-fg tabular-nums">{u}</b>
              </li>
            ))}
          </ul>
        </div>
      ) : <div className="mb-6" />}
    </>
  );
}
