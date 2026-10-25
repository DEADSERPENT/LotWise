import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../../src/app.js";

describe("GET /api/health", () => {
  it("reports the service as healthy", async () => {
    const response = await request(createApp()).get("/api/health");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: "ok" });
  });

  it("reports ok when the database check succeeds", async () => {
    const app = createApp({ checkDatabase: async () => {} });

    const response = await request(app).get("/api/health");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: "ok" });
  });

  it("returns 503 without leaking details when the database is unreachable", async () => {
    const app = createApp({
      checkDatabase: async () => {
        throw new Error("connect ECONNREFUSED postgres://lotwise:secret@localhost");
      },
    });

    const response = await request(app).get("/api/health");

    expect(response.status).toBe(503);
    expect(response.body).toEqual({ status: "unavailable" });
  });
});
