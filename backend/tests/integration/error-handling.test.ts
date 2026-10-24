import express from "express";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import { createApp } from "../../src/app.js";
import { errorHandler } from "../../src/middleware/errorHandler.js";

describe("standard error envelope", () => {
  it("answers unknown routes with a 404 NOT_FOUND envelope", async () => {
    const response = await request(createApp()).get("/api/does-not-exist");

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      error: { code: "NOT_FOUND", message: "Route not found." },
    });
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
    expect(response.body).toEqual({
      error: { code: "INTERNAL_ERROR", message: "Something went wrong." },
    });
    expect(JSON.stringify(response.body)).not.toContain("hunter2");
  });
});
