import type { Side } from "@/lib/types";

export const CORRECT_POINTS = 10;

export function pointsForPrediction(winner: Side | null, pick: Side): { isCorrect: boolean; points: number } {
  if (!winner) {
    return { isCorrect: false, points: 0 };
  }
  const isCorrect = winner === pick;
  return { isCorrect, points: isCorrect ? CORRECT_POINTS : 0 };
}
