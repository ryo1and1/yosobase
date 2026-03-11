import { randomUUID } from "crypto";
import type { NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { getViewerSessionId, getViewerUserId } from "@/lib/guest-user";

export const TRACKABLE_EVENT_NAMES = [
  "signup_success",
  "prediction_submit",
  "prediction_blocked_deadline"
] as const;

export type TrackableEventName = (typeof TRACKABLE_EVENT_NAMES)[number];

const trackableEventSet = new Set<string>(TRACKABLE_EVENT_NAMES);

export function isTrackableEventName(value: string): value is TrackableEventName {
  return trackableEventSet.has(value);
}

export async function trackEventServer(
  eventName: string,
  metadata: Record<string, unknown> = {},
  explicitUserId?: string | null
): Promise<void> {
  if (!isTrackableEventName(eventName)) {
    return;
  }

  try {
    const userId = explicitUserId ?? (await getViewerUserId());
    const sessionId = (await getViewerSessionId()) ?? randomUUID();
    const supabase = createServiceClient();
    await supabase.from("analytics_events").insert({
      event_name: eventName,
      user_id: userId,
      session_id: sessionId,
      metadata
    });
  } catch (error) {
    console.error("trackEventServer error", error);
  }
}

export async function extractClientIp(req: NextRequest): Promise<string | null> {
  const forwarded = req.headers.get("x-forwarded-for");
  if (!forwarded) {
    return null;
  }
  return forwarded.split(",")[0]?.trim() ?? null;
}
