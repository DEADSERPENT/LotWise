import { execSync } from "node:child_process";
import pg from "pg";
import { testDatabaseUrl } from "./test-db-url.js";

/** Recreates the isolated test database from scratch and applies all migrations. */
export default async function setup() {
  const url = new URL(testDatabaseUrl());
  const name = url.pathname.slice(1);
  const admin = new pg.Client({ connectionString: new URL("/postgres", url).toString() });
  await admin.connect();
  await admin.query(`DROP DATABASE IF EXISTS "${name}" WITH (FORCE)`);
  await admin.query(`CREATE DATABASE "${name}"`);
  await admin.end();

  execSync("npx prisma migrate deploy", {
    stdio: "pipe",
    env: { ...process.env, DATABASE_URL: url.toString() },
  });
}
