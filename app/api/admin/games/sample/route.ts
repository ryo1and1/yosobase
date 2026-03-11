import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthorized } from "@/lib/admin-auth";
import { createServiceClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

type TeamRow = { id: string; name: string };

export async function POST(request: NextRequest) {
  try {
    if (process.env.NODE_ENV !== "development") {
      return NextResponse.json({ error: "sample seeding is available only in development" }, { status: 403 });
    }
    if (!isAdminAuthorized(request)) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const supabase = createServiceClient();
    const { data: teams, error: teamError } = await supabase.from("teams").select("id, name").order("id", { ascending: true }).limit(6);
    if (teamError) {
      return NextResponse.json({ error: teamError.message }, { status: 500 });
    }
    if (!teams || teams.length < 6) {
      return NextResponse.json({ error: "at least 6 teams are required for sample games" }, { status: 400 });
    }

    const rows = buildSampleRows(teams as TeamRow[]);
    const { data: inserted, error: insertError } = await supabase
      .from("games")
      .insert(rows)
      .select("id, season_year, start_at, stadium, status, winner, home_team_id, away_team_id");

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      inserted_count: inserted?.length ?? 0,
      games: inserted ?? []
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "failed to insert sample games";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function buildSampleRows(teams: TeamRow[]) {
  const now = new Date();
  const pairs = [
    [teams[0], teams[1]],
    [teams[2], teams[3]],
    [teams[4], teams[5]]
  ] as const;

  return pairs.map(([home, away], index) => {
    const startAt = new Date(now.getTime() + (index * 90 + 30) * 60 * 1000);
    return {
      season_year: startAt.getUTCFullYear(),
      start_at: startAt.toISOString(),
      stadium: `Sample Park ${index + 1}`,
      home_team_id: home.id,
      away_team_id: away.id,
      status: "scheduled" as const,
      winner: null
    };
  });
}

