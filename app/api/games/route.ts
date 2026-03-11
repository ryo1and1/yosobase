import { NextRequest, NextResponse } from "next/server";
import { fetchGamesByDate } from "@/lib/data";
import { getViewerUserId } from "@/lib/guest-user";
import { todayJst } from "@/lib/time";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const date = request.nextUrl.searchParams.get("date") ?? todayJst();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json({ error: "日付形式が正しくありません。YYYY-MM-DD で指定してください。" }, { status: 400 });
    }

    const viewerUserId = await getViewerUserId();
    const games = await fetchGamesByDate(date, viewerUserId);

    return NextResponse.json({ date, games });
  } catch (error) {
    const message = error instanceof Error ? error.message : "試合一覧の取得に失敗しました。";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
