import express from "express";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import { createApp } from "../../src/app.js";
import { AppError } from "../../src/lib/errors.js";
import { errorHandler } from "../../src/middleware/errorHandler.js";

const envelope = (code: string, message: string) => ({ error: { code, message } });

describe("standard error envelope", () => {
  it("answers unknown routes with a 404 NOT_FOUND envelope", async () => {
    const response = await request(createApp()).get("/api/does-not-exist");

    expect(response.status).toBe(404);
    expect(response.body).toEqual(envelope("NOT_FOUND", "Route not found."));
  });

  it("renders AppError with its status, code and optional details", async () => {
    const app = express();
    app.get("/conflict", () => {
      throw new AppError(409, "INSUFFICIENT_STOCK", "Not enough stock available.");
    });
    app.use(errorHandler);

    const response = await request(app).get("/conflict");

    expect(response.status).toBe(409);
    expect(response.body).toEqual(envelope("INSUFFICIENT_STOCK", "Not enough stock available."));
  });

  it("hides internals of unexpected errors behind a 500 INTERNAL_ERROR envelope", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const app = express();
    app.get("/boom", () => {
      throw new Error("db password is hunter2");
    });
    app.use(errorHandler);

    const response = await request(app).get("/boom");

    expect(response.status).toBe(500);
    expect(response.body).toEqual(envelope("INTERNAL_ERROR", "Something went wrong."));
    expect(JSON.stringify(response.body)).not.toContain("hunter2");
  });

  it("answers malformed JSON bodies with 400 VALIDATION_ERROR", async () => {
    const response = await request(createApp())
      .post("/api/anything")
      .set("Content-Type", "application/json")
      .send("{not json");

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("does not advertise the framework", async () => {
    const response = await request(createApp()).get("/api/health");

    expect(response.headers["x-powered-by"]).toBeUndefined();
  });
});
