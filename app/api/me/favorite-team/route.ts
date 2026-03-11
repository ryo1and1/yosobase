import { NextRequest, NextResponse } from "next/server";
import { getAuthUserIdFromRequest } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase";

type UpdateFavoriteTeamBody = {
  favorite_team_id?: unknown;
};

function parseFavoriteTeamId(value: unknown): string | null | undefined {
  if (value === null) return null;
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export async function PATCH(request: NextRequest) {
  try {
    const userId = await getAuthUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: "ログインが必要です。" }, { status: 401 });
    }

    const body = (await request.json()) as UpdateFavoriteTeamBody;
    const favoriteTeamId = parseFavoriteTeamId(body.favorite_team_id);
    if (favoriteTeamId === undefined) {
      return NextResponse.json({ error: "favorite_team_id は文字列または null で指定してください。" }, { status: 400 });
    }

    const supabase = createServiceClient();

    const { data: userRow, error: userError } = await supabase.from("users").select("id").eq("id", userId).maybeSingle();
    if (userError) {
      return NextResponse.json({ error: userError.message }, { status: 500 });
    }
    if (!userRow) {
      return NextResponse.json({ error: "ユーザーが見つかりません。" }, { status: 404 });
    }

    if (favoriteTeamId) {
      const { data: teamRow, error: teamError } = await supabase
        .from("teams")
        .select("id")
        .eq("id", favoriteTeamId)
        .maybeSingle();
      if (teamError) {
        return NextResponse.json({ error: teamError.message }, { status: 500 });
      }
      if (!teamRow) {
        return NextResponse.json({ error: "選択した球団が見つかりません。" }, { status: 400 });
      }
    }

    const { error: updateError } = await supabase.from("users").update({ favorite_team_id: favoriteTeamId }).eq("id", userId);
    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      favorite_team_id: favoriteTeamId
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "好きな球団の更新に失敗しました。";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
