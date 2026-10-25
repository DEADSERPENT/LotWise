import { SignJWT } from "jose";
import request from "supertest";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { disconnectDatabase, prisma } from "../../src/lib/database.js";
import { resetDatabase } from "../helpers/db.js";
import { app, PASSWORD, signIn } from "../helpers/auth.js";

const credentials = { email: "staff@example.com", password: PASSWORD };

describe("auth", () => {
  beforeEach(resetDatabase);
  afterAll(disconnectDatabase);

  describe("POST /api/auth/register", () => {
    it("creates a STAFF user, returns a token and never the hash", async () => {
      const res = await request(app).post("/api/auth/register").send({ ...credentials, email: "  Staff@Example.COM " });

      expect(res.status).toBe(201);
      expect(res.body.user).toMatchObject({ email: "staff@example.com", role: "STAFF" });
      expect(res.body.accessToken).toEqual(expect.any(String));
      expect(JSON.stringify(res.body)).not.toMatch(/passwordHash|argon2/);
    });

    it("stores an Argon2id hash, not the password", async () => {
      await request(app).post("/api/auth/register").send(credentials);

      const stored = await prisma.user.findUniqueOrThrow({ where: { email: credentials.email } });
      expect(stored.passwordHash).toMatch(/^\$argon2id\$/);
      expect(stored.passwordHash).not.toContain(PASSWORD);
    });

    it("rejects a client-supplied role", async () => {
      const res = await request(app).post("/api/auth/register").send({ ...credentials, role: "ADMIN" });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
      expect(await prisma.user.count()).toBe(0);
    });

    it.each([
      ["invalid email", { email: "nope", password: PASSWORD }],
      ["short password", { email: "a@b.co", password: "short" }],
      ["missing password", { email: "a@b.co" }],
    ])("rejects %s", async (_name, body) => {
      const res = await request(app).post("/api/auth/register").send(body);

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("rejects a duplicate email regardless of case", async () => {
      await request(app).post("/api/auth/register").send(credentials);
      const res = await request(app).post("/api/auth/register").send({ ...credentials, email: "STAFF@example.com" });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe("EMAIL_ALREADY_EXISTS");
    });
  });

  describe("POST /api/auth/login", () => {
    beforeEach(async () => {
      await request(app).post("/api/auth/register").send(credentials);
    });

    it("returns user and token for valid credentials", async () => {
      const res = await request(app).post("/api/auth/login").send(credentials);

      expect(res.status).toBe(200);
      expect(res.body.user.email).toBe(credentials.email);
      expect(res.body.accessToken).toEqual(expect.any(String));
    });

    it.each([
      ["wrong password", { ...credentials, password: "wrong-password" }],
      ["unknown email", { email: "ghost@example.com", password: PASSWORD }],
    ])("answers %s with the same 401", async (_name, body) => {
      const res = await request(app).post("/api/auth/login").send(body);

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe("INVALID_CREDENTIALS");
    });
  });

  describe("GET /api/auth/me", () => {
    it("returns the signed-in user", async () => {
      const { auth, user } = await signIn();
      const res = await request(app).get("/api/auth/me").set(auth);

      expect(res.status).toBe(200);
      expect(res.body.user).toMatchObject({ id: user.id, email: user.email, role: "STAFF" });
    });

    it.each([
      ["no token", undefined],
      ["malformed token", "Bearer not.a.jwt"],
      ["wrong scheme", "Basic abc"],
    ])("rejects %s", async (_name, header) => {
      const res = await request(app).get("/api/auth/me").set("Authorization", header ?? "");

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe("UNAUTHENTICATED");
    });

    it("rejects an expired token", async () => {
      const { user } = await signIn();
      const token = await new SignJWT({})
        .setProtectedHeader({ alg: "HS256" })
        .setSubject(user.id)
        .setExpirationTime(Math.floor(Date.now() / 1000) - 60)
        .sign(new TextEncoder().encode(process.env.JWT_SECRET));

      const res = await request(app).get("/api/auth/me").set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(401);
    });

    it("rejects a valid token whose user no longer exists", async () => {
      const { auth, user } = await signIn();
      await prisma.user.delete({ where: { id: user.id } });

      expect((await request(app).get("/api/auth/me").set(auth)).status).toBe(401);
    });
  });
});
