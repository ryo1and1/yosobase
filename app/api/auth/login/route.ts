import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { extractClientIp } from "@/lib/analytics";
import {
  AUTH_COOKIE_MAX_AGE,
  AUTH_COOKIE_NAME,
  createAuthSession,
  isValidEmail,
  normalizeEmail,
  verifyPassword
} from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";
import { createServiceClient } from "@/lib/supabase";

type LoginBody = {
  email?: string;
  password?: string;
};

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as LoginBody;
    const email = normalizeEmail(body.email ?? "");
    const password = body.password ?? "";
    const clientIp = (await extractClientIp(request)) ?? "unknown";

    if (!(await checkRateLimit(`auth:login:ip:${clientIp}`, 8, 60_000))) {
      return NextResponse.json(
        { error: "操作が多すぎます。少し時間をおいてから再試行してください。" },
        { status: 429 }
      );
    }

    if (!isValidEmail(email)) {
      return NextResponse.json({ error: "メールアドレスの形式が正しくありません。" }, { status: 400 });
    }
    if (!password) {
      return NextResponse.json({ error: "パスワードを入力してください。" }, { status: 400 });
    }

    const supabase = createServiceClient();
    const { data: user, error } = await supabase
      .from("users")
      .select("id, display_name, email, password_hash, favorite_team_id")
      .eq("email", email)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (!user || !user.password_hash) {
      return NextResponse.json({ error: "メールアドレスまたはパスワードが正しくありません。" }, { status: 401 });
    }
    if (!verifyPassword(password, String(user.password_hash))) {
      return NextResponse.json({ error: "メールアドレスまたはパスワードが正しくありません。" }, { status: 401 });
    }

    const authToken = await createAuthSession(String(user.id));
    const store = await cookies();
    store.set(AUTH_COOKIE_NAME, authToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: AUTH_COOKIE_MAX_AGE,
      path: "/"
    });

    return NextResponse.json({
      ok: true,
      user: {
        id: user.id,
        display_name: user.display_name,
        email: user.email,
        favorite_team_id: user.favorite_team_id
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "ログインに失敗しました。";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
