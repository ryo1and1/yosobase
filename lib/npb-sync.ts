import { load } from "cheerio";
import { createServiceClient } from "@/lib/supabase";
import { writeSyncLog } from "@/lib/sync-log";
import type { GameStatus, Side } from "@/lib/types";

type TeamId =
  | "GIANTS"
  | "TIGERS"
  | "BAYSTARS"
  | "CARP"
  | "SWALLOWS"
  | "DRAGONS"
  | "HAWKS"
  | "FIGHTERS"
  | "MARINES"
  | "EAGLES"
  | "LIONS"
  | "BUFFALOES";

type ScheduleGame = {
  date: string;
  homeTeamId: TeamId;
  awayTeamId: TeamId;
  startAt: string;
  startTime: string | null;
  stadium: string | null;
  status: GameStatus;
  winner: Side | null;
  scoreHome: number | null;
  scoreAway: number | null;
  externalSource: "npb";
  externalGameKey: string;
};

type ResultGame = {
  date: string;
  homeTeamId: TeamId;
  awayTeamId: TeamId;
  status: "final" | "scheduled";
  winner: Side | null;
  scoreHome: number | null;
  scoreAway: number | null;
  scoreText: string;
};

type DbGameRow = {
  id: string;
  season_year: number;
  start_at: string;
  stadium: string | null;
  status: GameStatus;
  winner: Side | null;
  score_home: number | null;
  score_away: number | null;
  home_team_id: TeamId;
  away_team_id: TeamId;
  external_source: string | null;
  external_game_key: string | null;
};

export type NpbSyncMode = "full" | "results_only";

export type NpbMonthlySyncInput = {
  year: number;
  month: number;
  mode?: NpbSyncMode;
};

export type NpbMonthlySyncResult = {
  year: number;
  month: number;
  mode: NpbSyncMode;
  source: {
    scheduleUrl: string;
    resultsUrl: string;
  };
  fetched: {
    scheduleGames: number;
    resultGames: number;
  };
  db: {
    created: number;
    updated: number;
    finalized: number;
    unchanged: number;
  };
  unresolvedResults: {
    date: string;
    home: string;
    away: string;
    score: string;
  }[];
  warnings: string[];
};

const JST = "Asia/Tokyo";
const NPB_SOURCE = "npb";
const DEFAULT_START_TIME = "18:00";
const UNKNOWN_STADIUM_KEY = "nostadium";

const TEAM_NAME_MAP: Record<string, TeamId> = {
  巨人: "GIANTS",
  読売: "GIANTS",
  読売ジャイアンツ: "GIANTS",
  ジャイアンツ: "GIANTS",
  巨: "GIANTS",
  阪神: "TIGERS",
  タイガース: "TIGERS",
  神: "TIGERS",
  deNA: "BAYSTARS",
  DeNA: "BAYSTARS",
  ＤｅＮＡ: "BAYSTARS",
  横浜DeNA: "BAYSTARS",
  横浜ＤｅＮＡ: "BAYSTARS",
  横浜: "BAYSTARS",
  ベイスターズ: "BAYSTARS",
  デ: "BAYSTARS",
  ヤクルト: "SWALLOWS",
  スワローズ: "SWALLOWS",
  ヤ: "SWALLOWS",
  広島: "CARP",
  カープ: "CARP",
  広: "CARP",
  中日: "DRAGONS",
  ドラゴンズ: "DRAGONS",
  中: "DRAGONS",
  ソフトバンク: "HAWKS",
  ソフトＢ: "HAWKS",
  ホークス: "HAWKS",
  ソ: "HAWKS",
  日本ハム: "FIGHTERS",
  日ハム: "FIGHTERS",
  ファイターズ: "FIGHTERS",
  日: "FIGHTERS",
  ロッテ: "MARINES",
  マリーンズ: "MARINES",
  ロ: "MARINES",
  楽天: "EAGLES",
  イーグルス: "EAGLES",
  楽: "EAGLES",
  西武: "LIONS",
  ライオンズ: "LIONS",
  西: "LIONS",
  オリックス: "BUFFALOES",
  バファローズ: "BUFFALOES",
  オ: "BUFFALOES"
};

