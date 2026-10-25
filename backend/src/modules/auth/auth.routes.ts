import { Router } from "express";
import { z } from "zod";
import { parse } from "../../lib/parse.js";
import { authenticate } from "../../middleware/auth.js";
import { login, register, toPublicUser } from "./auth.service.js";

const email = z.string().trim().toLowerCase().pipe(z.email());
const registerBody = z.strictObject({ email, password: z.string().min(8).max(128) });
const loginBody = z.strictObject({ email, password: z.string().min(1) });

export const authRoutes = Router();

authRoutes.post("/register", async (req, res) => {
  const { email, password } = parse(registerBody, req.body);
  res.status(201).json(await register(email, password));
});

authRoutes.post("/login", async (req, res) => {
  const { email, password } = parse(loginBody, req.body);
  res.json(await login(email, password));
});

authRoutes.get("/me", authenticate, (req, res) => {
  res.json({ user: toPublicUser(req.user!) });
});
