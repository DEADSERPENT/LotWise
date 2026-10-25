import { defineConfig } from "vitest/config";
import { testDatabaseUrl } from "./tests/helpers/test-db-url.js";

// Integration tests talk to a real PostgreSQL configured in the root .env.
try {
  process.loadEnvFile("../.env");
} catch {
  // CI provides DATABASE_URL via the environment.
}

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    globalSetup: ["./tests/helpers/global-setup.ts"],
    env: {
      DATABASE_URL: testDatabaseUrl(),
      JWT_SECRET: "test-secret-test-secret-test-secret-123456",
      JWT_EXPIRES_IN: "30m",
    },
    fileParallelism: false, // all files share one test database
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      exclude: ["src/generated/**", "src/server.ts"],
      reporter: ["text-summary", "html"],
      thresholds: { statements: 90, lines: 90, functions: 90, branches: 80 },
    },
  },
});
