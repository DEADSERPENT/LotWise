import type { Vehicle } from "../../shared/lib/api";
import { inr, stockStatus } from "../../shared/lib/format";
import { spot } from "../../shared/ui";
import { Bays, TONE } from "./Bays";
import { stockTone } from "./StockPill";

/**
 * The lot, seen from above: one zone per category, one bay row per vehicle, one parked car per unit in stock.
 * Purely a view of real quantities; the text status is always present.
 */
export function LotMap({ vehicles, onOpen }: { vehicles: Vehicle[]; onOpen: (id: string) => void }) {
  const zones = Object.entries(vehicles.reduce<Record<string, Vehicle[]>>((acc, v) => ({ ...acc, [v.category]: [...(acc[v.category] ?? []), v] }), {}));

  return (
    <div className="space-y-8">
      {zones.map(([category, items]) => (
        <section key={category} aria-label={`${category} zone`}>
          <h3 className="mb-3 flex items-baseline gap-3 text-sm font-bold tracking-wide text-muted uppercase">
            {category}<span className="font-medium tracking-normal normal-case tabular-nums">{items.reduce((n, v) => n + v.quantity, 0)} units</span>
          </h3>
          <ul className="grid grid-cols-[minmax(0,1fr)] gap-3 xl:grid-cols-[repeat(2,minmax(0,1fr))]">
            {items.map((v) => (
              <li key={v.id} className="min-w-0">
                <button onClick={() => onOpen(v.id)} onMouseMove={spot} aria-label={`${v.make} ${v.model}, ${v.quantity} available, ${stockStatus(v.quantity)}`}
                  className="card spot lift rise w-full p-4 text-left focus-visible:outline-2 focus-visible:outline-accent">
                  <span className="flex items-baseline justify-between gap-3">
                    <span className="font-bold">{v.make} {v.model}</span>
                    <span className="text-sm font-semibold tabular-nums">{inr(v.priceInPaise)}</span>
                  </span>
                  <span className="mt-3 block"><Bays vehicle={v} /></span>
                  <span className={`mt-2 flex items-center justify-between text-sm font-semibold ${TONE[stockTone(v.quantity)]}`}>
                    {stockStatus(v.quantity)}<span className="font-normal text-muted tabular-nums">{v.quantity} on the lot</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
