import request from "supertest";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { disconnectDatabase, prisma } from "../../src/lib/database.js";
import { app, signIn } from "../helpers/auth.js";
import { resetDatabase, seedVehicle } from "../helpers/db.js";

const valid = { make: "Toyota", model: "Corolla", category: "SEDAN", priceInPaise: 185_000_000, quantity: 4 };
const missingId = "00000000-0000-4000-8000-000000000000";

describe("vehicles", () => {
  beforeEach(resetDatabase);
  afterAll(disconnectDatabase);

  describe("access control", () => {
    it.each([
      ["get", "/api/vehicles"],
      ["get", "/api/vehicles/search"],
      ["post", "/api/vehicles"],
      ["put", `/api/vehicles/${missingId}`],
      ["delete", `/api/vehicles/${missingId}`],
    ] as const)("%s %s requires authentication", async (method, url) => {
      const res = await request(app)[method](url);
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe("UNAUTHENTICATED");
    });

    it.each([
      ["post", "/api/vehicles"],
      ["put", `/api/vehicles/${missingId}`],
      ["delete", `/api/vehicles/${missingId}`],
    ] as const)("staff cannot %s %s", async (method, url) => {
      const { auth } = await signIn("STAFF");
      const res = await request(app)[method](url).set(auth).send(valid);
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe("FORBIDDEN");
    });
  });

  describe("POST /api/vehicles", () => {
    it("creates a vehicle and its INITIAL_STOCK movement", async () => {
      const { auth, user } = await signIn("ADMIN");
      const res = await request(app).post("/api/vehicles").set(auth).send(valid);

      expect(res.status).toBe(201);
      expect(res.body.data).toMatchObject(valid);
      expect(res.body.data).not.toHaveProperty("archivedAt");
      expect(await prisma.inventoryMovement.findMany()).toMatchObject([
        { vehicleId: res.body.data.id, actorUserId: user.id, type: "INITIAL_STOCK", quantityDelta: 4, quantityBefore: 0, quantityAfter: 4 },
      ]);
    });

    it("allows zero quantity and records a zero-delta movement", async () => {
      const { auth } = await signIn("ADMIN");
      const res = await request(app).post("/api/vehicles").set(auth).send({ ...valid, quantity: 0 });

      expect(res.status).toBe(201);
      expect(await prisma.inventoryMovement.findFirst()).toMatchObject({ quantityDelta: 0, quantityAfter: 0 });
    });

    it("trims text and normalizes the category", async () => {
      const { auth } = await signIn("ADMIN");
      const res = await request(app).post("/api/vehicles").set(auth).send({ ...valid, make: "  Toyota ", category: " mini   suv " });

      expect(res.body.data).toMatchObject({ make: "Toyota", category: "MINI SUV" });
    });

    it.each([
      ["blank make", { make: "   " }],
      ["too-long model", { model: "m".repeat(81) }],
      ["zero price", { priceInPaise: 0 }],
      ["fractional price", { priceInPaise: 10.5 }],
      ["price above the supported maximum", { priceInPaise: 2_000_000_001 }],
      ["negative quantity", { quantity: -1 }],
      ["fractional quantity", { quantity: 1.5 }],
      ["unknown field", { color: "red" }],
    ])("rejects %s and writes nothing", async (_name, patch) => {
      const { auth } = await signIn("ADMIN");
      const res = await request(app).post("/api/vehicles").set(auth).send({ ...valid, ...patch });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
      expect(await prisma.vehicle.count()).toBe(0);
    });
  });

  describe("GET /api/vehicles", () => {
    it("lists active vehicles (including zero stock) with pagination meta", async () => {
      const { auth } = await signIn();
      await seedVehicle();
      await seedVehicle({ quantity: 0 });
      await seedVehicle({ archivedAt: new Date() });

      const res = await request(app).get("/api/vehicles").set(auth);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.data[0]).not.toHaveProperty("archivedAt");
      expect(res.body.pagination).toEqual({ page: 1, pageSize: 20, total: 2, totalPages: 1 });
    });

    it("paginates and sorts", async () => {
      const { auth } = await signIn();
      for (const priceInPaise of [300, 100, 200]) await seedVehicle({ priceInPaise });

      const res = await request(app).get("/api/vehicles?sortBy=priceInPaise&sortOrder=asc&page=2&pageSize=2").set(auth);

      expect(res.body.data.map((v: { priceInPaise: number }) => v.priceInPaise)).toEqual([300]);
      expect(res.body.pagination).toEqual({ page: 2, pageSize: 2, total: 3, totalPages: 2 });
    });

    it.each(["page=0", "page=abc", "pageSize=101", "pageSize=0", "sortBy=password", "sortOrder=up", "make=x"])(
      "rejects invalid query %s",
      async (query) => {
        const { auth } = await signIn();
        const res = await request(app).get(`/api/vehicles?${query}`).set(auth);
        expect(res.status).toBe(400);
        expect(res.body.error.code).toBe("VALIDATION_ERROR");
      },
    );
  });

  describe("GET /api/vehicles/search", () => {
    let auth: Awaited<ReturnType<typeof signIn>>["auth"];

    beforeEach(async () => {
      ({ auth } = await signIn());
      await seedVehicle({ make: "Toyota", model: "Corolla", category: "SEDAN", priceInPaise: 1000 });
      await seedVehicle({ make: "Toyota", model: "Fortuner", category: "SUV", priceInPaise: 3000 });
      await seedVehicle({ make: "Honda", model: "City", category: "SEDAN", priceInPaise: 2000 });
      await seedVehicle({ make: "Honda", model: "City Old", category: "SEDAN", priceInPaise: 500, archivedAt: new Date() });
    });

    const search = (query: string) =>
      request(app).get(`/api/vehicles/search?${query}&sortBy=priceInPaise&sortOrder=asc`).set(auth);
    const models = async (query: string) => (await search(query)).body.data.map((v: { model: string }) => v.model);

    it("matches make partially and case-insensitively", async () => {
      expect(await models("make=toYO")).toEqual(["Corolla", "Fortuner"]);
    });
    it("matches model partially", async () => {
      expect(await models("model=cit")).toEqual(["City"]);
    });
    it("matches category exactly after normalization", async () => {
      expect(await models("category=%20suv%20")).toEqual(["Fortuner"]);
      expect(await models("category=su")).toEqual([]);
    });
    it("applies inclusive price bounds", async () => {
      expect(await models("minPriceInPaise=1000&maxPriceInPaise=2000")).toEqual(["Corolla", "City"]);
    });
    it("combines filters", async () => {
      expect(await models("make=honda&category=sedan&maxPriceInPaise=2500")).toEqual(["City"]);
    });
    it("returns 200 with empty data when nothing matches", async () => {
      const res = await search("make=ferrari");
      expect(res.status).toBe(200);
      expect(res.body.data).toEqual([]);
    });
    it.each(["minPriceInPaise=5&maxPriceInPaise=1", "minPriceInPaise=1.5", "maxPriceInPaise=-1"])(
      "rejects invalid price filter %s",
      async (query) => {
        expect((await search(query)).status).toBe(400);
      },
    );
  });

  describe("PUT /api/vehicles/:id", () => {
    const update = { make: "Toyota", model: "Corolla Hybrid", category: "SEDAN", priceInPaise: 199_500_000 };

    it("updates details but never quantity", async () => {
      const { auth } = await signIn("ADMIN");
      const car = await seedVehicle({ quantity: 7 });
      const res = await request(app).put(`/api/vehicles/${car.id}`).set(auth).send(update);

      expect(res.status).toBe(200);
      expect(res.body.data).toMatchObject({ ...update, quantity: 7 });
    });

    it("rejects a quantity field so stock cannot bypass the ledger", async () => {
      const { auth } = await signIn("ADMIN");
      const car = await seedVehicle({ quantity: 7 });
      const res = await request(app).put(`/api/vehicles/${car.id}`).set(auth).send({ ...update, quantity: 99 });

      expect(res.status).toBe(400);
      expect((await prisma.vehicle.findUniqueOrThrow({ where: { id: car.id } })).quantity).toBe(7);
    });

    it("requires all four fields", async () => {
      const { auth } = await signIn("ADMIN");
      const car = await seedVehicle();
      expect((await request(app).put(`/api/vehicles/${car.id}`).set(auth).send({ make: "X" })).status).toBe(400);
    });

    it("404s for missing and archived vehicles; 400s for malformed ids", async () => {
      const { auth } = await signIn("ADMIN");
      const archived = await seedVehicle({ archivedAt: new Date() });

      for (const id of [missingId, archived.id]) {
        const res = await request(app).put(`/api/vehicles/${id}`).set(auth).send(update);
        expect(res.status).toBe(404);
        expect(res.body.error.code).toBe("VEHICLE_NOT_FOUND");
      }
      expect((await request(app).put("/api/vehicles/not-a-uuid").set(auth).send(update)).status).toBe(400);
    });
  });

  describe("DELETE /api/vehicles/:id", () => {
    it("archives the vehicle, hides it, and keeps its movement history", async () => {
      const { auth } = await signIn("ADMIN");
      const { body } = await request(app).post("/api/vehicles").set(auth).send(valid);
      const id = body.data.id;

      const res = await request(app).delete(`/api/vehicles/${id}`).set(auth);

      expect(res.status).toBe(204);
      expect((await request(app).get("/api/vehicles").set(auth)).body.data).toEqual([]);
      expect(await prisma.vehicle.findUnique({ where: { id } })).toMatchObject({ archivedAt: expect.any(Date) });
      expect(await prisma.inventoryMovement.count({ where: { vehicleId: id } })).toBe(1);
    });

    it("404s when already archived or missing", async () => {
      const { auth } = await signIn("ADMIN");
      const archived = await seedVehicle({ archivedAt: new Date() });

      for (const id of [archived.id, missingId]) {
        const res = await request(app).delete(`/api/vehicles/${id}`).set(auth);
        expect(res.status).toBe(404);
        expect(res.body.error.code).toBe("VEHICLE_NOT_FOUND");
      }
    });
  });
});
