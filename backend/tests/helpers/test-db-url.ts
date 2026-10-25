/** Derives `<db>_test` from DATABASE_URL so tests never touch development data. */
export function testDatabaseUrl(): string {
  const base = process.env.DATABASE_URL;
  if (!base) throw new Error("DATABASE_URL is not set. Copy .env.example to .env.");
  const url = new URL(base);
  if (!url.pathname.endsWith("_test")) url.pathname += "_test";
  return url.toString();
}
