import { NextRequest, NextResponse } from "next/server";
import { LOCK_MINUTES_BEFORE_START, MAX_STAKE_PER_GAME, optionsForMode } from "@/lib/game-rules";
import { trackEventServer } from "@/lib/analytics";
import { getAuthUserIdFromRequest } from "@/lib/auth";
import { isOddsLocked } from "@/lib/odds";
import { checkRateLimit } from "@/lib/rate-limit";
import { createServiceClient } from "@/lib/supabase";
import { parsePredictionMode, parsePredictionOption, parseSide } from "@/lib/validation";
import type { PredictionAllocation, PredictionMode } from "@/lib/types";

export const dynamic = "force-dynamic";

type PredictionBody = {
  mode?: unknown;
  allocations?: unknown;
  pick?: unknown;
};

type PredictionMutationRpcRow = {
  point_balance: number;
  total_stake: number;
  allocations: PredictionAllocation[] | null;
};

type PredictionDeleteRpcRow = {
  point_balance: number;
  refunded: number;
};

type GameRow = {
  id: string;
  start_at: string;
  status: "scheduled" | "in_progress" | "final" | "canceled";
};

function isClosed(game: GameRow): boolean {
  if (game.status !== "scheduled") {
    return true;
  }
  return isOddsLocked(game.start_at);
}

function parseAllocations(input: unknown, mode: PredictionMode): PredictionAllocation[] | null {
  if (!Array.isArray(input)) return null;

  const allowed = new Set(optionsForMode(mode));
  const merged = new Map<PredictionAllocation["option"], number>();

  for (const item of input) {
    if (!item || typeof item !== "object") return null;
    const option = parsePredictionOption((item as { option?: unknown }).option);
    const stakeRaw = (item as { stake_points?: unknown }).stake_points;
    if (!option || !allowed.has(option)) return null;
    if (typeof stakeRaw !== "number" || !Number.isInteger(stakeRaw) || stakeRaw <= 0) return null;
    merged.set(option, (merged.get(option) ?? 0) + stakeRaw);
  }

  return Array.from(merged.entries()).map(([option, stake_points]) => ({ option, stake_points }));
}

function normalizeBody(body: PredictionBody): { mode: PredictionMode; allocations: PredictionAllocation[] } | null {
  const rawMode = parsePredictionMode(body.mode);
  if (rawMode) {
    const allocations = parseAllocations(body.allocations, rawMode);
    if (!allocations || allocations.length === 0) return null;
    return { mode: rawMode, allocations };
  }

  // Backward compatibility: old payload { pick: home|draw|away }
  const pick = parseSide(body.pick);
  if (!pick) return null;

  const option =
    pick === "home" ? "home_win" : pick === "away" ? "away_win" : "draw";
  return {
    mode: "simple",
    allocations: [{ option, stake_points: MAX_STAKE_PER_GAME }]
  };
}

async function loadGame(supabase: ReturnType<typeof createServiceClient>, gameId: string): Promise<GameRow | null> {
  const { data, error } = await supabase
    .from("games")
    .select("id, start_at, status")
    .eq("id", gameId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }
  return (data as GameRow | null) ?? null;
}

function mapPredictionRpcStatus(message: string): number {
  if (message.includes("game not found")) {
    return 404;
  }
  if (
    message.includes("prediction deadline passed") ||
    message.includes("point balance is not enough") ||
    message.includes("invalid allocations") ||
    message.includes("total stake must")
  ) {
    return 400;
  }
  return 500;
}

