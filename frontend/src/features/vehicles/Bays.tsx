import type { CSSProperties } from "react";
import type { Vehicle } from "../../shared/lib/api";
import { CarIcon } from "../../shared/ui";
import { stockTone } from "./StockPill";

export const TONE = { ok: "text-ok", warn: "text-warn", bad: "text-bad" } as const;
const BAYS = 10; // one bay per unit, up to ten; the rest collapse into "+N"

/**
 * A row of parking bays: a parked car for every unit in stock, an empty bay for every unit already sold.
 * The bays share the available width, so all ten always fit — in a phone, a modal or a wide card. Decorative.
 */
export function Bays({ vehicle }: { vehicle: Vehicle }) {
  const tone = TONE[stockTone(vehicle.quantity)];
  return (
    <span aria-hidden className="flex w-full items-center gap-0.5">
      {Array.from({ length: BAYS }, (_, i) => (
        <span key={i} style={{ "--i": i } as CSSProperties} className="grid h-10 min-w-0 flex-1 place-items-center border-x-2 border-dashed border-line">
          {i < vehicle.quantity && <CarIcon category={vehicle.category} className={`bay-car w-[78%] max-w-11 ${tone}`} />}
        </span>
      ))}
      {vehicle.quantity > BAYS && <span className="shrink-0 pl-2 text-sm font-bold tabular-nums">+{vehicle.quantity - BAYS}</span>}
    </span>
  );
}
