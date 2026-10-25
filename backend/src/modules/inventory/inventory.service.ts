import type { InventoryMovement, MovementType, Vehicle } from "../../generated/prisma/client.js";
import { prisma } from "../../lib/database.js";
import { AppError, vehicleNotFound } from "../../lib/errors.js";
import { MAX_STOCK } from "../../lib/limits.js";
import { pageMeta } from "../../lib/pagination.js";
import { toVehicle } from "../vehicles/vehicles.service.js";

const toMovement = (m: InventoryMovement) => ({
  id: m.id,
  vehicleId: m.vehicleId,
  actorUserId: m.actorUserId,
  type: m.type,
  quantityDelta: m.quantityDelta,
  quantityBefore: m.quantityBefore,
  quantityAfter: m.quantityAfter,
  reason: m.reason,
  createdAt: m.createdAt,
});

/**
 * The single path for every stock change after creation. One conditional UPDATE
 * both checks and applies the change, so concurrent requests serialize on the row
 * lock and stock can never go negative or exceed MAX_STOCK; the ledger row commits
 * in the same transaction.
 */
async function adjustStock(vehicleId: string, actorUserId: string, type: MovementType, delta: number, reason?: string) {
  return prisma.$transaction(async (tx) => {
    const [vehicle] = await tx.$queryRaw<Vehicle[]>`
      UPDATE "Vehicle"
      SET "quantity" = "quantity" + ${delta}, "updatedAt" = now() AT TIME ZONE 'UTC'
      WHERE "id" = ${vehicleId} AND "archivedAt" IS NULL AND "quantity" + ${delta} >= 0
        AND (${delta} <= 0 OR "quantity" + ${delta} <= ${MAX_STOCK})
      RETURNING *`;

    if (!vehicle) {
      const exists = await tx.vehicle.count({ where: { id: vehicleId, archivedAt: null } });
      if (!exists) throw vehicleNotFound();
      // An increase can only fail on the ceiling; a decrease can only fail on the floor.
      throw delta > 0
        ? new AppError(409, "STOCK_LIMIT_EXCEEDED", "Stock cannot exceed the maximum allowed.")
        : new AppError(409, "INSUFFICIENT_STOCK", "Not enough stock available.");
    }

    const movement = await tx.inventoryMovement.create({
      data: {
        vehicleId,
        actorUserId,
        type,
        reason,
        quantityDelta: delta,
        quantityBefore: vehicle.quantity - delta,
        quantityAfter: vehicle.quantity,
      },
    });
    return { vehicle: toVehicle(vehicle), movement: toMovement(movement) };
  });
}

export const purchase = (vehicleId: string, actorUserId: string, quantity: number) =>
  adjustStock(vehicleId, actorUserId, "PURCHASE", -quantity);

export const restock = (vehicleId: string, actorUserId: string, quantity: number, reason?: string) =>
  adjustStock(vehicleId, actorUserId, "RESTOCK", quantity, reason);

/** History stays readable for archived vehicles, so only a truly unknown id is a 404. */
export async function listMovements(vehicleId: string, page: number, pageSize: number) {
  if (!(await prisma.vehicle.count({ where: { id: vehicleId } }))) throw vehicleNotFound();
  const where = { vehicleId };
  const [rows, total] = await Promise.all([
    prisma.inventoryMovement.findMany({
      where,
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { actor: { select: { email: true } } },
    }),
    prisma.inventoryMovement.count({ where }),
  ]);
  return { data: rows.map((m) => ({ ...toMovement(m), actorEmail: m.actor.email })), pagination: pageMeta(total, page, pageSize) };
}
