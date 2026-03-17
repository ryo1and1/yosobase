import { createServiceClient } from "@/lib/supabase";
import { computeOdds, computePublicShareSummaryByMode, defaultModeForBets, optionLabel, optionToBroadSide } from "@/lib/odds";
import { publicUserCodeFromId } from "@/lib/public-user-code";
import { currentJstYear, getDateRangeJst, todayJst } from "@/lib/time";
import type {
  GameStatus,
  GameListItem,
  GameWithTeams,
  MeHistoryItem,
  PredictionAllocation,
  PredictionMode,
  RankingItem,
  RankingPeriod,
  Side
} from "@/lib/types";

type GameRow = {
  id: string;
  season_year: number;
  start_at: string;
  stadium: string | null;
  status: string;
  winner: Side | null;
  score_home: number | null;
  score_away: number | null;
  home_team: { id: string; name: string }[] | { id: string; name: string } | null;
  away_team: { id: string; name: string }[] | { id: string; name: string } | null;
};

type PredictionBetRow = {
  game_id: string;
  user_id?: string;
  option: PredictionAllocation["option"];
  stake_points: number;
};

type SettlementRow = {
  game_id: string;
  user_id: string;
  points_delta: number;
  is_correct: boolean;
  settled_at: string;
};

type SettlementByGameRow = {
  game_id: string;
  points_delta: number;
};

type SettlementHistoryRow = {
  game_id: string;
  user_id: string;
  points_delta: number;
  stake_points: number;
  settled_at: string;
};

type SeasonStatRow = {
  user_id: string;
  points_total: number | null;
  predictions_total: number | null;
  correct_total: number | null;
};

type GameStatusRow = {
  id: string;
  status: string;
};

type UserIdentity = {
  display_name: string;
  public_code: string;
};

function normalizeTeam(team: GameRow["home_team"]): { id: string; name: string } {
  if (Array.isArray(team)) {
    return team[0] ?? { id: "UNKNOWN", name: "未設定" };
  }
  return team ?? { id: "UNKNOWN", name: "未設定" };
}

function mapGame(row: GameRow): GameWithTeams {
  return {
    id: row.id,
    season_year: row.season_year,
    start_at: row.start_at,
    stadium: row.stadium,
    status: row.status as GameWithTeams["status"],
    winner: row.winner,
    score_home: row.score_home,
    score_away: row.score_away,
    home_team: normalizeTeam(row.home_team),
    away_team: normalizeTeam(row.away_team)
  };
}

async function fetchGameStatusMap(
  supabase: ReturnType<typeof createServiceClient>,
  gameIds: string[]
): Promise<Map<string, GameStatus>> {
  const uniqueIds = Array.from(new Set(gameIds));
  if (uniqueIds.length === 0) {
    return new Map();
  }

  const { data, error } = await supabase.from("games").select("id, status").in("id", uniqueIds);
  if (error) {
    throw new Error(`Failed to fetch game statuses: ${error.message}`);
  }

  const statusMap = new Map<string, GameStatus>();
  (data as GameStatusRow[] | null)?.forEach((row) => {
    statusMap.set(row.id, row.status as GameStatus);
  });
  return statusMap;
}

export async function fetchGamesByDate(dateText: string, viewerUserId: string | null): Promise<GameListItem[]> {
  const supabase = createServiceClient();
  const { startIso, endIso } = getDateRangeJst(dateText);

  const { data, error } = await supabase
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

  if (error) {
    throw new Error(`Failed to fetch games: ${error.message}`);
  }

  const games = (data ?? []).map((row) => mapGame(row as GameRow));

  if (!viewerUserId || games.length === 0) {
    return games.map((game) => ({
      ...game,
      user_prediction: null as Side | null,
      user_settlement_points: null as number | null,
      user_has_prediction: false
    }));
  }

  const gameIds = games.map((game) => game.id);
  const [predictionsRes, settlementsRes] = await Promise.all([
    supabase.from("prediction_bets").select("game_id, option, stake_points").eq("user_id", viewerUserId).in("game_id", gameIds),
    supabase.from("settlements").select("game_id, points_delta").eq("user_id", viewerUserId).in("game_id", gameIds)
  ]);

  if (predictionsRes.error) {
    throw new Error(`Failed to fetch predictions: ${predictionsRes.error.message}`);
  }
  if (settlementsRes.error) {
    throw new Error(`Failed to fetch settlements: ${settlementsRes.error.message}`);
  }

  const picks = new Map<string, PredictionBetRow[]>();
  (predictionsRes.data as PredictionBetRow[] | null)?.forEach((prediction) => {
    const current = picks.get(prediction.game_id) ?? [];
    current.push(prediction);
    picks.set(prediction.game_id, current);
  });

  const settledPoints = new Map<string, number>();
  (settlementsRes.data as SettlementByGameRow[] | null)?.forEach((settlement) => {
    settledPoints.set(settlement.game_id, settlement.points_delta);
  });

  return games.map((game) => ({
    ...game,
    user_prediction: (() => {
      const rows = picks.get(game.id) ?? [];
      if (rows.length === 0) return null;
      const top = [...rows].sort((a, b) => b.stake_points - a.stake_points)[0];
      return optionToBroadSide(top.option);
    })(),
    user_settlement_points: settledPoints.get(game.id) ?? null,
    user_has_prediction: (picks.get(game.id)?.length ?? 0) > 0
  }));
}

