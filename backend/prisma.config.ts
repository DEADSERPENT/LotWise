import { defineConfig, env } from "prisma/config";

// The single .env lives at the repository root, one level above backend/.
try {
  process.loadEnvFile("../.env");
} catch {
  // Not found (e.g. in CI): DATABASE_URL is expected from the environment.
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  datasource: { url: env("DATABASE_URL") },
});
