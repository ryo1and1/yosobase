import { randomUUID } from "crypto";
import { cookies } from "next/headers";
import { AUTH_COOKIE_NAME, getAuthSessionUserId } from "@/lib/auth";

const SESSION_COOKIE_NAME = "yosobase_session_id";

export async function getViewerUserId(): Promise<string | null> {
  const store = await cookies();
  const authToken = store.get(AUTH_COOKIE_NAME)?.value;
  if (authToken) {
    const sessionUserId = await getAuthSessionUserId(authToken);
    if (sessionUserId) {
      return sessionUserId;
    }
  }
  return null;
}

export async function getAuthenticatedViewerUserId(): Promise<string | null> {
  const store = await cookies();
  const authToken = store.get(AUTH_COOKIE_NAME)?.value;
  if (!authToken) {
    return null;
  }
  return getAuthSessionUserId(authToken);
}

export async function getViewerSessionId(): Promise<string | null> {
  const store = await cookies();
  return store.get(SESSION_COOKIE_NAME)?.value ?? null;
}

export async function ensureViewerSession(): Promise<string> {
  const store = await cookies();
  const existing = store.get(SESSION_COOKIE_NAME)?.value;
  if (existing) {
    return existing;
  }
  const next = randomUUID();
  store.set(SESSION_COOKIE_NAME, next, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 365,
    path: "/"
  });
  return next;
}
