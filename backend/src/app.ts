import express from "express";
import { authRoutes } from "./modules/auth/auth.routes.js";
import { vehicleRoutes } from "./modules/vehicles/vehicles.routes.js";
import { authenticate } from "./middleware/auth.js";
import { inventoryRoutes } from "./modules/inventory/inventory.routes.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";

export interface AppDependencies {
  /** Optional readiness probe; when it rejects, /api/health answers 503. */
  checkDatabase?: () => Promise<void>;
}

export function createApp({ checkDatabase }: AppDependencies = {}) {
  const app = express();
  app.disable("x-powered-by");
  app.use(express.json({ limit: "10kb" }));

  app.get("/api/health", async (_req, res) => {
    try {
      await checkDatabase?.();
      res.status(200).json({ status: "ok" });
    } catch (error) {
      console.error("Health check failed:", error);
      res.status(503).json({ status: "unavailable" });
    }
  });

  app.use("/api/auth", authRoutes);
  app.use("/api/vehicles", authenticate, vehicleRoutes, inventoryRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
