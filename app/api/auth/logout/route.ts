import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { AUTH_COOKIE_NAME, deleteAuthSession } from "@/lib/auth";

export async function POST() {
  try {
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
