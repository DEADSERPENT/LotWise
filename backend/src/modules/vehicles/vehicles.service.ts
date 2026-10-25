import type { Prisma, Vehicle } from "../../generated/prisma/client.js";
import { prisma } from "../../lib/database.js";
import { vehicleNotFound } from "../../lib/errors.js";
import { pageMeta } from "../../lib/pagination.js";

export interface VehicleDetails {
  make: string;
  model: string;
  category: string;
  priceInPaise: number;
}

export interface ListQuery {
  page: number;
  pageSize: number;
  sortBy: "createdAt" | "make" | "priceInPaise" | "quantity";
  sortOrder: "asc" | "desc";
  make?: string;
  model?: string;
  category?: string;
  minPriceInPaise?: number;
  maxPriceInPaise?: number;
}

/** Public shape: hides internal fields such as `archivedAt`. */
export const toVehicle = (v: Vehicle) => ({
  id: v.id,
  make: v.make,
  model: v.model,
  category: v.category,
  priceInPaise: v.priceInPaise,
  quantity: v.quantity,
  createdAt: v.createdAt,
  updatedAt: v.updatedAt,
});

/** Shared by list and search so filter logic exists exactly once. */
export async function listVehicles(q: ListQuery) {
  const where: Prisma.VehicleWhereInput = {
    archivedAt: null,
    make: q.make && { contains: q.make, mode: "insensitive" },
    model: q.model && { contains: q.model, mode: "insensitive" },
    category: q.category,
    priceInPaise: { gte: q.minPriceInPaise, lte: q.maxPriceInPaise },
  };
  const [vehicles, total] = await Promise.all([
    prisma.vehicle.findMany({
      where,
      orderBy: [{ [q.sortBy]: q.sortOrder }, { id: "asc" }], // id tiebreaker keeps pages stable
      skip: (q.page - 1) * q.pageSize,
      take: q.pageSize,
    }),
    prisma.vehicle.count({ where }),
  ]);
  return { data: vehicles.map(toVehicle), pagination: pageMeta(total, q.page, q.pageSize) };
}

/** Creates the vehicle and its INITIAL_STOCK movement in one atomic write. */
export const createVehicle = async (input: VehicleDetails & { quantity: number }, actorUserId: string) =>
  toVehicle(
    await prisma.vehicle.create({
      data: {
        ...input,
        movements: {
          create: {
            actorUserId,
            type: "INITIAL_STOCK",
            quantityDelta: input.quantity,
            quantityBefore: 0,
            quantityAfter: input.quantity,
          },
        },
      },
    }),
  );

/** Runs a write against an active vehicle; Prisma's P2025 becomes a 404. */
async function onActiveVehicle(id: string, data: Prisma.VehicleUpdateInput) {
  try {
    return await prisma.vehicle.update({ where: { id, archivedAt: null }, data });
  } catch (error) {
    if ((error as { code?: string }).code === "P2025") throw vehicleNotFound();
    throw error;
  }
}

export const updateVehicle = async (id: string, details: VehicleDetails) =>
  toVehicle(await onActiveVehicle(id, details));

export const archiveVehicle = async (id: string) => {
  await onActiveVehicle(id, { archivedAt: new Date() });
};
