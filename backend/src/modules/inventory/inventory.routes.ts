import { Router } from "express";
import { z } from "zod";
import { pagingFields } from "../../lib/pagination.js";
import { parse } from "../../lib/parse.js";
import { requireRole } from "../../middleware/auth.js";
import { listMovements, purchase, restock } from "./inventory.service.js";

const quantity = z.number().int().min(1).max(1_000_000);
const purchaseBody = z.strictObject({ quantity });
const restockBody = z.strictObject({ quantity, reason: z.string().trim().min(1).max(300).optional() });
const idParam = z.uuid();

/** Mounted under /api/vehicles after authentication. */
export const inventoryRoutes = Router();

inventoryRoutes.post("/:id/purchase", async (req, res) => {
  const id = parse(idParam, req.params.id);
  res.json({ data: await purchase(id, req.user!.id, parse(purchaseBody, req.body).quantity) });
});

inventoryRoutes.post("/:id/restock", requireRole("ADMIN"), async (req, res) => {
  const id = parse(idParam, req.params.id);
  const { quantity, reason } = parse(restockBody, req.body);
  res.json({ data: await restock(id, req.user!.id, quantity, reason) });
});

inventoryRoutes.get("/:id/movements", requireRole("ADMIN"), async (req, res) => {
  const id = parse(idParam, req.params.id);
  const { page, pageSize } = parse(z.strictObject(pagingFields), req.query);
  res.json(await listMovements(id, page, pageSize));
});
