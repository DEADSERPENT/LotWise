import type { ErrorRequestHandler, RequestHandler } from "express";

/** Standard error body shared by every expected and unexpected failure. */
function errorBody(code: string, message: string) {
  return { error: { code, message } };
}

export const notFoundHandler: RequestHandler = (_req, res) => {
  res.status(404).json(errorBody("NOT_FOUND", "Route not found."));
};

/** Last-resort handler: logs server-side, never leaks internals to the client. */
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  console.error(err);
  res.status(500).json(errorBody("INTERNAL_ERROR", "Something went wrong."));
};
