import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthorized } from "@/lib/admin-auth";
import { validateAdminGameState } from "@/lib/admin-game-validation";
import { createServiceClient } from "@/lib/supabase";
import type { GameStatus, Side } from "@/lib/types";

export const dynamic = "force-dynamic";

const STATUS_OPTIONS: readonly GameStatus[] = ["scheduled", "in_progress", "final", "canceled"];

function isStatus(value: unknown): value is GameStatus {
  return typeof value === "string" && STATUS_OPTIONS.includes(value as GameStatus);
}

function isSideOrNull(value: unknown): value is Side | null {
  return value === null || value === "home" || value === "draw" || value === "away";
}

type PatchGameBody = {
  season_year?: number;
  start_at?: string;
  stadium?: string | null;
  home_team_id?: string;
  away_team_id?: string;
  status?: GameStatus;
  winner?: Side | null;
  score_home?: number | null;
  score_away?: number | null;
};

type CurrentGameRow = {
  id: string;
  home_team_id: string;
  away_team_id: string;
  status: GameStatus;
  winner: Side | null;
  score_home: number | null;
  score_away: number | null;
};

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ gameId: string }> }
) {
  try {
    if (!isAdminAuthorized(request)) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const { gameId } = await context.params;
    const body = (await request.json()) as PatchGameBody;
    if (body.status !== undefined && !isStatus(body.status)) {
      return NextResponse.json({ error: "status must be scheduled/in_progress/final/canceled" }, { status: 400 });
    }
    if (body.winner !== undefined && !isSideOrNull(body.winner)) {
      return NextResponse.json({ error: "winner must be home/draw/away/null" }, { status: 400 });
    }
    if (body.season_year !== undefined && !Number.isInteger(body.season_year)) {
      return NextResponse.json({ error: "season_year must be integer" }, { status: 400 });
    }
    if (
      body.score_home !== undefined &&
      body.score_home !== null &&
      (!Number.isInteger(body.score_home) || body.score_home < 0)
    ) {
      return NextResponse.json({ error: "score_home must be integer >= 0 or null" }, { status: 400 });
    }
    if (
      body.score_away !== undefined &&
      body.score_away !== null &&
      (!Number.isInteger(body.score_away) || body.score_away < 0)
    ) {
      return NextResponse.json({ error: "score_away must be integer >= 0 or null" }, { status: 400 });
    }

    const supabase = createServiceClient();
    const { data: currentGame, error: currentError } = await supabase
      .from("games")
      .select("id, home_team_id, away_team_id, status, winner, score_home, score_away")
      .eq("id", gameId)
      .maybeSingle();

    if (currentError) {
      return NextResponse.json({ error: currentError.message }, { status: 500 });
    }
    if (!currentGame) {
      return NextResponse.json({ error: "game not found" }, { status: 404 });
    }

    const updates: PatchGameBody = { ...body };
    if (body.start_at !== undefined) {
      const startAt = new Date(body.start_at);
      if (Number.isNaN(startAt.getTime())) {
        return NextResponse.json({ error: "start_at must be valid ISO date-time" }, { status: 400 });
      }
      updates.start_at = startAt.toISOString();
    }

    const merged = {
      homeTeamId: body.home_team_id ?? (currentGame as CurrentGameRow).home_team_id,
      awayTeamId: body.away_team_id ?? (currentGame as CurrentGameRow).away_team_id,
      status: body.status ?? (currentGame as CurrentGameRow).status,
      winner: body.winner !== undefined ? body.winner : (currentGame as CurrentGameRow).winner,
      scoreHome: body.score_home !== undefined ? body.score_home : (currentGame as CurrentGameRow).score_home,
      scoreAway: body.score_away !== undefined ? body.score_away : (currentGame as CurrentGameRow).score_away
    };

    const stateError = validateAdminGameState(merged);
    if (stateError) {
      return NextResponse.json({ error: stateError }, { status: 400 });
    }

    const { data, error } = await supabase.from("games").update(updates).eq("id", gameId).select("*").maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ game: data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "failed to update game";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
