import { NextRequest, NextResponse } from "next/server";
import { fetchGamesByDate } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import { todayJst } from "@/lib/time";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const date = request.nextUrl.searchParams.get("date") ?? todayJst();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json({ error: "日付は YYYY-MM-DD 形式で指定してください。" }, { status: 400 });
    }

    const supabase = await createClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();

    const games = await fetchGamesByDate(date, user?.id ?? null);

    return NextResponse.json({ date, games });
  } catch (error) {
    const message = error instanceof Error ? error.message : "試合一覧の取得に失敗しました。";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
