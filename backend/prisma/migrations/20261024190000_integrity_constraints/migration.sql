-- Domain invariants enforced by the database itself (defence in depth).
ALTER TABLE "Vehicle"
  ADD CONSTRAINT "Vehicle_quantity_nonnegative" CHECK ("quantity" >= 0),
  ADD CONSTRAINT "Vehicle_price_positive" CHECK ("priceInPaise" > 0);

ALTER TABLE "InventoryMovement"
  ADD CONSTRAINT "Movement_after_nonnegative" CHECK ("quantityAfter" >= 0),
  ADD CONSTRAINT "Movement_delta_consistent" CHECK ("quantityAfter" = "quantityBefore" + "quantityDelta");

-- The ledger is append-only: rows can never be edited or removed.
CREATE FUNCTION forbid_movement_change() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'InventoryMovement is append-only';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "InventoryMovement_append_only"
  BEFORE UPDATE OR DELETE ON "InventoryMovement"
  FOR EACH ROW EXECUTE FUNCTION forbid_movement_change();
