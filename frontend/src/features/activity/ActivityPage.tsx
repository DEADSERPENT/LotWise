import { useUrlState } from "../../shared/lib/useUrlState";
import { Alert, PageHeader } from "../../shared/ui";
import { useAllVehicles } from "../vehicles/queries";
import { History, MOVEMENT_LABELS } from "./History";

/** Audit ledger: pick a vehicle and, optionally, an action type. Both choices live in the URL. */
export default function ActivityPage() {
  const { get, update } = useUrlState();
  const { data, error } = useAllVehicles();
  const vehicle = data?.find((v) => v.id === get("vehicle")) ?? data?.[0];

  return (
    <section>
      <PageHeader title="Activity" sub="Every initial stock, purchase and restock: who did it, when, and the stock before and after. Records are never edited or deleted." />
      {error && <Alert>{error.message}</Alert>}
      {!data && !error && <div aria-busy="true" aria-label="Loading vehicles" className="card shimmer h-40" />}
      {data && !vehicle && <div className="card p-12 text-center"><p className="text-xl font-extrabold">No vehicles yet.</p><p className="mt-1 text-muted">Add a vehicle and its stock history will appear here.</p></div>}
      {vehicle && (
        <>
          <div className="mb-4 grid gap-4 sm:grid-cols-2 lg:max-w-2xl">
            <label className="label">
              Vehicle
              <select className="input" value={vehicle.id} onChange={(e) => update({ vehicle: e.target.value })}>
                {data?.map((v) => <option key={v.id} value={v.id}>{v.make} {v.model} ({v.quantity} in stock)</option>)}
              </select>
            </label>
            <label className="label">
              Action
              <select className="input" value={get("type")} onChange={(e) => update({ type: e.target.value })}>
                <option value="">All actions</option>
                {Object.entries(MOVEMENT_LABELS).map(([k, label]) => <option key={k} value={k}>{label}</option>)}
              </select>
            </label>
          </div>
          <div className="card p-5"><History key={vehicle.id} vehicle={vehicle} type={get("type")} /></div>
        </>
      )}
    </section>
  );
}