export async function fetchGameDetail(gameId: string, viewerUserId: string | null) {
  const supabase = createServiceClient();
  const { data, error } = await supabase
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
    .eq("id", gameId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to fetch game: ${error.message}`);
  }
  if (!data) {
    return null;
  }

  const game = mapGame(data as GameRow);
  const { data: allBetRows, error: allBetError } = await supabase
    .from("prediction_bets")
    .select("game_id, user_id, option, stake_points")
    .eq("game_id", game.id);

  if (allBetError) {
    throw new Error(`Failed to fetch bets: ${allBetError.message}`);
  }

  const allBets = (allBetRows as PredictionBetRow[] | null) ?? [];
  const mode: PredictionMode = defaultModeForBets(allBets);
  const odds = computeOdds(mode, allBets);
  const publicShareByMode = computePublicShareSummaryByMode(allBets);

  if (!viewerUserId) {
    return {
      game,
      mode,
      odds,
      publicShareByMode,
      user_prediction: null as Side | null,
      user_bets: [] as PredictionAllocation[],
      point_balance: null as number | null,
      settlement: null as { points_delta: number } | null
    };
  }

  const [predictionRes, settlementRes, userRes] = await Promise.all([
    supabase
      .from("prediction_bets")
      .select("option, stake_points")
      .eq("game_id", game.id)
      .eq("user_id", viewerUserId)
      .order("option", { ascending: true }),
    supabase
      .from("settlements")
      .select("points_delta")
      .eq("game_id", game.id)
      .eq("user_id", viewerUserId)
      .maybeSingle(),
    supabase.from("users").select("point_balance").eq("id", viewerUserId).maybeSingle()
  ]);

  if (predictionRes.error) {
    throw new Error(`Failed to fetch prediction bets: ${predictionRes.error.message}`);
  }
  if (settlementRes.error) {
    throw new Error(`Failed to fetch settlement: ${settlementRes.error.message}`);
  }
  if (userRes.error) {
    throw new Error(`Failed to fetch point balance: ${userRes.error.message}`);
  }

  const userBets = ((predictionRes.data as PredictionBetRow[] | null) ?? []).map((row) => ({
    option: row.option,
    stake_points: row.stake_points
  }));

  const userPrediction = (() => {
    if (userBets.length === 0) return null;
    const top = [...userBets].sort((a, b) => b.stake_points - a.stake_points)[0];
    return optionToBroadSide(top.option);
  })();

  return {
    game,
    mode,
    odds,
    publicShareByMode,
    user_prediction: userPrediction,
    user_bets: userBets,
    point_balance: (userRes.data?.point_balance as number | undefined) ?? 0,
    settlement: settlementRes.data
  };
}

function parseYmd(dateText: string): { year: number; month: number; day: number } {
  const [yearText, monthText, dayText] = dateText.split("-");
  return {
    year: Number.parseInt(yearText, 10),
    month: Number.parseInt(monthText, 10),
    day: Number.parseInt(dayText, 10)
  };
}

function formatYmd(date: Date): string {
  const year = date.getUTCFullYear();
  const month = `${date.getUTCMonth() + 1}`.padStart(2, "0");
  const day = `${date.getUTCDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDaysYmd(dateText: string, days: number): string {
  const { year, month, day } = parseYmd(dateText);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + days);
  return formatYmd(date);
}

function normalizeDateRangeForPeriod(period: RankingPeriod, date?: string, endDate?: string): {
  fromIso: string;
  toIso: string;
} {
  if (period === "season") {
    return { fromIso: "1900-01-01T00:00:00.000Z", toIso: "2100-01-01T00:00:00.000Z" };
  }

  if (period === "daily") {
    const target = date ?? todayJst();
    const range = getDateRangeJst(target);
    return { fromIso: range.startIso, toIso: range.endIso };
  }

  if (period === "monthly") {
    const targetDate = date ?? endDate ?? todayJst();
    const { year, month } = parseYmd(targetDate);
    const fromIso = new Date(`${year}-${String(month).padStart(2, "0")}-01T00:00:00+09:00`).toISOString();
    const nextMonth = month === 12 ? { y: year + 1, m: 1 } : { y: year, m: month + 1 };
    const toIso = new Date(`${nextMonth.y}-${String(nextMonth.m).padStart(2, "0")}-01T00:00:00+09:00`).toISOString();
    return { fromIso, toIso };
  }

  const targetDate = endDate ?? date ?? todayJst();
  const { year, month, day } = parseYmd(targetDate);
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  const daysSinceMonday = (weekday + 6) % 7;
  const weekStartDate = addDaysYmd(targetDate, -daysSinceMonday);
  const weekEndDate = addDaysYmd(weekStartDate, 7);
  const weekRange = getDateRangeJst(weekStartDate);
  return {
    fromIso: weekRange.startIso,
    toIso: new Date(`${weekEndDate}T00:00:00+09:00`).toISOString()
  };
}

function buildRankingItems(stats: Map<string, { points: number; predictions: number; correct: number }>, names: Map<string, UserIdentity>) {
  const sorted = Array.from(stats.entries())
    .map(([userId, value]) => ({
      user_id: userId,
      display_name: names.get(userId)?.display_name ?? "ユーザー",
      public_code: names.get(userId)?.public_code ?? publicUserCodeFromId(userId),
      points: value.points,
      predictions: value.predictions,
      correct: value.correct,
      hit_rate: value.predictions > 0 ? value.correct / value.predictions : 0
    }))
    .sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.hit_rate !== a.hit_rate) return b.hit_rate - a.hit_rate;
      if (b.predictions !== a.predictions) return b.predictions - a.predictions;
      return a.user_id.localeCompare(b.user_id);
    });

  return sorted.map((row, index) => ({
    ...row,
    rank: index + 1
  }));
}

