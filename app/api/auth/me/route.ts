import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { AUTH_COOKIE_NAME, getAuthSessionUserId } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const store = await cookies();
    const token = store.get(AUTH_COOKIE_NAME)?.value ?? "";
    if (!token) {
      return NextResponse.json({ authenticated: false });
    }

    const userId = await getAuthSessionUserId(token);
    if (!userId) {
      return NextResponse.json({ authenticated: false });
    }

    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("users")
      .select("id, display_name, email, favorite_team_id")
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (!data) {
      return NextResponse.json({ authenticated: false });
    }

    return NextResponse.json({
      authenticated: true,
      user: {
        id: data.id,
        display_name: data.display_name,
        email: data.email,
        favorite_team_id: data.favorite_team_id
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "認証状態の取得に失敗しました。";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
