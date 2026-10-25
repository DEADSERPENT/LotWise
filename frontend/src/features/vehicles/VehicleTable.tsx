import type { Vehicle } from "../../shared/lib/api";
import { inr } from "../../shared/lib/format";
import { CarIcon, btn2 } from "../../shared/ui";
import { PurchaseControl } from "./PurchaseControl";
import { StockPill } from "./StockPill";

export const SORT_FIELDS = { make: "make", price: "priceInPaise", stock: "quantity" } as const;
export type SortKey = keyof typeof SORT_FIELDS;

interface Props {
  vehicles: Vehicle[];
  mode: "sell" | "manage";
  sort: SortKey;
  dir: "asc" | "desc";
  busy?: boolean;
  onSort: (key: SortKey) => void;
  onOpen: (id: string) => void;
}

/** One semantic table that reflows into stacked cards below `lg` (no duplicate DOM). */
export function VehicleTable({ vehicles, mode, sort, dir, busy, onSort, onOpen }: Props) {
  const header = (key: SortKey, label: string) => (
    <th scope="col" aria-sort={sort === key ? (dir === "asc" ? "ascending" : "descending") : "none"} className="px-5 py-3 text-left font-semibold">
      <button className="inline-flex items-center gap-1 hover:text-fg focus-visible:outline-2 focus-visible:outline-accent" onClick={() => onSort(key)}>
        {label}<span aria-hidden className="w-3">{sort === key ? (dir === "asc" ? "↑" : "↓") : ""}</span>
      </button>
    </th>
  );

  return (
    <div className={`card overflow-hidden transition-opacity ${busy ? "opacity-60" : ""}`}>
      <table className="w-full max-lg:block">
        <caption className="sr-only">Vehicles</caption>
        <thead className="border-b border-line bg-bg/70 text-sm text-muted max-lg:sr-only">
          <tr>
            {header("make", "Vehicle")}{header("price", "Price")}{header("stock", "Stock")}
            <th scope="col" className="px-5 py-3 text-right font-semibold">{mode === "sell" ? "Purchase" : "Actions"}</th>
          </tr>
        </thead>
        <tbody className="max-lg:block">
          {vehicles.map((v, i) => (
            <tr key={v.id} style={{ animationDelay: `${Math.min(i, 10) * 45}ms` }}
              className="row rise border-b border-line last:border-0 hover:bg-bg/50 max-lg:grid max-lg:grid-cols-2 max-lg:items-center max-lg:gap-x-3 max-lg:gap-y-3 max-lg:p-4">
              <th scope="row" className="px-5 py-4 text-left max-lg:col-span-2 max-lg:p-0">
                <span className="flex items-center gap-4">
                  <span className="grid h-14 w-24 shrink-0 place-items-center rounded-xl bg-ink/5 text-ink"><CarIcon category={v.category} className="w-[4.75rem]" /></span>
                  <span>
                    <button className="block text-left text-base font-bold hover:underline focus-visible:outline-2 focus-visible:outline-accent" onClick={() => onOpen(v.id)}>{v.make} {v.model}</button>
                    <span className="text-sm font-normal text-muted">{v.category}</span>
                  </span>
                </span>
              </th>
              <td className="px-5 py-4 font-bold tabular-nums max-lg:p-0">{inr(v.priceInPaise)}</td>
              <td className="px-5 py-4 max-lg:p-0 max-lg:text-right"><StockPill q={v.quantity} /></td>
              <td className="px-5 py-4 text-right max-lg:col-span-2 max-lg:p-0 max-lg:text-left">
                {mode === "sell"
                  ? <PurchaseControl vehicle={v} />
                  : <button className={btn2} onClick={() => onOpen(v.id)}>Manage{" "}<span className="sr-only">{`${v.make} ${v.model}`}</span></button>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
