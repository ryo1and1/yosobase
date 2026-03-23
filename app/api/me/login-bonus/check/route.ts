import { NextResponse } from "next/server";
import { DAILY_LOGIN_BONUS_POINTS } from "@/lib/game-rules";
import { ensurePublicUserProfile } from "@/lib/public-user-profile";
import { createServiceClient } from "@/lib/supabase";
import { createClient } from "@/lib/supabase/server";
import { todayJst } from "@/lib/time";

type LoginBonusRpcRow = {
  applied: boolean;
  point_balance: number;
  bonus_points: number;
};

export async function POST() {
  try {
    const authClient = await createClient();
    const {
      data: { user },
      error: userError
    } = await authClient.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const today = todayJst();
    const supabase = createServiceClient();
    await ensurePublicUserProfile(supabase, user);

    const { data: initialData, error: initialError } = await supabase.rpc("grant_daily_login_bonus", {
      p_user_id: user.id,
      p_today_jst: today,
      p_bonus_points: DAILY_LOGIN_BONUS_POINTS
    });
    let data = (Array.isArray(initialData) ? initialData[0] : initialData) as LoginBonusRpcRow | null;
    let error = initialError;

    if (error?.message && /user not found/i.test(error.message)) {
      await ensurePublicUserProfile(supabase, user);
      const retry = await supabase.rpc("grant_daily_login_bonus", {
        p_user_id: user.id,
        p_today_jst: today,
        p_bonus_points: DAILY_LOGIN_BONUS_POINTS
      });
      data = (Array.isArray(retry.data) ? retry.data[0] : retry.data) as LoginBonusRpcRow | null;
      error = retry.error;
    }

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      applied: data?.applied ?? false,
      point_balance: data?.point_balance ?? 0,
      bonus_points: data?.bonus_points ?? 0
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to check daily login bonus";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
