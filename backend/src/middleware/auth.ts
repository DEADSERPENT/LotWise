import type { RequestHandler } from "express";
import type { Role, User } from "../generated/prisma/client.js";
import { forbidden, unauthenticated } from "../lib/errors.js";
import { userFromToken } from "../modules/auth/auth.service.js";

declare module "express-serve-static-core" {
  interface Request {
    user?: User;
  }
}

export const authenticate: RequestHandler = async (req, _res, next) => {
  const token = /^Bearer (.+)$/.exec(req.headers.authorization ?? "")?.[1];
  if (!token) throw unauthenticated();
  req.user = await userFromToken(token);
  next();
};

/** Must run after `authenticate`. */
export const requireRole =
  (role: Role): RequestHandler =>
  (req, _res, next) => {
    if (req.user?.role !== role) throw forbidden();
    next();
  };