function two(value: number): string {
  return value.toString().padStart(2, "0");
}

function toDateKey(year: number, month: number, day: number): string {
  return `${year}-${two(month)}-${two(day)}`;
}

function normalizeText(input: string): string {
  return input
    .normalize("NFKC")
    .replace(/\u00a0/g, " ")
    .replace(/\u3000/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeTeamName(input: string): string {
  return normalizeText(input).replace(/\s+/g, "");
}

function normalizeStadiumName(input: string): string {
  return normalizeText(input).replace(/\s+/g, "");
}

function toTeamId(input: string): TeamId | null {
  const normalized = normalizeTeamName(input);
  return TEAM_NAME_MAP[normalized] ?? null;
}

function parseMonthDay(text: string): { month: number; day: number } | null {
  const matched = text.match(/(\d{1,2})\s*\/\s*(\d{1,2})/);
  if (!matched) return null;
  const month = Number.parseInt(matched[1], 10);
  const day = Number.parseInt(matched[2], 10);
  if (!Number.isInteger(month) || !Number.isInteger(day)) return null;
  return { month, day };
}

function parseTime(text: string): string | null {
  const matched = normalizeText(text).match(/^(\d{1,2}):(\d{2})$/);
  if (!matched) return null;
  return `${matched[1].padStart(2, "0")}:${matched[2]}`;
}

function parseNumericScore(text: string): number | null {
  const normalized = normalizeText(text);
  if (!/^\d+$/.test(normalized)) return null;
  return Number.parseInt(normalized, 10);
}

function toIsoJst(date: string, time: string | null): string {
  const hhmm = time ?? DEFAULT_START_TIME;
  return new Date(`${date}T${hhmm}:00+09:00`).toISOString();
}

function toJstDate(iso: string): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: JST }).format(new Date(iso));
}

function toJstTime(iso: string): string {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: JST,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(new Date(iso));
}

function buildLegacyKey(date: string, homeTeamId: TeamId, awayTeamId: TeamId): string {
  return `${date}:${homeTeamId}:${awayTeamId}`;
}

function toExternalTimeKey(time: string | null): string {
  return (time ?? DEFAULT_START_TIME).replace(":", "");
}

function buildExternalGameKey(
  date: string,
  homeTeamId: TeamId,
  awayTeamId: TeamId,
  time: string | null,
  stadium: string | null
): string {
  const stadiumKey = normalizeStadiumName(stadium ?? "") || UNKNOWN_STADIUM_KEY;
  return `${date}_${homeTeamId}_${awayTeamId}_${toExternalTimeKey(time)}_${stadiumKey}`;
}

