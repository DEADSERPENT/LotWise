import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { disconnectDatabase, pingDatabase } from "./lib/database.js";

const server = createApp({ checkDatabase: pingDatabase }).listen(env.PORT, () => {
  console.log(`Lotwise API listening on http://localhost:${env.PORT}`);
});

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => server.close(() => void disconnectDatabase().then(() => process.exit(0))));
}
