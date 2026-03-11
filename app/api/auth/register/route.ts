import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { extractClientIp, trackEventServer } from "@/lib/analytics";
import {
  AUTH_COOKIE_MAX_AGE,
  AUTH_COOKIE_NAME,
  createAuthSession,
  hashPassword,
  isValidEmail,
  isValidPassword,
  normalizeEmail
} from "@/lib/auth";
import { INITIAL_POINT_BALANCE } from "@/lib/game-rules";
import { checkRateLimit } from "@/lib/rate-limit";
import { createServiceClient } from "@/lib/supabase";

type RegisterBody = {
  display_name?: string;
  email?: string;
  password?: string;
  favorite_team_id?: string;
};

function normalizeDisplayName(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as RegisterBody;
    const clientIp = (await extractClientIp(request)) ?? "unknown";
    if (!(await checkRateLimit(`auth:register:ip:${clientIp}`, 3, 60_000))) {
      return NextResponse.json(
        { error: "登録操作が多すぎます。少し時間をおいてから再試行してください。" },
        { status: 429 }
      );
    }

    const displayName = normalizeDisplayName(body.display_name ?? "");
    const email = normalizeEmail(body.email ?? "");
    const password = body.password ?? "";
    const favoriteTeamId = (body.favorite_team_id ?? "").trim() || null;

    if (!(await checkRateLimit(`auth:register:email:${email || "unknown"}`, 3, 60_000))) {
      return NextResponse.json(
        { error: "このメールアドレスでの登録操作が多すぎます。少し時間をおいてから再試行してください。" },
        { status: 429 }
      );
    }

    if (!displayName || displayName.length > 32) {
      return NextResponse.json({ error: "ニックネームは1文字以上32文字以内で入力してください。" }, { status: 400 });
    }
    if (!isValidEmail(email)) {
      return NextResponse.json({ error: "メールアドレスの形式が正しくありません。" }, { status: 400 });
    }
    if (!isValidPassword(password)) {
      return NextResponse.json({ error: "パスワードは8文字以上28文字以内で入力してください。" }, { status: 400 });
    }

    const supabase = createServiceClient();
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
        return NextResponse.json({ error: "選択した好きな球団が見つかりません。" }, { status: 400 });
      }
    }

    const { data: existingUser, error: existingUserError } = await supabase
      .from("users")
      .select("id")
      .eq("email", email)
      .maybeSingle();
    if (existingUserError) {
      return NextResponse.json({ error: existingUserError.message }, { status: 500 });
    }
    if (existingUser) {
      return NextResponse.json({ error: "このメールアドレスはすでに登録されています。" }, { status: 409 });
    }

    const passwordHash = hashPassword(password);
    const { data: insertedUser, error: insertError } = await supabase
      .from("users")
      .insert({
        display_name: displayName,
        email,
        password_hash: passwordHash,
        favorite_team_id: favoriteTeamId,
        point_balance: INITIAL_POINT_BALANCE
      })
      .select("id, display_name, email, favorite_team_id")
      .single();

    if (insertError) {
      if (insertError.code === "23505") {
        return NextResponse.json({ error: "このメールアドレスはすでに登録されています。" }, { status: 409 });
      }
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    const authToken = await createAuthSession(insertedUser.id as string);
    const store = await cookies();
    store.set(AUTH_COOKIE_NAME, authToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: AUTH_COOKIE_MAX_AGE,
      path: "/"
    });

    await trackEventServer(
      "signup_success",
      {
        has_favorite_team: Boolean(favoriteTeamId)
      },
      insertedUser.id as string
    );

    return NextResponse.json({
      ok: true,
      user: {
        id: insertedUser.id,
        display_name: insertedUser.display_name,
        email: insertedUser.email,
        favorite_team_id: insertedUser.favorite_team_id
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "会員登録に失敗しました。";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
