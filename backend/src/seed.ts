import { pathToFileURL } from "node:url";
import { disconnectDatabase, prisma } from "./lib/database.js";
import { ensureAdmin } from "./modules/auth/auth.service.js";
import { createVehicle } from "./modules/vehicles/vehicles.service.js";

const inr = (rupees: number) => rupees * 100; // API and DB use integer paise

const demoVehicles = [
  { make: "Toyota", model: "Corolla Altis", category: "SEDAN", priceInPaise: inr(1_850_000), quantity: 4 },
  { make: "Honda", model: "City", category: "SEDAN", priceInPaise: inr(1_300_000), quantity: 6 },
  { make: "Hyundai", model: "Creta", category: "SUV", priceInPaise: inr(1_600_000), quantity: 3 },
  { make: "Toyota", model: "Fortuner", category: "SUV", priceInPaise: inr(4_400_000), quantity: 1 },
  { make: "Maruti Suzuki", model: "Swift", category: "HATCHBACK", priceInPaise: inr(650_000), quantity: 10 },
  { make: "Tata", model: "Nexon EV", category: "ELECTRIC", priceInPaise: inr(1_450_000), quantity: 0 },
];

/** Creates the initial admin and, on an empty catalogue, a few demo vehicles. */
export async function seed({ email, password }: { email: string; password: string }) {
  if (!email || !password) throw new Error("SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD must be set.");
  const admin = await ensureAdmin(email.trim().toLowerCase(), password);
  if ((await prisma.vehicle.count()) === 0) {
    for (const vehicle of demoVehicles) await createVehicle(vehicle, admin.id);
  }
}

// Run via `npm run db:seed`, not when imported by tests.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await seed({ email: process.env.SEED_ADMIN_EMAIL ?? "", password: process.env.SEED_ADMIN_PASSWORD ?? "" })
    .then(() => console.log("Seed complete."))
    .finally(disconnectDatabase);
}
