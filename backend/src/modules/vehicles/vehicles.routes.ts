import { Router, type RequestHandler } from "express";
import { z } from "zod";
import { MAX_STOCK } from "../../lib/limits.js";
import { pagingFields } from "../../lib/pagination.js";
import { parse } from "../../lib/parse.js";
import { requireRole } from "../../middleware/auth.js";
import { archiveVehicle, createVehicle, listVehicles, updateVehicle } from "./vehicles.service.js";

const MAX_PRICE_IN_PAISE = 2_000_000_000; // PostgreSQL INTEGER limit, ~₹2 crore

const text = (max: number) => z.string().trim().min(1).max(max);
const category = text(40).transform((s) => s.replace(/\s+/g, " ").toUpperCase());
const price = z.number().int().min(1).max(MAX_PRICE_IN_PAISE);

const details = { make: text(80), model: text(80), category, priceInPaise: price };
const createBody = z.strictObject({ ...details, quantity: z.number().int().min(0).max(MAX_STOCK) });
const updateBody = z.strictObject(details); // no quantity: stock changes only via the ledger

const listFields = {
  ...pagingFields,
  sortBy: z.enum(["createdAt", "make", "priceInPaise", "quantity"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
};
const priceBound = z.coerce.number().int().min(0).max(MAX_PRICE_IN_PAISE).optional();
const listQuery = z.strictObject(listFields);
const searchQuery = z
  .strictObject({
    ...listFields,
    make: text(80).optional(),
    model: text(80).optional(),
    category: category.optional(),
    minPriceInPaise: priceBound,
    maxPriceInPaise: priceBound,
  })
  .refine((q) => (q.minPriceInPaise ?? 0) <= (q.maxPriceInPaise ?? Infinity), {
    message: "minPriceInPaise must not exceed maxPriceInPaise",
    path: ["minPriceInPaise"],
  });

const idParam = z.uuid();
const list = (schema: typeof listQuery | typeof searchQuery): RequestHandler => async (req, res) => {
  res.json(await listVehicles(parse(schema, req.query)));
};

/** Mounted under /api/vehicles after authentication. */
export const vehicleRoutes = Router();

vehicleRoutes.get("/", list(listQuery));
vehicleRoutes.get("/search", list(searchQuery)); // before any "/:id" route

const adminOnly = requireRole("ADMIN");

vehicleRoutes.post("/", adminOnly, async (req, res) => {
  res.status(201).json({ data: await createVehicle(parse(createBody, req.body), req.user!.id) });
});

vehicleRoutes.put("/:id", adminOnly, async (req, res) => {
  const id = parse(idParam, req.params.id);
  res.json({ data: await updateVehicle(id, parse(updateBody, req.body)) });
});

vehicleRoutes.delete("/:id", adminOnly, async (req, res) => {
  await archiveVehicle(parse(idParam, req.params.id));
  res.status(204).end();
});
