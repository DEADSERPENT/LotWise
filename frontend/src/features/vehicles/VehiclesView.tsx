import { toPaise } from "../../shared/lib/format";
import { useUrlState } from "../../shared/lib/useUrlState";
import { Alert, Pager, btn2 } from "../../shared/ui";
import { useSession } from "../auth/AuthProvider";
import { Filters } from "./Filters";
import { LotMap } from "./LotMap";
import { useAllVehicles, useVehicleList } from "./queries";
import { SORT_FIELDS, VehicleTable, type SortKey } from "./VehicleTable";
import { VehicleSheet } from "./VehicleSheet";

const PAGE_SIZE = { table: 15, lot: 24 };

/** The searchable vehicle list shared by Inventory (sell) and Manage (admin). All view state lives in the URL. */
export function VehiclesView({ mode }: { mode: "sell" | "manage" }) {
  const { get, update, reset } = useUrlState();
  const isAdmin = useSession().user?.role === "ADMIN";

  const sort: SortKey = get("sort") in SORT_FIELDS ? (get("sort") as SortKey) : "make";
  const dir = get("dir") === "desc" ? "desc" : "asc";
  const page = Math.max(1, Math.floor(Number(get("page"))) || 1);
  const view = mode === "sell" && get("view") === "lot" ? "lot" : "table";

  const qs = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE[view]), sortBy: SORT_FIELDS[sort], sortOrder: dir });
  for (const k of ["make", "model", "category"] as const) if (get(k)) qs.set(k, get(k));
  if (get("min")) qs.set("minPriceInPaise", String(toPaise(get("min"))));
  if (get("max")) qs.set("maxPriceInPaise", String(toPaise(get("max"))));

  const list = useVehicleList(qs.toString());
  const sheetVehicle = useAllVehicles().data?.find((v) => v.id === get("v"));
  const { data, error, isPending, isPlaceholderData } = list;
  const onSort = (key: SortKey) => update({ sort: key, dir: sort === key && dir === "asc" ? "desc" : "asc" });

  return (
    <>
      <Filters get={get} onApply={update} onReset={reset} />

      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <label className={`label ${view === "table" ? "lg:invisible" : ""}`}>
          Sort by
          <select className="input !w-auto" value={`${sort}:${dir}`} onChange={(e) => { const [s, d] = e.target.value.split(":"); update({ sort: s ?? "make", dir: d ?? "asc" }); }}>
            <option value="make:asc">Name (A–Z)</option>
            <option value="price:asc">Price (low to high)</option>
            <option value="price:desc">Price (high to low)</option>
            <option value="stock:asc">Stock (low to high)</option>
            <option value="stock:desc">Stock (high to low)</option>
          </select>
        </label>
        {mode === "sell" && (
          <div role="group" aria-label="View" className="inline-flex rounded-lg border border-line bg-surface p-0.5 text-sm font-semibold">
            {(["table", "lot"] as const).map((v) => (
              <button key={v} aria-pressed={view === v} onClick={() => update({ view: v === "lot" ? "lot" : "" })}
                className={`rounded-md px-3.5 py-1.5 transition-colors focus-visible:outline-2 focus-visible:outline-accent ${view === v ? "bg-ink text-white" : "text-muted hover:text-fg"}`}>
                {v === "lot" ? "Lot map" : "Table"}
              </button>
            ))}
          </div>
        )}
      </div>

      {error && <div className="space-y-2"><Alert>{error.message}</Alert><button className={btn2} onClick={() => list.refetch()}>Retry</button></div>}
      {isPending && <div aria-busy="true" aria-label="Loading vehicles" className="card space-y-px overflow-hidden">{[0, 1, 2, 3, 4].map((i) => <div key={i} className="shimmer h-[72px]" />)}</div>}
      {data?.data.length === 0 && (
        <div className="card p-12 text-center">
          <p className="text-xl font-extrabold">No vehicles match.</p>
          <p className="mt-1 text-muted">Try fewer filters, or clear them to see the whole catalogue.</p>
          <button className={`${btn2} mt-5`} onClick={reset}>Reset filters</button>
        </div>
      )}

      {data && data.data.length > 0 && (view === "lot"
        ? <LotMap vehicles={data.data} onOpen={(id) => update({ v: id })} />
        : <VehicleTable vehicles={data.data} mode={mode} sort={sort} dir={dir} busy={isPlaceholderData} onSort={onSort} onOpen={(id) => update({ v: id })} />)}

      {data && data.pagination.total > 0 && (
        <Pager page={data.pagination.page} totalPages={data.pagination.totalPages} onPage={(p) => update({ page: String(p) })}
          summary={`Showing ${(data.pagination.page - 1) * PAGE_SIZE[view] + 1}–${Math.min(data.pagination.page * PAGE_SIZE[view], data.pagination.total)} of ${data.pagination.total}`} />
      )}

      {sheetVehicle && <VehicleSheet vehicle={sheetVehicle} isAdmin={isAdmin} onClose={() => update({ v: "" })} />}
    </>
  );
}
