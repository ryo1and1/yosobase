import { NextRequest, NextResponse } from "next/server";
import { fetchMeHistory } from "@/lib/data";
import { getAuthenticatedViewerUserId } from "@/lib/guest-user";
import { toSafeInt } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const userId = await getAuthenticatedViewerUserId();
    if (!userId) {
      return NextResponse.json({ error: "ログインが必要です。" }, { status: 401 });
    }

    const limit = Math.min(toSafeInt(request.nextUrl.searchParams.get("limit"), 20), 100);
    const history = await fetchMeHistory(userId, limit);
    return NextResponse.json({ user_id: userId, items: history });
  } catch (error) {
    const message = error instanceof Error ? error.message : "予想履歴の取得に失敗しました。";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