function isShiftJisHtml(text: string): boolean {
  return /charset\s*=\s*["']?\s*shift[_-]?jis/i.test(text);
}

async function fetchHtml(url: string): Promise<string> {
  const response = await fetch(url, {
    method: "GET",
    headers: {
      "user-agent": "YosoBase/1.0 (+https://example.local)"
    },
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`);
  }

  const raw = new Uint8Array(await response.arrayBuffer());
  const utf8 = new TextDecoder("utf-8").decode(raw);
  if (isShiftJisHtml(utf8)) {
    return new TextDecoder("shift-jis").decode(raw);
  }
  return utf8;
}

function inferScheduleState(
  stateText: string,
  commentText: string,
  score1: number | null,
  score2: number | null
): { status: GameStatus; winner: Side | null } {
  const state = normalizeText(stateText);
  const comment = normalizeText(commentText);
  const combined = `${state} ${comment}`;

  if (/中止/.test(combined)) {
    return { status: "canceled", winner: null };
  }

  if (score1 !== null && score2 !== null) {
    if (score1 > score2) return { status: "final", winner: "home" };
    if (score2 > score1) return { status: "final", winner: "away" };
    return { status: "final", winner: "draw" };
  }

  if (state && state !== "-") {
    return { status: "in_progress", winner: null };
  }

  return { status: "scheduled", winner: null };
}

function parseScheduleHtml(html: string, year: number, warnings: string[]): ScheduleGame[] {
  const $ = load(html);
  const games: ScheduleGame[] = [];
  let currentDate: { month: number; day: number } | null = null;

  $("table tbody tr").each((_, element) => {
    const row = $(element);

    const dateCell = row.children("th").first();
    if (dateCell.length > 0) {
      const parsed = parseMonthDay(dateCell.text());
      if (parsed) currentDate = parsed;
    }

    if (!currentDate) return;

    const cells = row.children("td");
    if (cells.length < 2) return;

    const matchCell = cells.eq(0);
    const infoCell = cells.eq(1);
    const commentCell = cells.eq(2);

    const homeRaw = normalizeText(matchCell.find(".team1").first().text());
    const awayRaw = normalizeText(matchCell.find(".team2").first().text());
    if (!homeRaw || !awayRaw) return;

    const homeTeamId = toTeamId(homeRaw);
    const awayTeamId = toTeamId(awayRaw);
    if (!homeTeamId || !awayTeamId) {
      warnings.push(`team_unmapped(schedule): ${homeRaw} vs ${awayRaw}`);
      return;
    }

    const date = toDateKey(year, currentDate.month, currentDate.day);
    const time = parseTime(infoCell.find(".time").first().text());
    const stadiumText = normalizeText(infoCell.find(".place").first().text());
    const stadium = stadiumText ? normalizeStadiumName(stadiumText) : null;

    const score1 = parseNumericScore(matchCell.find(".score1").first().text());
    const score2 = parseNumericScore(matchCell.find(".score2").first().text());
    const stateText = matchCell.find(".state").first().text();
    const commentText = commentCell.find(".comment").first().text();
    const inferred = inferScheduleState(stateText, commentText, score1, score2);

    games.push({
      date,
      homeTeamId,
      awayTeamId,
      startAt: toIsoJst(date, time),
      startTime: time,
      stadium,
      status: inferred.status,
      winner: inferred.winner,
      scoreHome: score1,
      scoreAway: score2,
      externalSource: NPB_SOURCE,
      externalGameKey: buildExternalGameKey(date, homeTeamId, awayTeamId, time, stadium)
    });
  });

  return games;
}

function parseResultAnchorText(text: string): { home: string; away: string; homeScore: string; awayScore: string } | null {
  const normalized = normalizeText(text);
  const matched = normalized.match(/^(\S+)\s+(\*|\d+)\s*-\s*(\*|\d+)\s+(\S+)$/);
  if (!matched) return null;
  return {
    home: matched[1],
    homeScore: matched[2],
    awayScore: matched[3],
    away: matched[4]
  };
}

function parseResultsHtml(html: string, warnings: string[]): ResultGame[] {
  const $ = load(html);
  const rows: ResultGame[] = [];
  const seen = new Set<string>();

  $("a[href*='/bis/'][href*='/games/s']").each((_, element) => {
    const anchor = $(element);
    const href = anchor.attr("href") ?? "";
    const idMatch = href.match(/\/s(\d{8}\d+)\.html$/);
    if (!idMatch) return;

    const gameCode = idMatch[1];
    if (seen.has(gameCode)) return;
    seen.add(gameCode);

    const dateMatch = gameCode.match(/^(\d{4})(\d{2})(\d{2})/);
    if (!dateMatch) return;
    const date = `${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}`;

    const parsed = parseResultAnchorText(anchor.text());
    if (!parsed) return;

    const homeTeamId = toTeamId(parsed.home);
    const awayTeamId = toTeamId(parsed.away);
    if (!homeTeamId || !awayTeamId) {
      warnings.push(`team_unmapped(result): ${parsed.home} vs ${parsed.away}`);
      return;
    }

    const homeScore = parseNumericScore(parsed.homeScore);
    const awayScore = parseNumericScore(parsed.awayScore);

    if (homeScore === null || awayScore === null) {
      rows.push({
        date,
        homeTeamId,
        awayTeamId,
        status: "scheduled",
        winner: null,
        scoreHome: homeScore,
        scoreAway: awayScore,
        scoreText: `${parsed.homeScore}-${parsed.awayScore}`
      });
      return;
    }

    let winner: Side | null = null;
    if (homeScore > awayScore) winner = "home";
    if (awayScore > homeScore) winner = "away";
    if (homeScore === awayScore) winner = "draw";

    rows.push({
      date,
      homeTeamId,
      awayTeamId,
      status: "final",
      winner,
      scoreHome: homeScore,
      scoreAway: awayScore,
      scoreText: `${homeScore}-${awayScore}`
    });
  });

  return rows;
}

type GameMaps = {
  byExternal: Map<string, DbGameRow[]>;
  byLegacy: Map<string, DbGameRow[]>;
};

function pushMapRow(map: Map<string, DbGameRow[]>, key: string, row: DbGameRow): void {
  const current = map.get(key) ?? [];
  if (current.some((item) => item.id === row.id)) return;
  current.push(row);
  map.set(key, current);
}

function buildGameMaps(rows: DbGameRow[]): GameMaps {
  const byExternal = new Map<string, DbGameRow[]>();
  const byLegacy = new Map<string, DbGameRow[]>();

  rows.forEach((row) => {
    const legacyKey = buildLegacyKey(toJstDate(row.start_at), row.home_team_id, row.away_team_id);
    pushMapRow(byLegacy, legacyKey, row);

    if (row.external_source === NPB_SOURCE && row.external_game_key) {
      pushMapRow(byExternal, row.external_game_key, row);
    }
  });

  return { byExternal, byLegacy };
}

function pickBestCandidate(rows: DbGameRow[], targetStartAt: string | null, preferUnfinalized: boolean): DbGameRow {
  if (rows.length === 1) return rows[0];

  const filtered = preferUnfinalized ? rows.filter((row) => row.status !== "final") : rows;
  const candidates = filtered.length > 0 ? filtered : rows;
  if (!targetStartAt) return candidates[0];

  const target = new Date(targetStartAt).getTime();
  return candidates.reduce((best, current) => {
    const bestDiff = Math.abs(new Date(best.start_at).getTime() - target);
    const currentDiff = Math.abs(new Date(current.start_at).getTime() - target);
    return currentDiff < bestDiff ? current : best;
  }, candidates[0]);
}

function mergeScheduleToExisting(existing: DbGameRow, incoming: ScheduleGame): { status: GameStatus; winner: Side | null } {
  if (incoming.status === "final" || incoming.status === "canceled") {
    return { status: incoming.status, winner: incoming.winner };
  }
  if (existing.status === "final" || existing.status === "canceled") {
    return { status: existing.status, winner: existing.winner };
  }
  return { status: incoming.status, winner: null };
}

function getMonthRange(year: number, month: number): { fromIso: string; toIso: string } {
  const from = new Date(`${year}-${two(month)}-01T00:00:00+09:00`);
  const nextMonth = month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 };
  const to = new Date(`${nextMonth.year}-${two(nextMonth.month)}-01T00:00:00+09:00`);
  return { fromIso: from.toISOString(), toIso: to.toISOString() };
}

function validateInput({ year, month }: NpbMonthlySyncInput): void {
  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    throw new Error("year must be integer (2000-2100)");
  }
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    throw new Error("month must be integer (1-12)");
  }
}

function toSyncLogSummary(result: NpbMonthlySyncResult, errors: number): Record<string, unknown> {
  return {
    mode: result.mode,
    year: result.year,
    month: result.month,
    inserted: result.db.created,
    updated: result.db.updated + result.db.finalized,
    skipped: result.db.unchanged,
    errors,
    fetched_schedule_games: result.fetched.scheduleGames,
    fetched_result_games: result.fetched.resultGames,
    unresolved_results: result.unresolvedResults.length,
    warnings: result.warnings
  };
}

export async function syncNpbMonthlyGames(input: NpbMonthlySyncInput): Promise<NpbMonthlySyncResult> {
  validateInput(input);

  const startedAt = new Date();
  const mode = input.mode ?? "full";
  const { year, month } = input;
  const scheduleUrl = `https://npb.jp/games/${year}/schedule_${two(month)}_detail.html`;
  const resultsUrl = `https://npb.jp/bis/${year}/calendar/index_${two(month)}.html`;

  const result: NpbMonthlySyncResult = {
    year,
    month,
    mode,
    source: { scheduleUrl, resultsUrl },
    fetched: {
      scheduleGames: 0,
      resultGames: 0
    },
    db: {
      created: 0,
      updated: 0,
      finalized: 0,
      unchanged: 0
    },
    unresolvedResults: [],
    warnings: []
  };

  let syncErrors = 0;

  try {
    let scheduleHtml: string | null = null;
    let resultsHtml: string | null = null;
    const fetchErrors: string[] = [];

    if (mode === "full") {
      try {
        scheduleHtml = await fetchHtml(scheduleUrl);
      } catch (error) {
        syncErrors += 1;
        const message = error instanceof Error ? error.message : `Failed to fetch ${scheduleUrl}`;
        result.warnings.push(`schedule_fetch_failed: ${message}`);
        fetchErrors.push(message);
      }
    }

    try {
      resultsHtml = await fetchHtml(resultsUrl);
    } catch (error) {
      syncErrors += 1;
      const message = error instanceof Error ? error.message : `Failed to fetch ${resultsUrl}`;
      result.warnings.push(`results_fetch_failed: ${message}`);
      fetchErrors.push(message);
    }

    if (!scheduleHtml && !resultsHtml) {
      throw new Error(fetchErrors[0] ?? "failed to fetch schedule and results pages");
    }

    const scheduleGames = mode === "full" && scheduleHtml ? parseScheduleHtml(scheduleHtml, year, result.warnings) : [];
    const resultGames = resultsHtml ? parseResultsHtml(resultsHtml, result.warnings).filter((game) => {
      return game.date.startsWith(`${year}-${two(month)}-`);
    }) : [];

    result.fetched.scheduleGames = scheduleGames.length;
    result.fetched.resultGames = resultGames.length;

    const supabase = createServiceClient();
    const monthRange = getMonthRange(year, month);
    const { data: dbRows, error: dbError } = await supabase
      .from("games")
      .select("id, season_year, start_at, stadium, status, winner, score_home, score_away, home_team_id, away_team_id, external_source, external_game_key")
      .gte("start_at", monthRange.fromIso)
      .lt("start_at", monthRange.toIso);

    if (dbError) {
      throw new Error(`Failed to load month games: ${dbError.message}`);
    }

    const existingRows = (dbRows ?? []) as DbGameRow[];
    const gameMaps = buildGameMaps(existingRows);

    for (const game of scheduleGames) {
      const legacyKey = buildLegacyKey(game.date, game.homeTeamId, game.awayTeamId);
      const externalCandidates = gameMaps.byExternal.get(game.externalGameKey) ?? [];
      const legacyCandidates = gameMaps.byLegacy.get(legacyKey) ?? [];
      const candidates = externalCandidates.length > 0 ? externalCandidates : legacyCandidates;
      const existing = candidates.length > 0 ? pickBestCandidate(candidates, game.startAt, false) : null;

      if (!existing) {
        const payload = {
          league: "NPB",
          season_year: year,
          start_at: game.startAt,
          stadium: game.stadium,
          score_home: game.scoreHome,
          score_away: game.scoreAway,
          home_team_id: game.homeTeamId,
          away_team_id: game.awayTeamId,
          status: game.status,
          winner: game.status === "final" ? game.winner : null,
          external_source: game.externalSource,
          external_game_key: game.externalGameKey
        };

        const { data: inserted, error: insertError } = await supabase.from("games").insert(payload).select("*").single();
        if (insertError) {
          throw new Error(`Failed to insert game ${legacyKey}: ${insertError.message}`);
        }

        const insertedRow = inserted as DbGameRow;
        pushMapRow(gameMaps.byLegacy, legacyKey, insertedRow);
        pushMapRow(gameMaps.byExternal, game.externalGameKey, insertedRow);
        result.db.created += 1;
        continue;
      }

      const merged = mergeScheduleToExisting(existing, game);
      const nextStartAt = game.startAt;
      const nextStadium = game.stadium ?? existing.stadium;
      const nextScoreHome = game.scoreHome;
      const nextScoreAway = game.scoreAway;
      const nextWinner = merged.status === "final" ? merged.winner : null;

      const changed =
        existing.start_at !== nextStartAt ||
        existing.stadium !== nextStadium ||
        existing.score_home !== nextScoreHome ||
        existing.score_away !== nextScoreAway ||
        existing.status !== merged.status ||
        existing.winner !== nextWinner ||
        existing.external_source !== game.externalSource ||
        existing.external_game_key !== game.externalGameKey;

      if (!changed) {
        result.db.unchanged += 1;
        continue;
      }

      const { error: updateError } = await supabase
        .from("games")
        .update({
          start_at: nextStartAt,
          stadium: nextStadium,
          score_home: nextScoreHome,
          score_away: nextScoreAway,
          status: merged.status,
          winner: nextWinner,
          external_source: game.externalSource,
          external_game_key: game.externalGameKey
        })
        .eq("id", existing.id);

      if (updateError) {
        throw new Error(`Failed to update game ${existing.id}: ${updateError.message}`);
      }

      existing.start_at = nextStartAt;
      existing.stadium = nextStadium;
      existing.score_home = nextScoreHome;
      existing.score_away = nextScoreAway;
      existing.status = merged.status;
      existing.winner = nextWinner;
      existing.external_source = game.externalSource;
      existing.external_game_key = game.externalGameKey;
      pushMapRow(gameMaps.byExternal, game.externalGameKey, existing);
      result.db.updated += 1;
    }

    for (const game of resultGames) {
      if (game.status !== "final") continue;

      const key = buildLegacyKey(game.date, game.homeTeamId, game.awayTeamId);
      const candidates = gameMaps.byLegacy.get(key) ?? [];
      if (candidates.length === 0) {
        result.unresolvedResults.push({
          date: game.date,
          home: game.homeTeamId,
          away: game.awayTeamId,
          score: game.scoreText
        });
        continue;
      }

      const existing = pickBestCandidate(candidates, null, true);
      const derivedExternalGameKey = buildExternalGameKey(
        game.date,
        game.homeTeamId,
        game.awayTeamId,
        toJstTime(existing.start_at),
        existing.stadium
      );

      const unchanged =
        existing.status === "final" &&
        existing.winner === game.winner &&
        existing.score_home === game.scoreHome &&
        existing.score_away === game.scoreAway &&
        existing.external_source === NPB_SOURCE &&
        existing.external_game_key === derivedExternalGameKey;

      if (unchanged) {
        result.db.unchanged += 1;
        continue;
      }

      const { error: updateError } = await supabase
        .from("games")
        .update({
          status: "final",
          winner: game.winner,
          score_home: game.scoreHome,
          score_away: game.scoreAway,
          external_source: NPB_SOURCE,
          external_game_key: derivedExternalGameKey
        })
        .eq("id", existing.id);

      if (updateError) {
        throw new Error(`Failed to finalize game ${existing.id}: ${updateError.message}`);
      }

      existing.status = "final";
      existing.winner = game.winner;
      existing.score_home = game.scoreHome;
      existing.score_away = game.scoreAway;
      existing.external_source = NPB_SOURCE;
      existing.external_game_key = derivedExternalGameKey;
      pushMapRow(gameMaps.byExternal, derivedExternalGameKey, existing);
      result.db.finalized += 1;
    }

    await writeSyncLog({
      source: "npb-sync",
      startedAt,
      finishedAt: new Date(),
      ok: true,
      summary: toSyncLogSummary(result, syncErrors),
      error: null
    }).catch((error) => {
      console.error("failed to write npb-sync log", error);
    });

    return result;
  } catch (error) {
    syncErrors += 1;
    const message = error instanceof Error ? error.message : "failed to sync npb data";
    await writeSyncLog({
      source: "npb-sync",
      startedAt,
      finishedAt: new Date(),
      ok: false,
      summary: toSyncLogSummary(result, syncErrors),
      error: message
    }).catch((writeError) => {
      console.error("failed to write npb-sync error log", writeError);
    });
    throw error;
  }
}
