import { hash, verify } from "@node-rs/argon2";
import { jwtVerify, SignJWT } from "jose";
import { env } from "../../config/env.js";
import type { Role, User } from "../../generated/prisma/client.js";
import { AppError, unauthenticated } from "../../lib/errors.js";
import { prisma } from "../../lib/database.js";

const secret = new TextEncoder().encode(env.JWT_SECRET);
// Verified against when the email is unknown, so both login failures cost the same time.
const dummyHash = hash("not-a-real-password");

export const toPublicUser = ({ id, email, role, createdAt }: User) => ({ id, email, role, createdAt });

const issueToken = (userId: string) =>
  new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setExpirationTime(env.JWT_EXPIRES_IN)
    .sign(secret);

const session = async (user: User) => ({ user: toPublicUser(user), accessToken: await issueToken(user.id) });

export async function createUser(email: string, password: string, role: Role = "STAFF") {
  try {
    return await prisma.user.create({ data: { email, passwordHash: await hash(password), role } });
  } catch (error) {
    if ((error as { code?: string }).code === "P2002") {
      throw new AppError(409, "EMAIL_ALREADY_EXISTS", "Email is already registered.");
    }
    throw error;
  }
}

export const register = async (email: string, password: string) => session(await createUser(email, password));

export async function login(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  const valid = await verify(user?.passwordHash ?? (await dummyHash), password);
  if (!user || !valid) throw new AppError(401, "INVALID_CREDENTIALS", "Invalid email or password.");
  return session(user);
}

/** Resolves a bearer token to its current user, or throws UNAUTHENTICATED. */
export async function userFromToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, secret, { algorithms: ["HS256"] });
    const user = await prisma.user.findUnique({ where: { id: payload.sub ?? "" } });
    if (user) return user;
  } catch {
    // fall through: any verification failure is the same 401
  }
  throw unauthenticated("Invalid or expired token.");
}

/** Idempotently ensures an ADMIN exists; used only by the seed command. */
export async function ensureAdmin(email: string, password: string) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (!existing) return createUser(email, password, "ADMIN");
  return existing.role === "ADMIN" ? existing : prisma.user.update({ where: { email }, data: { role: "ADMIN" } });
}
