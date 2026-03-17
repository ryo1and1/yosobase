import {
  DETAILED_OPTIONS,
  LOCK_MINUTES_BEFORE_START,
  ODDS_MAX,
  ODDS_MIN,
  ODDS_PAYOUT_RATE,
  optionsForMode,
  priorForMode
} from "@/lib/game-rules";
import type { OddsItem, PredictionMode, PredictionOption, PublicShareSummary, PublicShareSummaryByMode, Side } from "@/lib/types";

type BetLike = {
  option: PredictionOption;
  stake_points: number;
  user_id?: string;
};

function buildStakeByOption(mode: PredictionMode, bets: BetLike[]) {
  const options = optionsForMode(mode);
  const stakeByOption = new Map<PredictionOption, number>();
  options.forEach((option) => stakeByOption.set(option, 0));
  bets.forEach((bet) => {
    if (!stakeByOption.has(bet.option)) return;
    const next = (stakeByOption.get(bet.option) ?? 0) + Math.max(0, bet.stake_points);
    stakeByOption.set(bet.option, next);
  });
  return { options, stakeByOption };
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function roundOdds(value: number): number {
  return Math.round(value * 100) / 100;
}

function buildDisplayPercents(shares: number[]): number[] {
  if (shares.every((share) => share <= 0)) {
    return shares.map(() => 0);
  }

  const scaled = shares.map((share) => share * 100);
  const base = scaled.map((share) => Math.floor(share));
  let remainder = 100 - base.reduce((sum, percent) => sum + percent, 0);
  const orderedFractions = scaled
    .map((share, index) => ({ index, fraction: share - Math.floor(share) }))
    .sort((a, b) => b.fraction - a.fraction || a.index - b.index);

  for (const item of orderedFractions) {
    if (remainder <= 0) break;
    base[item.index] += 1;
    remainder -= 1;
  }

  return base;
}

export function oddsLockedAt(startAtIso: string): Date {
  return new Date(new Date(startAtIso).getTime() - LOCK_MINUTES_BEFORE_START * 60 * 1000);
}

export function isOddsLocked(startAtIso: string, now: Date = new Date()): boolean {
  return now.getTime() >= oddsLockedAt(startAtIso).getTime();
}

// Internal odds share mixes priors and should not be shown as the public prediction ratio.
export function computeOdds(mode: PredictionMode, bets: BetLike[]): OddsItem[] {
  const { options, stakeByOption } = buildStakeByOption(mode, bets);
  const prior = priorForMode(mode);

  let total = 0;
  options.forEach((option) => {
    total += (stakeByOption.get(option) ?? 0) + prior[option];
  });
  if (total <= 0) total = 1;

  return options.map((option) => {
    const amount = (stakeByOption.get(option) ?? 0) + prior[option];
    const share = amount / total;
    const rawOdds = ODDS_PAYOUT_RATE / share;
    const odds = roundOdds(clamp(rawOdds, ODDS_MIN, ODDS_MAX));
    return {
      option,
      share,
      odds,
      total_stake: stakeByOption.get(option) ?? 0
    };
  });
}

// Public share is user-facing and uses only real user bet points with no priors mixed in.
export function computePublicShareSummary(mode: PredictionMode, bets: BetLike[]): PublicShareSummary {
  const { options, stakeByOption } = buildStakeByOption(mode, bets);
  const predictorIds = new Set(
    bets
      .filter((bet) => options.includes(bet.option))
      .map((bet) => bet.user_id)
      .filter((userId): userId is string => typeof userId === "string" && userId.length > 0)
  );
  const publicBetPointsTotal = options.reduce((sum, option) => sum + (stakeByOption.get(option) ?? 0), 0);
  const publicShares = options.map((option) => {
    if (publicBetPointsTotal <= 0) {
      return 0;
    }
    return (stakeByOption.get(option) ?? 0) / publicBetPointsTotal;
  });
  const publicSharePercents = buildDisplayPercents(publicShares);

  return {
    publicBetPointsTotal,
    publicPredictorCount: predictorIds.size,
    items: options.map((option, index) => ({
      option,
      publicShare: publicShares[index] ?? 0,
      publicSharePercent: publicSharePercents[index] ?? 0,
      publicBetPoints: stakeByOption.get(option) ?? 0
    }))
  };
}

export function computePublicShareSummaryByMode(bets: BetLike[]): PublicShareSummaryByMode {
  return {
    simple: computePublicShareSummary("simple", bets),
    detailed: computePublicShareSummary("detailed", bets)
  };
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
      return "ホーム1";
    case "home_by2":
      return "ホーム2";
    case "home_by3plus":
      return "ホーム3";
    case "home_by2plus":
      return "ホーム2+";
    case "away_by1":
      return "ビジター1";
    case "away_by2":
      return "ビジター2";
    case "away_by3plus":
      return "ビジター3";
    case "away_by2plus":
      return "ビジター2+";
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
