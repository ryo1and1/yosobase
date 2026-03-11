import type { GameStatus, Side } from "@/lib/types";

export function statusLabel(status: GameStatus): string {
  switch (status) {
    case "scheduled":
      return "試合前";
    case "in_progress":
      return "試合中";
    case "final":
      return "試合終了";
    case "canceled":
      return "中止";
    default:
      return status;
  }
}

export function sideLabel(side: Side | null, homeTeam: string, awayTeam: string): string {
  if (side === "home") return `${homeTeam}勝ち`;
  if (side === "draw") return "引き分け";
  if (side === "away") return `${awayTeam}勝ち`;
  return "未予想";
}
