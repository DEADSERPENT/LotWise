import { useState } from "react";
import type { Vehicle } from "../../shared/lib/api";
import { toPaise } from "../../shared/lib/format";
import { Alert, Field, FormActions, btn, useToast } from "../../shared/ui";
import { useRestock, useSaveVehicle } from "./queries";

/** Create (no vehicle) or edit (no quantity field: stock changes only through the ledger). */
export function VehicleForm({ vehicle, onSaved }: { vehicle?: Vehicle; onSaved: () => void }) {
  const [f, setF] = useState({
    make: vehicle?.make ?? "", model: vehicle?.model ?? "", category: vehicle?.category ?? "",
    price: vehicle ? String(vehicle.priceInPaise / 100) : "", quantity: "0",
  });
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });
  const save = useSaveVehicle();
  const toast = useToast();

  const submit = () => {
    const body = { make: f.make, model: f.model, category: f.category, priceInPaise: toPaise(f.price) };
    save.mutate({ id: vehicle?.id, body: vehicle ? body : { ...body, quantity: Number(f.quantity) } }, {
      onSuccess: () => { toast(vehicle ? "Vehicle updated." : "Vehicle added."); onSaved(); },
    });
  };

  return (
    <form onSubmit={(e) => { e.preventDefault(); submit(); }} className="grid content-start gap-4 sm:grid-cols-2" aria-label={vehicle ? "Edit vehicle" : "Add vehicle"}>
      <Field label="Make" placeholder="Brand, e.g. Toyota" required value={f.make} onChange={set("make")} />
      <Field label="Model" placeholder="e.g. Corolla" required value={f.model} onChange={set("model")} />
      <Field label="Category" placeholder="e.g. SUV, Sedan" required value={f.category} onChange={set("category")} />
      <Field label="Price (₹)" type="number" required min="0.01" step="0.01" value={f.price} onChange={set("price")} />
      {!vehicle && <Field label="Initial quantity" type="number" required min="0" step="1" value={f.quantity} onChange={set("quantity")} />}
      {vehicle && <p className="text-sm text-muted sm:col-span-2">Stock changes only through Restock or Purchase, so every change is on the ledger.</p>}
      <div className="sm:col-span-2"><Alert>{save.error?.message}</Alert></div>
      <FormActions><button className={btn} disabled={save.isPending} aria-busy={save.isPending}>{vehicle ? "Save changes" : "Add vehicle"}</button></FormActions>
    </form>
  );
}

export function RestockForm({ vehicle, onSaved }: { vehicle: Vehicle; onSaved: () => void }) {
  const [qty, setQty] = useState("1");
  const [reason, setReason] = useState("");
  const restock = useRestock();
  const toast = useToast();

  const submit = () =>
    restock.mutate({ id: vehicle.id, quantity: Number(qty), reason }, {
      onSuccess: () => { toast(`Restocked ${vehicle.make} ${vehicle.model} by ${qty}.`); onSaved(); },
    });

  return (
    <form onSubmit={(e) => { e.preventDefault(); submit(); }} className="grid content-start gap-4" aria-label="Restock vehicle">
      <div>
        <Field label="Quantity to add" type="number" required min="1" step="1" value={qty} onChange={(e) => setQty(e.target.value)} />
        <div className="mt-2 flex gap-2">
          {[1, 5, 10, 25].map((n) => <button key={n} type="button" className="btn alt !h-8 !px-3" onClick={() => setQty(String(n))}>+{n}</button>)}
        </div>
      </div>
      <Field label="Reason (optional)" maxLength={300} placeholder="e.g. New shipment received" value={reason} onChange={(e) => setReason(e.target.value)} />
      <p className="rounded-lg bg-bg p-3 text-sm text-muted">
        {vehicle.quantity} now → <b className="text-fg">{vehicle.quantity + (Number(qty) || 0)}</b> after (preview; the server decides).
      </p>
      <Alert>{restock.error?.message}</Alert>
      <FormActions><button className={btn} disabled={restock.isPending} aria-busy={restock.isPending}>Restock</button></FormActions>
    </form>
  );
}
