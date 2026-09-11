/**
 * Accounts and sessions, kept deliberately small.
 *
 * Passwords are hashed with scrypt and a per-user salt. A session is a signed cookie carrying the
 * user id and an expiry; the signature uses SPARBIRD_SECRET, which should be set wherever the app
 * runs so sessions survive a restart. Without it a secret is generated at boot and every session
 * ends when the process does.
 */

import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { getStore, type UserRecord } from "./db";

export const SESSION_COOKIE = "sb_session";
const SESSION_DAYS = 30;

const bootSecret = randomBytes(32).toString("hex");

function secret(): string {
  return process.env.SPARBIRD_SECRET?.trim() || bootSecret;
}

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const candidate = scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, "hex");
  return candidate.length === expected.length && timingSafeEqual(candidate, expected);
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

export function createSessionValue(userId: string): string {
  const expires = Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000;
  const payload = `${userId}.${expires}`;
  return `${Buffer.from(payload).toString("base64url")}.${sign(payload)}`;
}

export function readSessionValue(value: string | undefined): string | null {
  if (!value) return null;
  const [encoded, signature] = value.split(".");
  if (!encoded || !signature) return null;
  const payload = Buffer.from(encoded, "base64url").toString();
  const expected = sign(payload);
  if (expected.length !== signature.length) return null;
  if (!timingSafeEqual(Buffer.from(expected), Buffer.from(signature))) return null;
  const [userId, expires] = payload.split(".");
  if (!userId || !expires || Number(expires) < Date.now()) return null;
  return userId;
}

/**
 * Cookie options for a request. `Secure` is set when the connection is actually HTTPS, not
 * merely when NODE_ENV says production: a production build served over http on localhost has
 * to work too, or nobody can run the app on their own machine.
 */
export function sessionCookieOptions(request?: Request) {
  const forwarded = request?.headers.get("x-forwarded-proto");
  const https = forwarded
    ? forwarded.split(",")[0]!.trim() === "https"
    : request
      ? new URL(request.url).protocol === "https:"
      : process.env.NODE_ENV === "production";
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: https,
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  };
}

/** The signed-in user for this request, or null for a guest. */
export async function currentUser(): Promise<UserRecord | null> {
  const jar = await cookies();
  const userId = readSessionValue(jar.get(SESSION_COOKIE)?.value);
  if (!userId) return null;
  const store = await getStore();
  return store.getUser(userId);
}

export function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}
