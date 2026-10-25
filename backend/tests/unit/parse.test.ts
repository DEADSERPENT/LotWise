import { describe, expect, it } from "vitest";
import { z } from "zod";
import { AppError } from "../../src/lib/errors.js";
import { parse } from "../../src/lib/parse.js";

const schema = z.object({ quantity: z.number().int().positive() }).strict();

describe("parse", () => {
  it("returns typed data for valid input", () => {
    expect(parse(schema, { quantity: 2 })).toEqual({ quantity: 2 });
  });

  it("throws a 400 VALIDATION_ERROR AppError with field details", () => {
    try {
      parse(schema, { quantity: 0, role: "ADMIN" });
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(AppError);
      const appError = error as AppError;
      expect(appError.status).toBe(400);
      expect(appError.code).toBe("VALIDATION_ERROR");
      expect(appError.details?.length).toBeGreaterThan(0);
    }
  });
});
