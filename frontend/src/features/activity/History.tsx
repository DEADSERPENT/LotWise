import { useState } from "react";
import type { Movement, Vehicle } from "../../shared/lib/api";
import { Alert, Pager, btn2 } from "../../shared/ui";
import { useMovements } from "../vehicles/queries";

export const MOVEMENT_LABELS: Record<string, string> = { PURCHASE: "Purchase", RESTOCK: "Restock", INITIAL_STOCK: "Initial stock" };

const cell = "px-4 py-3 align-top";
const tone = (delta: number) => (delta < 0 ? "text-bad" : delta > 0 ? "text-ok" : "");

/** One ledger row. Two-line cells keep it readable in a narrow panel with no horizontal scrolling. */
function Row({ m, index }: { m: Movement; index: number }) {
  const when = new Date(m.createdAt);
  return (
    <tr style={{ animationDelay: `${index * 40}ms` }} className="rise border-t border-line">
      <td className={`${cell} whitespace-nowrap`}>
        <span className="block font-medium">{when.toLocaleDateString()}</span>
        <span className="text-muted">{when.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
      </td>
      <td className={cell}>
        <span className="block font-medium">{MOVEMENT_LABELS[m.type] ?? m.type}</span>
        <span className="block text-muted [overflow-wrap:anywhere]">by {m.actorEmail}</span>
        {m.reason && <span className="mt-1 block [overflow-wrap:anywhere]">“{m.reason}”</span>}
      </td>
      <td className={`${cell} whitespace-nowrap`}>
        <span className={`block font-bold tabular-nums ${tone(m.quantityDelta)}`}>{m.quantityDelta > 0 ? "+" : ""}{m.quantityDelta}</span>
        <span className="text-muted tabular-nums">{m.quantityBefore} → {m.quantityAfter}</span>
      </td>
    </tr>
  );
}

/** Append-only ledger for one vehicle, oldest first, with loading, empty and error states. */
export function History({ vehicle, type = "" }: { vehicle: Vehicle; type?: string }) {
  const [page, setPage] = useState(1);
  const { data, error, isPending, refetch } = useMovements(vehicle.id, page);

  if (isPending) return <div aria-busy="true" aria-label="Loading history" className="shimmer h-32 rounded-xl" />;
  if (error) return <div className="space-y-2"><Alert>{error.message}</Alert><button className={btn2} onClick={() => refetch()}>Retry</button></div>;

  const rows = type ? data.data.filter((m) => m.type === type) : data.data;
  return (
    <div>
      <div className="overflow-hidden rounded-xl border border-line">
        <table className="w-full text-left text-sm">
          <caption className="sr-only">Movement history for {vehicle.make} {vehicle.model}</caption>
          <thead className="bg-bg text-muted">
            <tr>{["When", "Action", "Change"].map((h) => <th key={h} className={`${cell} font-semibold`}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={3} className="px-4 py-10 text-center text-muted">No movements{type ? " of this type on this page" : " recorded yet"}.</td></tr>}
            {rows.map((m, i) => <Row key={m.id} m={m} index={i} />)}
          </tbody>
        </table>
      </div>
      <Pager page={data.pagination.page} totalPages={data.pagination.totalPages} onPage={setPage} />
    </div>
  );
}
