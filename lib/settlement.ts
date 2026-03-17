import { createServiceClient } from "@/lib/supabase";
import { computeOdds, defaultModeForBets, winningOptionsFromResult } from "@/lib/odds";
import { writeSyncLog } from "@/lib/sync-log";
import type { PredictionAllocation, Side } from "@/lib/types";

type FinalGame = {
  id: string;
  season_year: number;
  status: "final" | "canceled";
  winner: Side | null;
  score_home: number | null;
  score_away: number | null;
};

type PredictionBetRow = {
  id: string;
  game_id: string;
  user_id: string;
  option: PredictionAllocation["option"];
  stake_points: number;
};

export async function runSettlementBatch() {
  const startedAt = new Date();
  const supabase = createServiceClient();

  const totals = {
    gamesScanned: 0,
    predictionsScanned: 0,
    settlementsInserted: 0,
    conflictsSkipped: 0,
    userStatsUpdated: 0,
    errors: 0
  };

  try {
    const { data: games, error: gamesError } = await supabase.rpc("list_unsettled_resolved_games");

    if (gamesError) {
      throw new Error(gamesError.message);
    }

    totals.gamesScanned = games?.length ?? 0;

    for (const game of (games ?? []) as FinalGame[]) {
      const { data: bets, error: betError } = await supabase
        .from("prediction_bets")
        .select("id, game_id, user_id, option, stake_points")
        .eq("game_id", game.id)
        .limit(10000);

      if (betError) {
        totals.errors += 1;
        continue;
      }
      const rows = (bets as PredictionBetRow[] | null) ?? [];
      if (rows.length === 0) {
        continue;
      }

      const mode = defaultModeForBets(rows);
      const odds = computeOdds(mode, rows);
      const oddsByOption = new Map(odds.map((row) => [row.option, row.odds]));
      const winOptions = new Set(winningOptionsFromResult(game.winner, game.score_home, game.score_away));

      const byUser = new Map<string, PredictionBetRow[]>();
      rows.forEach((row) => {
        const current = byUser.get(row.user_id) ?? [];
        current.push(row);
        byUser.set(row.user_id, current);
      });
      totals.predictionsScanned += byUser.size;

      if (game.status === "canceled") {
        for (const [userId, userBets] of byUser.entries()) {
          const refundPoints = userBets.reduce((sum, row) => sum + row.stake_points, 0);

          const { data: applied, error: applyError } = await supabase.rpc("apply_canceled_refund_atomic", {
            p_game_id: game.id,
            p_user_id: userId,
            p_season_year: game.season_year,
            p_refund_points: refundPoints
          });

          if (applyError) {
            totals.errors += 1;
            continue;
          }

          if (!applied) {
            totals.conflictsSkipped += 1;
            continue;
          }

          totals.settlementsInserted += 1;
          totals.userStatsUpdated += 1;
        }

        continue;
      }

      if (!game.winner) continue;

      for (const [userId, userBets] of byUser.entries()) {
        const stakePoints = userBets.reduce((sum, row) => sum + row.stake_points, 0);
        let grossPayout = 0;
        userBets.forEach((row) => {
          if (!winOptions.has(row.option)) return;
          const odd = oddsByOption.get(row.option) ?? 0;
          grossPayout += Math.round(row.stake_points * odd);
        });
        const netProfit = grossPayout - stakePoints;
        const isCorrect = netProfit > 0;

        const { data: applied, error: applyError } = await supabase.rpc("apply_settlement_atomic", {
          p_game_id: game.id,
          p_user_id: userId,
          p_season_year: game.season_year,
          p_is_correct: isCorrect,
          p_stake_points: stakePoints,
          p_points_delta: netProfit
        });

        if (applyError) {
          totals.errors += 1;
          continue;
        }

        if (!applied) {
          totals.conflictsSkipped += 1;
          continue;
        }

        totals.settlementsInserted += 1;
        totals.userStatsUpdated += 1;
      }
    }

    await writeSyncLog({
      source: "settle",
      startedAt,
      finishedAt: new Date(),
      ok: true,
      summary: {
        games_scanned: totals.gamesScanned,
        predictions_scanned: totals.predictionsScanned,
        settlements_inserted: totals.settlementsInserted,
        conflicts_skipped: totals.conflictsSkipped,
        user_stats_updates: totals.userStatsUpdated,
        errors: totals.errors
      }
    }).catch((error) => {
      console.error("failed to write settle sync log", error);
    });
  } catch (error) {
    await writeSyncLog({
      source: "settle",
      startedAt,
      finishedAt: new Date(),
      ok: false,
      summary: {
        games_scanned: totals.gamesScanned,
        predictions_scanned: totals.predictionsScanned,
        settlements_inserted: totals.settlementsInserted,
        conflicts_skipped: totals.conflictsSkipped,
        user_stats_updates: totals.userStatsUpdated,
        errors: totals.errors
      },
      error: error instanceof Error ? error.message : "failed to run settlement"
    }).catch((writeError) => {
      console.error("failed to write settle error log", writeError);
    });
    throw error;
  }

  return totals;
}
