import { createHmac, timingSafeEqual } from "crypto";
import type { NextRequest } from "next/server";
import { getAdminSecret } from "@/lib/env";

const ADMIN_COOKIE_NAME = "yosobase_admin_session";
const ADMIN_SESSION_MAX_AGE_SECONDS = 60 * 60 * 8;

function signAdminPayload(payload: string): string {
  return createHmac("sha256", getAdminSecret()).update(payload).digest("base64url");
}

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) {
    return false;
  }
  return timingSafeEqual(left, right);
}

export function getAdminCookieName(): string {
  return ADMIN_COOKIE_NAME;
}

export function getAdminSessionMaxAge(): number {
  return ADMIN_SESSION_MAX_AGE_SECONDS;
}

export function createAdminSessionValue(): string {
  const expiresAt = Date.now() + ADMIN_SESSION_MAX_AGE_SECONDS * 1000;
  const payload = `admin:${expiresAt}`;
  const signature = signAdminPayload(payload);
  return `${payload}.${signature}`;
}

export function hasValidAdminSession(request: NextRequest): boolean {
  const cookieValue = request.cookies.get(ADMIN_COOKIE_NAME)?.value ?? "";
  if (!cookieValue) {
    return false;
  }

  const lastDot = cookieValue.lastIndexOf(".");
  if (lastDot <= 0) {
    return false;
  }

  const payload = cookieValue.slice(0, lastDot);
  const signature = cookieValue.slice(lastDot + 1);
  const expected = signAdminPayload(payload);
  if (!safeEqual(signature, expected)) {
    return false;
  }

  const [kind, expiresAtRaw] = payload.split(":");
  const expiresAt = Number.parseInt(expiresAtRaw ?? "", 10);
  if (kind !== "admin" || !Number.isFinite(expiresAt)) {
    return false;
  }

  return Date.now() < expiresAt;
}

export function isAdminAuthorized(request: NextRequest): boolean {
  const headerSecret = request.headers.get("x-admin-secret");
  const expected = getAdminSecret();
  return headerSecret === expected || hasValidAdminSession(request);
}
