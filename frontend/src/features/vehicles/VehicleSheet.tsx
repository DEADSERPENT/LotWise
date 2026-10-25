import { useState, type CSSProperties } from "react";
import type { Vehicle } from "../../shared/lib/api";
import { inr } from "../../shared/lib/format";
import { CarIcon, ConfirmDialog, Modal, useToast } from "../../shared/ui";
import { History } from "../activity/History";
import { Bays } from "./Bays";
import { RestockForm, VehicleForm } from "./forms";
import { PurchaseControl } from "./PurchaseControl";
import { useDeleteVehicle } from "./queries";
import { StockPill } from "./StockPill";

const TABS = ["overview", "details", "restock", "history"] as const;
type Tab = (typeof TABS)[number];

/**
 * One centred panel for one vehicle, opened from the URL (`?v=<id>`). Left: who it is and how much is on the lot.
 * Right: everyone can purchase; admins also get the edit, restock and history tabs and the delete action.
 * The API enforces the same rules regardless of what the UI shows.
 */
export function VehicleSheet({ vehicle, isAdmin, onClose }: { vehicle: Vehicle; isAdmin: boolean; onClose: () => void }) {
  const [tab, setTab] = useState<Tab>("overview");
  const [confirming, setConfirming] = useState(false);
  const remove = useDeleteVehicle();
  const toast = useToast();
  const name = `${vehicle.make} ${vehicle.model}`;

  return (
    <Modal title={name} onClose={onClose}>
      <div className="grid gap-6 md:grid-cols-[17rem_minmax(0,1fr)]">
        <aside className="h-fit space-y-4 rounded-xl bg-bg p-5">
          <div className="grid place-items-center rounded-lg bg-ink/5 py-6 text-ink"><CarIcon category={vehicle.category} className="w-40" /></div>
          <div>
            <p className="text-sm text-muted">{vehicle.category}</p>
            <p className="text-3xl font-extrabold tracking-tight tabular-nums">{inr(vehicle.priceInPaise)}</p>
          </div>
          <StockPill q={vehicle.quantity} />
        </aside>

        <div className="min-w-0">
          {isAdmin && (
            <div role="tablist" aria-label="Vehicle sections" style={{ "--i": TABS.indexOf(tab) } as CSSProperties} className="relative mb-5 flex border-b border-line">
              <span aria-hidden className="slider absolute bottom-0 left-0 h-0.5 w-1/4 translate-x-[calc(var(--i)*100%)] bg-accent" />
              {TABS.map((t) => (
                <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)}
                  className={`flex-1 py-2.5 font-semibold capitalize transition-colors focus-visible:outline-2 focus-visible:outline-accent ${tab === t ? "text-fg" : "text-muted hover:text-fg"}`}>{t}</button>
              ))}
            </div>
          )}

          <div key={tab} className="fade flex flex-col gap-5">
            {tab === "overview" && (
              <>
                <div>
                  <h3 className="mb-2 text-sm font-bold tracking-wide text-muted uppercase">On the lot</h3>
                  <Bays vehicle={vehicle} />
                </div>
                <div>
                  <h3 className="mb-2 text-sm font-bold tracking-wide text-muted uppercase">Record a sale</h3>
                  <PurchaseControl vehicle={vehicle} />
                </div>
              </>
            )}
            {tab === "details" && <VehicleForm vehicle={vehicle} onSaved={onClose} />}
            {tab === "restock" && <RestockForm vehicle={vehicle} onSaved={onClose} />}
            {tab === "history" && <History vehicle={vehicle} />}
          </div>

          {isAdmin && (
            <div className="mt-8 border-t border-line pt-5">
              <p className="mb-2 text-sm text-muted">Deleting removes this vehicle from the catalogue. Its stock history is kept for the audit trail.</p>
              <button className="btn alt !text-danger" onClick={() => setConfirming(true)}>Delete vehicle…</button>
            </div>
          )}
        </div>
      </div>

      {confirming && (
        <ConfirmDialog title={`Delete ${name}?`} confirmLabel="Delete" pending={remove.isPending} error={remove.error?.message}
          onCancel={() => setConfirming(false)}
          onConfirm={() => remove.mutate(vehicle.id, { onSuccess: () => { toast(`Deleted ${name}.`); onClose(); } })}>
          <p>It will be removed from the catalogue and can no longer be purchased or restocked.</p>
          <p>Its movement history is kept and stays visible on the Activity page.</p>
        </ConfirmDialog>
      )}
    </Modal>
  );
}
