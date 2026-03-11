import type { PredictionMode, PredictionOption } from "@/lib/types";

export const INITIAL_POINT_BALANCE = 30_000;
export const MAX_STAKE_PER_GAME = 1_000;
export const LOCK_MINUTES_BEFORE_START = 5;
export const ODDS_MIN = 1.3;
export const ODDS_MAX = 6.0;

export const SIMPLE_OPTIONS: readonly PredictionOption[] = ["home_win", "draw", "away_win"];
export const DETAILED_OPTIONS: readonly PredictionOption[] = [
  "home_by1",
  "home_by2",
  "home_by3plus",
  "draw",
  "away_by1",
  "away_by2",
  "away_by3plus"
];

export function optionsForMode(mode: PredictionMode): readonly PredictionOption[] {
  return mode === "simple" ? SIMPLE_OPTIONS : DETAILED_OPTIONS;
}

export const SIMPLE_PRIOR: Record<PredictionOption, number> = {
  home_win: 45,
  draw: 10,
  away_win: 45,
  home_by1: 0,
  home_by2: 0,
  home_by3plus: 0,
  home_by2plus: 0,
  away_by1: 0,
  away_by2: 0,
  away_by3plus: 0,
  away_by2plus: 0
};

export const DETAILED_PRIOR: Record<PredictionOption, number> = {
  home_win: 0,
  draw: 10,
  away_win: 0,
  home_by1: 16,
  home_by2: 12,
  home_by3plus: 17,
  home_by2plus: 0,
  away_by1: 16,
  away_by2: 12,
  away_by3plus: 17,
  away_by2plus: 0
};

export function priorForMode(mode: PredictionMode): Record<PredictionOption, number> {
  return mode === "simple" ? SIMPLE_PRIOR : DETAILED_PRIOR;
}
