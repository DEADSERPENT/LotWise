import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { disconnectDatabase, prisma } from "../../src/lib/database.js";
import { resetDatabase } from "../helpers/db.js";

const vehicle = { make: "Toyota", model: "Corolla", category: "SEDAN", priceInPaise: 100, quantity: 1 };

describe("database integrity rules", () => {
  beforeEach(resetDatabase);
  afterAll(disconnectDatabase);

  it("rejects negative stock", async () => {
    await expect(prisma.vehicle.create({ data: { ...vehicle, quantity: -1 } })).rejects.toThrow();
  });

  it("rejects non-positive prices", async () => {
    await expect(prisma.vehicle.create({ data: { ...vehicle, priceInPaise: 0 } })).rejects.toThrow();
  });

  it("keeps movements arithmetically consistent and append-only", async () => {
    const user = await prisma.user.create({ data: { email: "a@b.co", passwordHash: "x" } });
    const car = await prisma.vehicle.create({ data: vehicle });
    const movement = { vehicleId: car.id, actorUserId: user.id, type: "RESTOCK" as const };

    await expect(
      prisma.inventoryMovement.create({
        data: { ...movement, quantityDelta: 5, quantityBefore: 1, quantityAfter: 2 },
      }),
    ).rejects.toThrow();

    const ok = await prisma.inventoryMovement.create({
      data: { ...movement, quantityDelta: 5, quantityBefore: 1, quantityAfter: 6 },
    });
    await expect(
      prisma.inventoryMovement.update({ where: { id: ok.id }, data: { reason: "edit" } }),
    ).rejects.toThrow();
    await expect(prisma.inventoryMovement.delete({ where: { id: ok.id } })).rejects.toThrow();
  });
});
