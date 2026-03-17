import { randomUUID } from "crypto";
import { cookies } from "next/headers";
import { ensurePublicUserProfile } from "@/lib/public-user-profile";
import { createClient } from "@/lib/supabase/server";

const SESSION_COOKIE_NAME = "yosobase_session_id";

async function getAuthenticatedViewer() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (user) {
    try {
      await ensurePublicUserProfile(supabase, user);
    } catch {
      // Keep authentication available even if profile sync lags behind.
    }
  }

  return user;
}

export async function getViewerUserId(): Promise<string | null> {
  return (await getAuthenticatedViewer())?.id ?? null;
}

export async function getAuthenticatedViewerUserId(): Promise<string | null> {
  return (await getAuthenticatedViewer())?.id ?? null;
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
