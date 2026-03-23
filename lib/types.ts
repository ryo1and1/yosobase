export type Side = "home" | "draw" | "away";
export type GameStatus = "scheduled" | "in_progress" | "final" | "canceled";
export type RankingPeriod = "daily" | "weekly" | "monthly" | "season";
export type PredictionMode = "simple" | "detailed";
export type PredictionOption =
  | "home_win"
  | "draw"
  | "away_win"
  | "home_by1"
  | "home_by2"
  | "home_by3plus"
  | "home_by2plus"
  | "away_by1"
  | "away_by2"
  | "away_by3plus"
  | "away_by2plus";

export type Team = {
  id: string;
  name: string;
};

export type GameWithTeams = {
  id: string;
  season_year: number;
  start_at: string;
  stadium: string | null;
  status: GameStatus;
  winner: Side | null;
  score_home: number | null;
  score_away: number | null;
  home_team: Team;
  away_team: Team;
};

export type GameListItem = GameWithTeams & {
  user_prediction: Side | null;
  user_settlement_points: number | null;
  user_has_prediction: boolean;
};

export type PredictionPick = {
  mode: PredictionMode;
  allocations: {
    option: PredictionOption;
    stake_points: number;
  }[];
};

export type PredictionAllocation = {
  option: PredictionOption;
  stake_points: number;
};

// Internal odds share mixes priors and is only used for odds calculation.
export type OddsItem = {
  option: PredictionOption;
  share: number;
  odds: number;
  total_stake: number;
};

// Public share is user-facing and uses only real user bet points.
export type PublicShareItem = {
  option: PredictionOption;
  publicShare: number;
  publicSharePercent: number;
  publicBetPoints: number;
};

export type PublicShareSummary = {
  publicBetPointsTotal: number;
  publicPredictorCount: number;
  items: PublicShareItem[];
};

export type PublicShareSummaryByMode = Record<PredictionMode, PublicShareSummary>;

export type RankingItem = {
  user_id: string;
  display_name: string;
  public_code: string | null;
  favorite_team_name?: string | null;
  points: number;
  predictions: number;
  correct: number;
  rank: number;
  hit_rate: number;
  current_streak?: number;
};

export type MeHistoryItem = {
  settled_at: string;
  game_id: string;
  home_team_name: string;
  away_team_name: string;
  pick_summary: string;
  status: GameStatus;
  winner: Side | null;
  points_delta: number;
  stake_points: number;
};
