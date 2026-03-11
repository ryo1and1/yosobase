import { NextRequest, NextResponse } from "next/server";
import { fetchRanking } from "@/lib/data";
import { getViewerUserId } from "@/lib/guest-user";
import { currentJstYear } from "@/lib/time";
import { parseRankingPeriod, toSafeInt } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const period = parseRankingPeriod(request.nextUrl.searchParams.get("period"));
    const date = request.nextUrl.searchParams.get("date") ?? undefined;
    const endDate = request.nextUrl.searchParams.get("endDate") ?? undefined;
    const seasonYear = toSafeInt(request.nextUrl.searchParams.get("seasonYear"), currentJstYear());
    const limit = Math.min(toSafeInt(request.nextUrl.searchParams.get("limit"), 100), 300);

    const viewerUserId = await getViewerUserId();
    const ranking = await fetchRanking(period, {
      date,
      endDate,
      seasonYear,
      limit,
      viewerUserId
    });

    return NextResponse.json({
      period,
      items: ranking.items,
      me: ranking.me,
      total: ranking.total
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "ランキングの取得に失敗しました。";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
