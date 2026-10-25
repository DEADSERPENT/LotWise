import { afterAll, describe, expect, it } from "vitest";
import { disconnectDatabase, pingDatabase, prisma } from "../../src/lib/database.js";

describe("database connection (real PostgreSQL)", () => {
  afterAll(disconnectDatabase);

  it("answers a ping", async () => {
    await expect(pingDatabase()).resolves.toBeUndefined();
  });

  it("has the migrated tables available", async () => {
    await expect(prisma.vehicle.count()).resolves.toBeTypeOf("number");
  });
});
