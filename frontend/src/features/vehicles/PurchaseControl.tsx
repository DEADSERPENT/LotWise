import { useState } from "react";
import type { Vehicle } from "../../shared/lib/api";
import { Stepper, btn, useToast } from "../../shared/ui";
import { usePurchase } from "./queries";

/** Quantity + Purchase. More than one unit asks for a second click; the stock change itself is optimistic. */
export function PurchaseControl({ vehicle }: { vehicle: Vehicle }) {
  const [qty, setQty] = useState("1");
  const [confirming, setConfirming] = useState(false);
  const toast = useToast();
  const purchase = usePurchase();
  const name = `${vehicle.make} ${vehicle.model}`;
  const soldOut = vehicle.quantity === 0;

  const buy = () =>
    purchase.mutate({ id: vehicle.id, quantity: Number(qty) }, {
      onSuccess: () => { toast(`Purchased ${qty} × ${name}.`); setConfirming(false); },
      onError: (e) => { toast(e.message, false); setConfirming(false); },
    });

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); if (Number(qty) > 1 && !confirming) setConfirming(true); else buy(); }}
      className="flex items-center gap-2 lg:justify-end"
    >
      {!soldOut && <Stepper label={name} value={qty} max={vehicle.quantity} onChange={(v) => { setQty(v); setConfirming(false); }} />}
      <button className={btn} disabled={soldOut || purchase.isPending} aria-busy={purchase.isPending}>
        {confirming ? `Confirm ×${qty}` : soldOut ? "Sold out" : "Purchase"}{" "}<span className="sr-only">{name}</span>
      </button>
    </form>
  );
}
