import { timingSafeEqual } from "crypto";
import type { NextRequest } from "next/server";
import { getCronSecret } from "@/lib/env";

function safeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }
  return timingSafeEqual(leftBuffer, rightBuffer);
}

function getBearerSecret(request: NextRequest): string | null {
  const authorization = request.headers.get("authorization");
  if (!authorization) {
    return null;
  }

  const [scheme, token] = authorization.split(/\s+/, 2);
  if (scheme?.toLowerCase() !== "bearer" || !token) {
    return null;
  }

  return token;
}

// Vercel Cron uses the Authorization header when CRON_SECRET is configured.
// Keep the query-string secret as a fallback for internal step chaining and
// manual invocations from the admin UI.
export function isCronAuthorized(request: NextRequest): boolean {
  const actual = request.nextUrl.searchParams.get("secret") ?? getBearerSecret(request);
  if (!actual) {
    return false;
  }
  return safeEqual(actual, getCronSecret());
}

export function withCronSecret(path: string): string {
  const url = new URL(path, "http://localhost");
  url.searchParams.set("secret", getCronSecret());
  const query = url.searchParams.toString();
  return `${url.pathname}${query ? `?${query}` : ""}`;
}
