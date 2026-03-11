import type { GameStatus, Side } from "@/lib/types";

type AdminGameState = {
  status: GameStatus;
  winner: Side | null;
  scoreHome: number | null;
  scoreAway: number | null;
  homeTeamId: string;
  awayTeamId: string;
};

export function validateAdminGameState(state: AdminGameState): string | null {
  if (state.homeTeamId === state.awayTeamId) {
    return "home_team_id and away_team_id must be different";
  }

  if (state.status !== "final") {
    if (state.winner !== null) {
      return "winner can be set only when status=final";
    }
    return null;
  }

  if (state.winner === null) {
    return "winner must be set when status=final";
  }
  if (state.scoreHome === null || state.scoreAway === null) {
    return "score_home and score_away must be set when status=final";
  }
  if (state.winner === "draw" && state.scoreHome !== state.scoreAway) {
    return "draw winner requires score_home = score_away";
  }
  if (state.winner === "home" && state.scoreHome <= state.scoreAway) {
    return "home winner requires score_home > score_away";
  }
  if (state.winner === "away" && state.scoreAway <= state.scoreHome) {
    return "away winner requires score_away > score_home";
  }

  return null;
}
