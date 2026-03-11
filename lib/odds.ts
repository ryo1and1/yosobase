import {
  DETAILED_OPTIONS,
  LOCK_MINUTES_BEFORE_START,
  ODDS_MAX,
  ODDS_MIN,
  optionsForMode,
  priorForMode
} from "@/lib/game-rules";
import type { OddsItem, PredictionMode, PredictionOption, Side } from "@/lib/types";

type BetLike = {
  option: PredictionOption;
  stake_points: number;
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function roundOdds(value: number): number {
  return Math.round(value * 100) / 100;
}

export function oddsLockedAt(startAtIso: string): Date {
  return new Date(new Date(startAtIso).getTime() - LOCK_MINUTES_BEFORE_START * 60 * 1000);
}

export function isOddsLocked(startAtIso: string, now: Date = new Date()): boolean {
  return now.getTime() >= oddsLockedAt(startAtIso).getTime();
}

export function computeOdds(mode: PredictionMode, bets: BetLike[]): OddsItem[] {
  const options = optionsForMode(mode);
  const prior = priorForMode(mode);

  const stakeByOption = new Map<PredictionOption, number>();
  options.forEach((option) => stakeByOption.set(option, 0));
  bets.forEach((bet) => {
    if (!stakeByOption.has(bet.option)) return;
    const next = (stakeByOption.get(bet.option) ?? 0) + Math.max(0, bet.stake_points);
    stakeByOption.set(bet.option, next);
  });

  let total = 0;
  options.forEach((option) => {
    total += (stakeByOption.get(option) ?? 0) + prior[option];
  });
  if (total <= 0) total = 1;

  return options.map((option) => {
    const amount = (stakeByOption.get(option) ?? 0) + prior[option];
    const share = amount / total;
    const rawOdds = 1 / share;
    const odds = roundOdds(clamp(rawOdds, ODDS_MIN, ODDS_MAX));
    return {
      option,
      share,
      odds,
      total_stake: stakeByOption.get(option) ?? 0
    };
  });
}

export function optionLabel(option: PredictionOption): string {
  switch (option) {
    case "home_win":
      return "ホーム勝ち";
    case "draw":
      return "引き分け";
    case "away_win":
      return "ビジター勝ち";
    case "home_by1":
      return "1点差勝ち";
    case "home_by2":
      return "2点差勝ち";
    case "home_by3plus":
      return "3点差以上勝ち";
    case "home_by2plus":
      return "ホーム2点差以上勝ち";
    case "away_by1":
      return "1点差負け";
    case "away_by2":
      return "2点差負け";
    case "away_by3plus":
      return "3点差以上負け";
    case "away_by2plus":
      return "ビジター2点差以上勝ち";
    default:
      return option;
  }
}

export function optionToBroadSide(option: PredictionOption): Side | null {
  if (option === "draw") return "draw";
  if (option.startsWith("home_")) return "home";
  if (option.startsWith("away_")) return "away";
  return null;
}

export function winningOptionsFromResult(
  winner: Side | null,
  scoreHome: number | null,
  scoreAway: number | null
): PredictionOption[] {
  if (!winner) return [];
  if (winner === "draw") return ["draw"];
  if (winner === "home") {
    if (scoreHome !== null && scoreAway !== null) {
      const diff = scoreHome - scoreAway;
      if (diff >= 3) return ["home_win", "home_by3plus", "home_by2plus"];
      if (diff === 2) return ["home_win", "home_by2", "home_by2plus"];
      if (diff === 1) return ["home_win", "home_by1"];
    }
    return ["home_win"];
  }
  if (scoreHome !== null && scoreAway !== null) {
    const diff = scoreAway - scoreHome;
    if (diff >= 3) return ["away_win", "away_by3plus", "away_by2plus"];
    if (diff === 2) return ["away_win", "away_by2", "away_by2plus"];
    if (diff === 1) return ["away_win", "away_by1"];
  }
  return ["away_win"];
}

export function defaultModeForBets(bets: BetLike[]): PredictionMode {
  const hasDetailedOnly = bets.some((bet) => !["home_win", "draw", "away_win"].includes(bet.option));
  return hasDetailedOnly ? "detailed" : "simple";
}

export function allOptions(): readonly PredictionOption[] {
  return DETAILED_OPTIONS;
}
