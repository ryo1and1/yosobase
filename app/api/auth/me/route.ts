import { NextResponse } from "next/server";
import { ensurePublicUserProfile } from "@/lib/public-user-profile";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ authenticated: false });
    }

    await ensurePublicUserProfile(supabase, user);

    const { data, error } = await supabase
      .from("users")
      .select("id, display_name, email, favorite_team_id")
      .eq("id", user.id)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      authenticated: true,
      user: {
        id: user.id,
        display_name: data?.display_name ?? user.email?.split("@")[0] ?? "ユーザー",
        email: data?.email ?? user.email ?? "",
        favorite_team_id: data?.favorite_team_id ?? null
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "認証状態の取得に失敗しました。";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