async function fetchSeasonStatRows(seasonYear: number): Promise<SeasonStatRow[]> {
  const supabase = createServiceClient();
  const rows: SeasonStatRow[] = [];
  const pageSize = 1000;
  let offset = 0;

  while (true) {
    const { data, error } = await supabase
      .from("user_stats")
      .select("user_id, points_total, predictions_total, correct_total")
      .eq("season_year", seasonYear)
      .range(offset, offset + pageSize - 1);

    if (error) {
      throw new Error(`Failed to fetch user_stats: ${error.message}`);
    }

    const batch = (data ?? []) as SeasonStatRow[];
    rows.push(...batch);

    if (batch.length < pageSize) {
      break;
    }
    offset += pageSize;
  }

  return rows;
}

function applyDisplayNames(items: RankingItem[], names: Map<string, UserIdentity>): RankingItem[] {
  return items.map((item) => ({
    ...item,
    display_name: names.get(item.user_id)?.display_name ?? item.display_name,
    public_code: names.get(item.user_id)?.public_code ?? item.public_code
  }));
}

export async function fetchRanking(
  period: RankingPeriod,
  options: {
    date?: string;
    endDate?: string;
    seasonYear?: number;
    limit: number;
    viewerUserId: string | null;
  }
): Promise<{ items: RankingItem[]; me: RankingItem | null; total: number }> {
  const supabase = createServiceClient();

  let items: RankingItem[] = [];
  let me: RankingItem | null = null;
  let total = 0;

  if (period === "season") {
    const seasonYear = options.seasonYear ?? currentJstYear();
    const rows = await fetchSeasonStatRows(seasonYear);
    const stats = new Map<string, { points: number; predictions: number; correct: number }>();

    rows.forEach((row) => {
      stats.set(row.user_id, {
        points: row.points_total ?? 0,
        predictions: row.predictions_total ?? 0,
        correct: row.correct_total ?? 0
      });
    });

    const ranked = buildRankingItems(stats, new Map<string, UserIdentity>());
    total = ranked.length;
    const topItems = ranked.slice(0, options.limit);
    const meCandidate = options.viewerUserId ? ranked.find((item) => item.user_id === options.viewerUserId) ?? null : null;
    const displayIds = Array.from(
      new Set([...topItems.map((item) => item.user_id), ...(meCandidate ? [meCandidate.user_id] : [])])
    );
    const nameMap = await fetchDisplayNames(displayIds);

    items = applyDisplayNames(topItems, nameMap);
    me = meCandidate ? applyDisplayNames([meCandidate], nameMap)[0] : null;
  } else {
    const range = normalizeDateRangeForPeriod(period, options.date, options.endDate);
    const { data, error } = await supabase
      .from("settlements")
      .select("game_id, user_id, points_delta, is_correct, settled_at")
      .gte("settled_at", range.fromIso)
      .lt("settled_at", range.toIso)
      .order("settled_at", { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch settlements: ${error.message}`);
    }

    const settlementRows = (data as SettlementRow[] | null) ?? [];
    const gameStatusMap = await fetchGameStatusMap(
      supabase,
      settlementRows.map((row) => row.game_id)
    );
    const scoredRows = settlementRows.filter((row) => gameStatusMap.get(row.game_id) !== "canceled");

    const stats = new Map<string, { points: number; predictions: number; correct: number }>();
    const streak = new Map<string, { current: number; blocked: boolean }>();
    scoredRows.forEach((row) => {
      const current = stats.get(row.user_id) ?? { points: 0, predictions: 0, correct: 0 };
      current.points += row.points_delta;
      current.predictions += 1;
      if (row.is_correct) {
        current.correct += 1;
      }
      stats.set(row.user_id, current);

      const streakState = streak.get(row.user_id) ?? { current: 0, blocked: false };
      if (!streakState.blocked) {
        if (row.is_correct) {
          streakState.current += 1;
        } else {
          streakState.blocked = true;
        }
      }
      streak.set(row.user_id, streakState);
    });

    const nameMap = await fetchDisplayNames(Array.from(stats.keys()));
    items = buildRankingItems(stats, nameMap).map((row) => ({
      ...row,
      current_streak: streak.get(row.user_id)?.current ?? 0
    }));
    total = items.length;
    me = options.viewerUserId ? items.find((item) => item.user_id === options.viewerUserId) ?? null : null;
  }

  return {
    items: items.slice(0, options.limit),
    me,
    total
  };
}

async function fetchDisplayNames(userIds: string[]): Promise<Map<string, UserIdentity>> {
  if (userIds.length === 0) {
    return new Map<string, UserIdentity>();
  }
  const supabase = createServiceClient();
  const { data, error } = await supabase.from("users").select("id, display_name").in("id", userIds);
  if (error) {
    throw new Error(`Failed to fetch user names: ${error.message}`);
  }
  const result = new Map<string, UserIdentity>();
  (data ?? []).forEach((row) => {
    result.set(row.id, {
      display_name: row.display_name,
      public_code: publicUserCodeFromId(row.id)
    });
  });
  return result;
}

export async function fetchPointBalance(userId: string): Promise<number> {
  const supabase = createServiceClient();
  const { data, error } = await supabase.from("users").select("point_balance").eq("id", userId).maybeSingle();
  if (error) {
    throw new Error(`Failed to fetch point balance: ${error.message}`);
  }
  return (data?.point_balance as number | undefined) ?? 0;
}

export async function fetchHeaderAccount(userId: string): Promise<{ pointBalance: number; displayName: string | null }> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("users")
    .select("point_balance, display_name")
    .eq("id", userId)
    .maybeSingle();
  if (error) {
    throw new Error(`Failed to fetch header account: ${error.message}`);
  }
  return {
    pointBalance: (data?.point_balance as number | undefined) ?? 0,
    displayName: (data?.display_name as string | undefined) ?? null
  };
}

export async function fetchMeSummary(userId: string, seasonYear: number) {
  const supabase = createServiceClient();
  const [statsRes, recentRes, userRes] = await Promise.all([
    supabase
      .from("user_stats")
      .select("points_total, predictions_total, correct_total")
      .eq("user_id", userId)
      .eq("season_year", seasonYear)
      .maybeSingle(),
    supabase
      .from("settlements")
      .select("game_id, is_correct, points_delta, settled_at")
      .eq("user_id", userId)
      .order("settled_at", { ascending: false })
      .limit(50),
    supabase.from("users").select("point_balance").eq("id", userId).maybeSingle()
  ]);

  if (statsRes.error) {
    throw new Error(`Failed to fetch user stats: ${statsRes.error.message}`);
  }
  if (recentRes.error) {
    throw new Error(`Failed to fetch recent settlements: ${recentRes.error.message}`);
  }
  if (userRes.error) {
    throw new Error(`Failed to fetch point balance: ${userRes.error.message}`);
  }

  const points = statsRes.data?.points_total ?? 0;
  const predictions = statsRes.data?.predictions_total ?? 0;
  const correct = statsRes.data?.correct_total ?? 0;
  const hitRate = predictions > 0 ? correct / predictions : 0;

  const recent = (recentRes.data as SettlementRow[] | null) ?? [];
  const recentStatusMap = await fetchGameStatusMap(
    supabase,
    recent.map((item) => item.game_id)
  );
  const scoredRecent = recent.filter((item) => recentStatusMap.get(item.game_id) !== "canceled");
  const recentWin = scoredRecent.filter((item) => item.is_correct).length;
  const recentLose = scoredRecent.length - recentWin;
  const recentPoints = scoredRecent.reduce((sum, item) => sum + (item.points_delta ?? 0), 0);
  let currentStreak = 0;
  for (const item of scoredRecent) {
    if (item.is_correct) {
      currentStreak += 1;
      continue;
    }
    break;
  }

  return {
    balance: (userRes.data?.point_balance as number | undefined) ?? 0,
    points,
    predictions,
    correct,
    hitRate,
    recentWin,
    recentLose,
    recentPoints,
    currentStreak
  };
}

export async function fetchMeHistory(userId: string, limit: number): Promise<MeHistoryItem[]> {
  const supabase = createServiceClient();
  const { data: settlements, error: settlementError } = await supabase
    .from("settlements")
    .select("game_id, user_id, points_delta, stake_points, settled_at")
    .eq("user_id", userId)
    .order("settled_at", { ascending: false })
    .limit(limit);

  if (settlementError) {
    throw new Error(`Failed to fetch settlements: ${settlementError.message}`);
  }
  if (!settlements || settlements.length === 0) {
    return [];
  }

  const gameIds = settlements.map((row) => row.game_id);

  const [betsRes, gamesRes] = await Promise.all([
    supabase
      .from("prediction_bets")
      .select("game_id, user_id, option, stake_points")
      .eq("user_id", userId)
      .in("game_id", gameIds),
    supabase
      .from("games")
      .select(
        `
        id,
        status,
        winner,
        home_team:teams!games_home_team_id_fkey(name),
        away_team:teams!games_away_team_id_fkey(name)
      `
      )
      .in("id", gameIds)
  ]);

  if (betsRes.error) {
    throw new Error(`Failed to fetch prediction bet rows: ${betsRes.error.message}`);
  }
  if (gamesRes.error) {
    throw new Error(`Failed to fetch game rows: ${gamesRes.error.message}`);
  }

  const pickMap = new Map<string, string>();
  ((betsRes.data as PredictionBetRow[] | null) ?? []).forEach((row) => {
    const current = pickMap.get(row.game_id) ?? "";
    const label = `${optionLabel(row.option)} ${row.stake_points}pt`;
    pickMap.set(row.game_id, current ? `${current} / ${label}` : label);
  });

  const gameMap = new Map<
    string,
    { status: GameStatus; winner: Side | null; home: string; away: string }
  >();
  (gamesRes.data as GameRow[] | null)?.forEach((row) => {
    const home = normalizeTeam(row.home_team).name;
    const away = normalizeTeam(row.away_team).name;
    gameMap.set(row.id, {
      status: row.status as GameStatus,
      winner: row.winner,
      home,
      away
    });
  });

  return (settlements as SettlementHistoryRow[]).map((settlement) => {
    const game = gameMap.get(settlement.game_id);
    return {
      settled_at: settlement.settled_at,
      game_id: settlement.game_id,
      home_team_name: game?.home ?? "未設定",
      away_team_name: game?.away ?? "未設定",
      pick_summary: pickMap.get(settlement.game_id) ?? "未予想",
      status: game?.status ?? "final",
      winner: game?.winner ?? null,
      points_delta: settlement.points_delta,
      stake_points: settlement.stake_points
    };
  });
}