function toPredictionErrorMessage(message: string): string {
  if (message.includes("game not found")) {
    return "試合が見つかりません。";
  }
  if (message.includes("prediction deadline passed")) {
    return "予想受付は終了しました。";
  }
  if (message.includes("point balance is not enough")) {
    return "ポイントが不足しています。";
  }
  if (message.includes("invalid allocations")) {
    return "予想内容が正しくありません。";
  }
  if (message.includes("total stake must")) {
    return `投票ポイントは1〜${MAX_STAKE_PER_GAME}ptで入力してください。`;
  }
  return "予想の更新に失敗しました。";
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ gameId: string }> }
) {
  try {
    const { gameId } = await context.params;
    const userId = await getAuthUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: "ログインが必要です。" }, { status: 401 });
    }

    if (!(await checkRateLimit(`prediction:${userId}`, 40, 60_000))) {
      return NextResponse.json({ error: "操作が多すぎます。少し時間をおいてから再試行してください。" }, { status: 429 });
    }

    const body = (await request.json()) as PredictionBody;
    const normalized = normalizeBody(body);
    if (!normalized) {
      return NextResponse.json({ error: "予想内容が正しくありません。" }, { status: 400 });
    }

    const totalStake = normalized.allocations.reduce((sum, row) => sum + row.stake_points, 0);
    if (totalStake <= 0 || totalStake > MAX_STAKE_PER_GAME) {
      return NextResponse.json({ error: `投票ポイントは1〜${MAX_STAKE_PER_GAME}ptで入力してください。` }, { status: 400 });
    }

    const supabase = createServiceClient();
    const game = await loadGame(supabase, gameId);
    if (!game) {
      return NextResponse.json({ error: "試合が見つかりません。" }, { status: 404 });
    }

    if (isClosed(game)) {
      await trackEventServer(
        "prediction_blocked_deadline",
        { game_id: gameId, status: game.status, action: "submit" },
        userId
      );
      return NextResponse.json({ error: "予想受付は終了しました。" }, { status: 400 });
    }

    const { data: mutationData, error: mutationError } = await supabase.rpc("upsert_prediction_bets_atomic", {
      p_user_id: userId,
      p_game_id: gameId,
      p_mode: normalized.mode,
      p_allocations: normalized.allocations,
      p_max_stake: MAX_STAKE_PER_GAME,
      p_lock_minutes: LOCK_MINUTES_BEFORE_START
    });
    if (mutationError) {
      if (mutationError.message.includes("prediction deadline passed")) {
        await trackEventServer(
          "prediction_blocked_deadline",
          { game_id: gameId, status: game.status, action: "submit" },
          userId
        );
      }
      return NextResponse.json(
        { error: toPredictionErrorMessage(mutationError.message) },
        { status: mapPredictionRpcStatus(mutationError.message) }
      );
    }

    const mutationRow = Array.isArray(mutationData)
      ? ((mutationData[0] as PredictionMutationRpcRow | undefined) ?? null)
      : null;
    if (!mutationRow) {
      return NextResponse.json({ error: "予想の保存に失敗しました。" }, { status: 500 });
    }

    const insertedRows = Array.isArray(mutationRow.allocations) ? mutationRow.allocations : [];

    await trackEventServer(
      "prediction_submit",
      {
        game_id: gameId,
        mode: normalized.mode,
        total_stake: totalStake,
        selections: normalized.allocations.length
      },
      userId
    );

    return NextResponse.json({
      prediction: {
        mode: normalized.mode,
        allocations: insertedRows,
        total_stake: mutationRow.total_stake
      },
      point_balance: mutationRow.point_balance
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "予想の保存に失敗しました。";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ gameId: string }> }
) {
  try {
    const { gameId } = await context.params;
    const userId = await getAuthUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: "ログインが必要です。" }, { status: 401 });
    }

    if (!(await checkRateLimit(`prediction:delete:${userId}`, 40, 60_000))) {
      return NextResponse.json({ error: "操作が多すぎます。少し時間をおいてから再試行してください。" }, { status: 429 });
    }

    const supabase = createServiceClient();
    const game = await loadGame(supabase, gameId);
    if (!game) {
      return NextResponse.json({ error: "試合が見つかりません。" }, { status: 404 });
    }

    if (isClosed(game)) {
      await trackEventServer(
        "prediction_blocked_deadline",
        { game_id: gameId, status: game.status, action: "delete" },
        userId
      );
      return NextResponse.json({ error: "予想受付は終了しました。" }, { status: 400 });
    }

    const { data: deleteData, error: deleteError } = await supabase.rpc("delete_prediction_bets_atomic", {
      p_user_id: userId,
      p_game_id: gameId,
      p_lock_minutes: LOCK_MINUTES_BEFORE_START
    });
    if (deleteError) {
      if (deleteError.message.includes("prediction deadline passed")) {
        await trackEventServer(
          "prediction_blocked_deadline",
          { game_id: gameId, status: game.status, action: "delete" },
          userId
        );
      }
      return NextResponse.json(
        { error: toPredictionErrorMessage(deleteError.message) },
        { status: mapPredictionRpcStatus(deleteError.message) }
      );
    }

    const deleteRow = Array.isArray(deleteData)
      ? ((deleteData[0] as PredictionDeleteRpcRow | undefined) ?? null)
      : null;
    if (!deleteRow) {
      return NextResponse.json({ error: "予想の取り消しに失敗しました。" }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      refunded: deleteRow.refunded,
      point_balance: deleteRow.point_balance
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "予想の取り消しに失敗しました。";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
