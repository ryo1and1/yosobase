import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthorized } from "@/lib/admin-auth";
import { validateAdminGameState } from "@/lib/admin-game-validation";
import { createServiceClient } from "@/lib/supabase";
import { getDateRangeJst, todayJst } from "@/lib/time";
import type { GameStatus, Side } from "@/lib/types";

export const dynamic = "force-dynamic";

type TeamRelation = { id: string; name: string }[] | { id: string; name: string } | null;

type GameRow = {
  id: string;
  season_year: number;
  start_at: string;
  stadium: string | null;
  status: GameStatus;
  winner: Side | null;
  score_home: number | null;
  score_away: number | null;
  home_team: TeamRelation;
  away_team: TeamRelation;
};

type CreateGameBody = {
  season_year?: number;
  start_at?: string;
  stadium?: string;
  home_team_id?: string;
  away_team_id?: string;
  status?: GameStatus;
  winner?: Side | null;
  score_home?: number | null;
  score_away?: number | null;
};

const STATUS_OPTIONS: readonly GameStatus[] = ["scheduled", "in_progress", "final", "canceled"];

function isStatus(value: unknown): value is GameStatus {
  return typeof value === "string" && STATUS_OPTIONS.includes(value as GameStatus);
}

function isSideOrNull(value: unknown): value is Side | null {
  return value === null || value === "home" || value === "draw" || value === "away";
}

function normalizeTeam(team: TeamRelation): { id: string; name: string } {
  if (Array.isArray(team)) {
    return team[0] ?? { id: "UNKNOWN", name: "Unknown" };
  }
  return team ?? { id: "UNKNOWN", name: "Unknown" };
}

function toAdminGame(row: GameRow) {
  return {
    id: row.id,
    season_year: row.season_year,
    start_at: row.start_at,
    stadium: row.stadium,
    status: row.status,
    winner: row.winner,
    score_home: row.score_home,
    score_away: row.score_away,
    home_team: normalizeTeam(row.home_team),
    away_team: normalizeTeam(row.away_team)
  };
}

export async function GET(request: NextRequest) {
  try {
    if (!isAdminAuthorized(request)) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const date = request.nextUrl.searchParams.get("date") ?? todayJst();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json({ error: "invalid date format. expected YYYY-MM-DD" }, { status: 400 });
    }

    const seasonYearText = request.nextUrl.searchParams.get("season_year");
    const seasonYear = seasonYearText ? Number.parseInt(seasonYearText, 10) : null;
    if (seasonYearText && Number.isNaN(seasonYear)) {
      return NextResponse.json({ error: "season_year must be number" }, { status: 400 });
    }

    const status = request.nextUrl.searchParams.get("status") ?? "all";
    if (status !== "all" && !isStatus(status)) {
      return NextResponse.json({ error: "status must be all/scheduled/in_progress/final/canceled" }, { status: 400 });
    }

    const { startIso, endIso } = getDateRangeJst(date);
    const supabase = createServiceClient();
    let query = supabase
      .from("games")
      .select(
        `
        id,
        season_year,
        start_at,
        stadium,
        status,
        winner,
        score_home,
        score_away,
        home_team:teams!games_home_team_id_fkey(id, name),
        away_team:teams!games_away_team_id_fkey(id, name)
      `
      )
      .gte("start_at", startIso)
      .lt("start_at", endIso)
      .order("start_at", { ascending: true });

    if (seasonYear !== null) {
      query = query.eq("season_year", seasonYear);
    }
    if (status !== "all") {
      query = query.eq("status", status);
    }

    const { data, error } = await query;
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const games = (data ?? []).map((row) => toAdminGame(row as GameRow));
    return NextResponse.json({ games });
  } catch (error) {
    const message = error instanceof Error ? error.message : "failed to fetch admin games";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!isAdminAuthorized(request)) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as CreateGameBody;
    if (!body.start_at || !body.home_team_id || !body.away_team_id) {
      return NextResponse.json({ error: "start_at, home_team_id, away_team_id are required" }, { status: 400 });
    }
    if (body.status && !isStatus(body.status)) {
      return NextResponse.json({ error: "status must be scheduled/in_progress/final/canceled" }, { status: 400 });
    }
    if (body.winner !== undefined && !isSideOrNull(body.winner)) {
      return NextResponse.json({ error: "winner must be home/draw/away/null" }, { status: 400 });
    }

    const startAt = new Date(body.start_at);
    if (Number.isNaN(startAt.getTime())) {
      return NextResponse.json({ error: "start_at must be valid ISO date-time" }, { status: 400 });
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

    const payload = {
      season_year: body.season_year ?? startAt.getUTCFullYear(),
      start_at: startAt.toISOString(),
      stadium: body.stadium ?? null,
      home_team_id: body.home_team_id,
      away_team_id: body.away_team_id,
      status: body.status ?? "scheduled",
      winner: body.winner ?? null,
      score_home: body.score_home ?? null,
      score_away: body.score_away ?? null
    };

    const stateError = validateAdminGameState({
      status: payload.status,
      winner: payload.winner,
      scoreHome: payload.score_home,
      scoreAway: payload.score_away,
      homeTeamId: payload.home_team_id,
      awayTeamId: payload.away_team_id
    });
    if (stateError) {
      return NextResponse.json({ error: stateError }, { status: 400 });
    }

    const supabase = createServiceClient();
    const { data, error } = await supabase.from("games").insert(payload).select("*").single();
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ game: data }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "failed to create game";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
