import { NextRequest, NextResponse } from "next/server";
import { fetchGameDetail } from "@/lib/data";
import { getViewerUserId } from "@/lib/guest-user";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ gameId: string }> }
) {
  try {
    const { gameId } = await context.params;
    const viewerUserId = await getViewerUserId();
    const detail = await fetchGameDetail(gameId, viewerUserId);
    if (!detail) {
      return NextResponse.json({ error: "試合が見つかりません。" }, { status: 404 });
    }

    return NextResponse.json(detail);
  } catch (error) {
    const message = error instanceof Error ? error.message : "試合詳細の取得に失敗しました。";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
