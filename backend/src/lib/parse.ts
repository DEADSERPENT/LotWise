import type { z } from "zod";
import { AppError } from "./errors.js";

/** Validates untrusted input, throwing a 400 VALIDATION_ERROR with field details. */
export function parse<S extends z.ZodType>(schema: S, input: unknown): z.output<S> {
  const result = schema.safeParse(input);
  if (result.success) return result.data;
  const details = result.error.issues.map((i) => ({ path: i.path.join("."), message: i.message }));
  throw new AppError(400, "VALIDATION_ERROR", "Invalid request.", details);
}
