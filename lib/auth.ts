import { createHash, randomBytes, scryptSync, timingSafeEqual } from "crypto";
import type { NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase";

const SESSION_TOKEN_BYTES = 32;
const PASSWORD_SALT_BYTES = 16;
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 90;
const SESSION_MAX_AGE_MS = SESSION_MAX_AGE_SECONDS * 1000;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const AUTH_COOKIE_NAME = "yosobase_auth_token";
export const AUTH_COOKIE_MAX_AGE = SESSION_MAX_AGE_SECONDS;

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function isValidEmail(value: string): boolean {
  return EMAIL_REGEX.test(value);
}

export function isValidPassword(value: string): boolean {
  return value.length >= 8 && value.length <= 128;
}

export function hashPassword(password: string): string {
  const salt = randomBytes(PASSWORD_SALT_BYTES);
  const hash = scryptSync(password, salt, 64);
  return `${salt.toString("hex")}:${hash.toString("hex")}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const [saltHex, hashHex] = storedHash.split(":");
  if (!saltHex || !hashHex) return false;

  const salt = Buffer.from(saltHex, "hex");
  const current = Buffer.from(hashHex, "hex");
  if (salt.length === 0 || current.length === 0) return false;

  const computed = scryptSync(password, salt, current.length);
  if (computed.length !== current.length) return false;
  return timingSafeEqual(current, computed);
}

function hashSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function createAuthSession(userId: string): Promise<string> {
  const token = randomBytes(SESSION_TOKEN_BYTES).toString("base64url");
  const tokenHash = hashSessionToken(token);
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE_MS).toISOString();

  const supabase = createServiceClient();
  const { error } = await supabase.from("auth_sessions").insert({
    user_id: userId,
    token_hash: tokenHash,
    expires_at: expiresAt
  });

  if (error) {
    throw new Error(`Failed to create auth session: ${error.message}`);
  }
  return token;
}

export async function getAuthSessionUserId(token: string): Promise<string | null> {
  if (!token) return null;

  const tokenHash = hashSessionToken(token);
  const nowIso = new Date().toISOString();
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("auth_sessions")
    .select("user_id, expires_at")
    .eq("token_hash", tokenHash)
    .gt("expires_at", nowIso)
    .maybeSingle();

  if (error || !data) {
    return null;
  }
  return data.user_id as string;
}

export async function deleteAuthSession(token: string): Promise<void> {
  if (!token) return;
  const tokenHash = hashSessionToken(token);
  const supabase = createServiceClient();
  await supabase.from("auth_sessions").delete().eq("token_hash", tokenHash);
}

export async function getAuthUserIdFromRequest(request: NextRequest): Promise<string | null> {
  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value ?? "";
  if (!token) return null;
  return getAuthSessionUserId(token);
}
