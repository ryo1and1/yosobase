import { NextRequest, NextResponse } from "next/server";
import { isTrackableEventName, trackEventServer } from "@/lib/analytics";
import { checkRateLimit } from "@/lib/rate-limit";
import { ensureViewerSession, getViewerUserId } from "@/lib/guest-user";

export const dynamic = "force-dynamic";

type TrackBody = {
  event_name?: string;
  metadata?: Record<string, unknown>;
};

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as TrackBody;
    if (!body.event_name || typeof body.event_name !== "string") {
      return NextResponse.json({ error: "event_name は必須です。" }, { status: 400 });
    }
    if (!isTrackableEventName(body.event_name)) {
      return NextResponse.json({ error: "許可されていないイベントです。" }, { status: 400 });
    }

    const sessionId = await ensureViewerSession();
    if (!(await checkRateLimit(`event:${sessionId}`, 120, 60_000))) {
      return NextResponse.json({ error: "操作が多すぎます。少し時間をおいてから再試行してください。" }, { status: 429 });
    }

    const userId = await getViewerUserId();
    const metadata = body.metadata && typeof body.metadata === "object" ? body.metadata : {};
    await trackEventServer(body.event_name, metadata, userId);

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "イベント送信に失敗しました。";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
