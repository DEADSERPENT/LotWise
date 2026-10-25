import request from "supertest";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { disconnectDatabase, prisma } from "../../src/lib/database.js";
import { app, signIn } from "../helpers/auth.js";
import { resetDatabase, seedVehicle } from "../helpers/db.js";

const missingId = "00000000-0000-4000-8000-000000000000";
const stockOf = async (id: string) => (await prisma.vehicle.findUniqueOrThrow({ where: { id } })).quantity;
type Auth = Record<string, string>;
const purchase = (id: string, auth: Auth, body: object = { quantity: 1 }) =>
  request(app).post(`/api/vehicles/${id}/purchase`).set(auth).send(body);
const restock = (id: string, auth: Auth, body: object = { quantity: 5 }) =>
  request(app).post(`/api/vehicles/${id}/restock`).set(auth).send(body);

describe("inventory", () => {
  beforeEach(resetDatabase);
  afterAll(disconnectDatabase);

  describe("access control", () => {
    it.each([
      ["post", "/purchase"],
      ["post", "/restock"],
      ["get", "/movements"],
    ] as const)("%s %s requires authentication", async (method, path) => {
      const res = await request(app)[method](`/api/vehicles/${missingId}${path}`);
      expect(res.status).toBe(401);
    });

    it.each([
      ["post", "/restock"],
      ["get", "/movements"],
    ] as const)("staff cannot %s %s", async (method, path) => {
      const { auth } = await signIn("STAFF");
      const res = await request(app)[method](`/api/vehicles/${missingId}${path}`).set(auth).send({ quantity: 1 });
      expect(res.status).toBe(403);
    });
  });

  describe("POST /api/vehicles/:id/purchase", () => {
    it("decrements stock and records one PURCHASE movement", async () => {
      const { auth, user } = await signIn("STAFF");
      const car = await seedVehicle({ quantity: 4 });

      const res = await purchase(car.id, auth, { quantity: 3 });

      expect(res.status).toBe(200);
      expect(res.body.data.vehicle).toMatchObject({ id: car.id, quantity: 1 });
      expect(res.body.data.movement).toMatchObject({ type: "PURCHASE", quantityDelta: -3, quantityBefore: 4, quantityAfter: 1 });
      expect(await prisma.inventoryMovement.findMany()).toMatchObject([
        { vehicleId: car.id, actorUserId: user.id, type: "PURCHASE", quantityDelta: -3, quantityBefore: 4, quantityAfter: 1 },
      ]);
    });

    it("can buy the last unit, leaving zero stock", async () => {
      const { auth } = await signIn();
      const car = await seedVehicle({ quantity: 1 });

      expect((await purchase(car.id, auth)).status).toBe(200);
      expect(await stockOf(car.id)).toBe(0);
    });

    it.each([
      ["more than available", 3, 2],
      ["when out of stock", 1, 0],
    ])("returns 409 INSUFFICIENT_STOCK %s with no side effects", async (_name, wanted, available) => {
      const { auth } = await signIn();
      const car = await seedVehicle({ quantity: available });

      const res = await purchase(car.id, auth, { quantity: wanted });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe("INSUFFICIENT_STOCK");
      expect(await stockOf(car.id)).toBe(available);
      expect(await prisma.inventoryMovement.count()).toBe(0);
    });

    it.each([[0], [-1], [1.5], ["2"], [null], [undefined]])("rejects quantity %s", async (quantity) => {
      const { auth } = await signIn();
      const car = await seedVehicle();

      const res = await purchase(car.id, auth, { quantity });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
      expect(await stockOf(car.id)).toBe(5);
    });

    it("404s for missing and archived vehicles, 400s for malformed ids", async () => {
      const { auth } = await signIn();
      const archived = await seedVehicle({ archivedAt: new Date() });

      for (const id of [missingId, archived.id]) {
        const res = await purchase(id, auth);
        expect(res.status).toBe(404);
        expect(res.body.error.code).toBe("VEHICLE_NOT_FOUND");
      }
      expect((await purchase("nope", auth)).status).toBe(400);
      expect(await prisma.inventoryMovement.count()).toBe(0);
    });

    it("never oversells under concurrent purchases", async () => {
      const { auth } = await signIn();
      const car = await seedVehicle({ quantity: 3 });

      const responses = await Promise.all(Array.from({ length: 10 }, () => purchase(car.id, auth)));

      const statuses = responses.map((r) => r.status);
      expect(statuses.filter((s) => s === 200)).toHaveLength(3);
      expect(statuses.filter((s) => s === 409)).toHaveLength(7);
      expect(await stockOf(car.id)).toBe(0);
      expect(await prisma.inventoryMovement.count({ where: { type: "PURCHASE" } })).toBe(3);
    });

    it("rolls back the stock change if the ledger write fails", async () => {
      const { auth } = await signIn();
      const car = await seedVehicle({ quantity: 5 });
      await prisma.$executeRawUnsafe(`
        CREATE FUNCTION fail_insert() RETURNS trigger AS $$ BEGIN RAISE EXCEPTION 'boom'; END; $$ LANGUAGE plpgsql;
        CREATE TRIGGER fail_movement BEFORE INSERT ON "InventoryMovement" FOR EACH ROW EXECUTE FUNCTION fail_insert();`);

      try {
        const res = await purchase(car.id, auth);
        expect(res.status).toBe(500);
        expect(await stockOf(car.id)).toBe(5);
      } finally {
        await prisma.$executeRawUnsafe('DROP TRIGGER fail_movement ON "InventoryMovement"; DROP FUNCTION fail_insert();');
      }
    });
  });

  describe("POST /api/vehicles/:id/restock", () => {
    it("increases stock and records a RESTOCK movement with its reason", async () => {
      const { auth, user } = await signIn("ADMIN");
      const car = await seedVehicle({ quantity: 3 });

      const res = await restock(car.id, auth, { quantity: 5, reason: "New shipment received" });

      expect(res.status).toBe(200);
      expect(res.body.data.vehicle.quantity).toBe(8);
      expect(res.body.data.movement).toMatchObject({ type: "RESTOCK", quantityDelta: 5, quantityBefore: 3, quantityAfter: 8, reason: "New shipment received" });
      expect(await prisma.inventoryMovement.findFirst()).toMatchObject({ actorUserId: user.id, type: "RESTOCK" });
    });

    it("works without a reason", async () => {
      const { auth } = await signIn("ADMIN");
      const car = await seedVehicle({ quantity: 0 });

      expect((await restock(car.id, auth)).body.data.vehicle.quantity).toBe(5);
    });

    it.each([
      ["zero quantity", { quantity: 0 }],
      ["negative quantity", { quantity: -2 }],
      ["fractional quantity", { quantity: 1.5 }],
      ["missing quantity", {}],
      ["too-long reason", { quantity: 1, reason: "r".repeat(301) }],
      ["unknown field", { quantity: 1, price: 1 }],
    ])("rejects %s with no side effects", async (_name, body) => {
      const { auth } = await signIn("ADMIN");
      const car = await seedVehicle();

      const res = await restock(car.id, auth, body);

      expect(res.status).toBe(400);
      expect(await stockOf(car.id)).toBe(5);
      expect(await prisma.inventoryMovement.count()).toBe(0);
    });

    it("404s for missing and archived vehicles", async () => {
      const { auth } = await signIn("ADMIN");
      const archived = await seedVehicle({ archivedAt: new Date() });

      for (const id of [missingId, archived.id]) {
        const res = await restock(id, auth);
        expect(res.status).toBe(404);
        expect(res.body.error.code).toBe("VEHICLE_NOT_FOUND");
      }
      expect(await stockOf(archived.id)).toBe(5);
    });
  });

  describe("GET /api/vehicles/:id/movements", () => {
    it("returns the full ledger in chronological order with pagination", async () => {
      const { auth: admin } = await signIn("ADMIN");
      const { auth: staff } = await signIn("STAFF");
      const created = await request(app).post("/api/vehicles").set(admin)
        .send({ make: "Toyota", model: "Corolla", category: "SEDAN", priceInPaise: 1000, quantity: 4 });
      const id = created.body.data.id;
      await purchase(id, staff);
      await restock(id, admin, { quantity: 5, reason: "Shipment" });
      // readable actor identity for the audit ledger
      const expectedActors = ["admin@example.com", "staff@example.com", "admin@example.com"];

      const res = await request(app).get(`/api/vehicles/${id}/movements`).set(admin);

      expect(res.status).toBe(200);
      expect(res.body.data.map((m: { type: string }) => m.type)).toEqual(["INITIAL_STOCK", "PURCHASE", "RESTOCK"]);
      expect(res.body.data.map((m: { actorEmail: string }) => m.actorEmail)).toEqual(expectedActors);
      expect(res.body.data[2]).toMatchObject({ vehicleId: id, quantityBefore: 3, quantityAfter: 8, reason: "Shipment" });
      expect(res.body.pagination).toEqual({ page: 1, pageSize: 20, total: 3, totalPages: 1 });

      const page2 = await request(app).get(`/api/vehicles/${id}/movements?page=2&pageSize=2`).set(admin);
      expect(page2.body.data).toHaveLength(1);
    });

    it("is still readable after the vehicle is archived", async () => {
      const { auth } = await signIn("ADMIN");
      const created = await request(app).post("/api/vehicles").set(auth)
        .send({ make: "Toyota", model: "Corolla", category: "SEDAN", priceInPaise: 1000, quantity: 1 });
      await request(app).delete(`/api/vehicles/${created.body.data.id}`).set(auth);

      const res = await request(app).get(`/api/vehicles/${created.body.data.id}/movements`).set(auth);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
    });

    it("404s for an unknown vehicle and 400s for bad paging", async () => {
      const { auth } = await signIn("ADMIN");
      const car = await seedVehicle();

      expect((await request(app).get(`/api/vehicles/${missingId}/movements`).set(auth)).status).toBe(404);
      expect((await request(app).get(`/api/vehicles/${car.id}/movements?pageSize=101`).set(auth)).status).toBe(400);
    });
  });
});
