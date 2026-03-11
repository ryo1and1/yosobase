import type { PredictionMode, PredictionOption, RankingPeriod, Side } from "@/lib/types";

export function parseSide(value: unknown): Side | null {
  if (value === "home" || value === "draw" || value === "away") {
    return value;
  }
  return null;
}

export function parseRankingPeriod(value: string | null): RankingPeriod {
  if (value === "daily" || value === "weekly" || value === "monthly" || value === "season") {
    return value;
  }
  return "daily";
}

export function parsePredictionMode(value: unknown): PredictionMode | null {
  if (value === "simple" || value === "detailed") {
    return value;
  }
  return null;
}

export function parsePredictionOption(value: unknown): PredictionOption | null {
  if (
    value === "home_win" ||
    value === "draw" ||
    value === "away_win" ||
    value === "home_by1" ||
    value === "home_by2" ||
    value === "home_by3plus" ||
    value === "home_by2plus" ||
    value === "away_by1" ||
    value === "away_by2" ||
    value === "away_by3plus" ||
    value === "away_by2plus"
  ) {
    return value;
  }
  return null;
}

export function toSafeInt(value: string | null, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) return fallback;
  return parsed;
}
