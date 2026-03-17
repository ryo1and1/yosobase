import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { AUTH_COOKIE_NAME, deleteAuthSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function POST() {
  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signOut();
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const store = await cookies();
    const token = store.get(AUTH_COOKIE_NAME)?.value ?? "";
    await deleteAuthSession(token);
    store.delete(AUTH_COOKIE_NAME);

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "ログアウトに失敗しました。";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
