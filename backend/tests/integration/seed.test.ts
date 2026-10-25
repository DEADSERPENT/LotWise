import request from "supertest";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { disconnectDatabase, prisma } from "../../src/lib/database.js";
import { seed } from "../../src/seed.js";
import { app } from "../helpers/auth.js";
import { resetDatabase } from "../helpers/db.js";

const admin = { email: "admin@example.com", password: "a-strong-admin-password" };

describe("seed", () => {
  beforeEach(resetDatabase);
  afterAll(disconnectDatabase);

  it("creates an ADMIN who can log in", async () => {
    await seed(admin);

    const res = await request(app).post("/api/auth/login").send(admin);

    expect(res.status).toBe(200);
    expect(res.body.user.role).toBe("ADMIN");
  });

  it("is idempotent", async () => {
    await seed(admin);
    await seed(admin);

    expect(await prisma.user.count()).toBe(1);
    expect(await prisma.vehicle.count()).toBeGreaterThan(0);
    const demoCount = await prisma.vehicle.count();
    await seed(admin);
    expect(await prisma.vehicle.count()).toBe(demoCount);
  });

  it("records an INITIAL_STOCK movement for each demo vehicle", async () => {
    await seed(admin);

    expect(await prisma.inventoryMovement.count({ where: { type: "INITIAL_STOCK" } })).toBe(await prisma.vehicle.count());
  });

  it("refuses to run without credentials", async () => {
    await expect(seed({ email: "", password: "" })).rejects.toThrow(/SEED_ADMIN/);
  });
});
