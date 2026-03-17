import { NextRequest, NextResponse } from "next/server";
import { getAuthUserIdFromRequest } from "@/lib/auth";
import { DAILY_LOGIN_BONUS_POINTS } from "@/lib/game-rules";
import { createServiceClient } from "@/lib/supabase";
import { todayJst } from "@/lib/time";

type LoginBonusRpcRow = {
  applied: boolean;
  point_balance: number;
  bonus_points: number;
};

export async function POST(request: NextRequest) {
  try {
    const userId = await getAuthUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createServiceClient();
    const { data, error } = await supabase.rpc("grant_daily_login_bonus", {
      p_user_id: userId,
      p_today_jst: todayJst(),
      p_bonus_points: DAILY_LOGIN_BONUS_POINTS
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const result = (Array.isArray(data) ? data[0] : data) as LoginBonusRpcRow | null;

    return NextResponse.json({
      applied: result?.applied ?? false,
      point_balance: result?.point_balance ?? 0,
      bonus_points: result?.bonus_points ?? 0
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to check daily login bonus";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
