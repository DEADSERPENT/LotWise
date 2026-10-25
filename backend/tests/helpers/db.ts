import { prisma } from "../../src/lib/database.js";

export const resetDatabase = () =>
  prisma.$executeRawUnsafe('TRUNCATE "InventoryMovement", "Vehicle", "User" CASCADE');

type VehicleOverrides = Partial<{
  make: string;
  model: string;
  category: string;
  priceInPaise: number;
  quantity: number;
  archivedAt: Date;
}>;

let counter = 0;
/** Inserts a vehicle straight into the DB (bypassing the API) to arrange test state. */
export const seedVehicle = (overrides: VehicleOverrides = {}) =>
  prisma.vehicle.create({
    data: { make: "Toyota", model: `Model ${counter++}`, category: "SEDAN", priceInPaise: 10_000_000, quantity: 5, ...overrides },
  });
