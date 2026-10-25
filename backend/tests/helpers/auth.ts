import { hash } from "@node-rs/argon2";
import request from "supertest";
import { createApp } from "../../src/app.js";
import { prisma } from "../../src/lib/database.js";

export const app = createApp();
export const PASSWORD = "correct-horse-battery";

/** Creates a user directly in the DB and returns it with a valid bearer header. */
export async function signIn(role: "STAFF" | "ADMIN" = "STAFF", email = `${role.toLowerCase()}@example.com`) {
  const user = await prisma.user.create({
    data: { email, role, passwordHash: await hash(PASSWORD) },
  });
  const { body } = await request(app).post("/api/auth/login").send({ email, password: PASSWORD });
  return { user, auth: { Authorization: `Bearer ${body.accessToken}` } };
}
