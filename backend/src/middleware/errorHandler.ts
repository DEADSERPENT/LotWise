import type { ErrorRequestHandler, RequestHandler } from "express";
import { AppError } from "../lib/errors.js";

const body = (code: string, message: string, details?: AppError["details"]) => ({
  error: { code, message, ...(details && { details }) },
});

export const notFoundHandler: RequestHandler = (_req, res) => {
  res.status(404).json(body("NOT_FOUND", "Route not found."));
};

/** Last-resort handler: logs server-side, never leaks internals to the client. */
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof AppError) {
    res.status(err.status).json(body(err.code, err.message, err.details));
  } else if (err?.type === "entity.parse.failed" || err?.type === "entity.too.large") {
    res.status(400).json(body("VALIDATION_ERROR", "Malformed or oversized JSON body."));
  } else {
    console.error(err);
    res.status(500).json(body("INTERNAL_ERROR", "Something went wrong."));
  }
};
