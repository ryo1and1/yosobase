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

// Vercel Cron cannot attach custom auth headers, so cron routes use
// a shared secret in the query string for scheduled invocations.
export function isCronAuthorized(request: NextRequest): boolean {
  const actual = request.nextUrl.searchParams.get("secret");
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
