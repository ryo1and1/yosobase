import { NextRequest, NextResponse } from "next/server";
import { fetchMeSummary } from "@/lib/data";
import { getAuthenticatedViewerUserId } from "@/lib/guest-user";
import { currentJstYear } from "@/lib/time";
import { toSafeInt } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const userId = await getAuthenticatedViewerUserId();
    if (!userId) {
      return NextResponse.json({ error: "ログインが必要です。" }, { status: 401 });
    }

    const seasonYear = toSafeInt(request.nextUrl.searchParams.get("seasonYear"), currentJstYear());
    const summary = await fetchMeSummary(userId, seasonYear);
    return NextResponse.json({ user_id: userId, season_year: seasonYear, ...summary });
  } catch (error) {
    const message = error instanceof Error ? error.message : "成績サマリーの取得に失敗しました。";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
