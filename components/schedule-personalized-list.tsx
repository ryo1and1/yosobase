"use client";

import Link from "next/link";
import { usePersonalizedGames } from "@/components/use-personalized-games";
import { formatJstTime } from "@/lib/time";
import type { GameListItem } from "@/lib/types";

type ScheduleGame = GameListItem & {
  home_team: { id: string; name: string };
  away_team: { id: string; name: string };
};

function gameStateLabel(game: ScheduleGame): string {
  if (game.status === "final") return "結果確定";
  if (game.status === "canceled") return "中止";
  if (game.status === "in_progress") return "試合中";
  const closeAt = new Date(game.start_at).getTime() - 5 * 60 * 1000;
  return Date.now() >= closeAt ? "締切" : "予想受付中";
}

function myStateLabel(game: ScheduleGame, isAuthenticated: boolean, isLoading: boolean): string {
  if (!isAuthenticated) {
    return "未予想";
  }
  if (game.user_settlement_points !== null) {
    const signed = game.user_settlement_points >= 0 ? `+${game.user_settlement_points}` : `${game.user_settlement_points}`;
    if (game.status === "canceled") {
      return `返金済み（${signed}pt）`;
    }
    return `精算済み（${signed}pt）`;
  }
  if (game.user_prediction === "home") return "予想済み（ホーム）";
  if (game.user_prediction === "draw") return "予想済み（引き分け）";
  if (game.user_prediction === "away") return "予想済み（ビジター）";
  if (game.user_has_prediction) return "予想済み";
  if (isLoading) return "読み込み中...";
  return "未予想";
}

function predictionHref(game: ScheduleGame, isAuthenticated: boolean): string {
  const closeAt = new Date(game.start_at).getTime() - 5 * 60 * 1000;
  const canPredict = game.status === "scheduled" && Date.now() < closeAt;
  const gamePath = `/games/${game.id}`;
  if (canPredict && !isAuthenticated) {
    return `/login?returnTo=${encodeURIComponent(gamePath)}&focus=prediction`;
  }
  return `${gamePath}?focus=prediction`;
}

export function SchedulePersonalizedList({
  date,
  initialGames,
  isAuthenticated
}: {
  date: string;
  initialGames: ScheduleGame[];
  isAuthenticated: boolean;
}) {
  const { games, isLoading } = usePersonalizedGames({
    date,
    initialGames,
    enabled: isAuthenticated
  });

  if (games.length === 0) {
    return <p>この日の試合はまだありません。</p>;
  }

  return (
    <div className="home-upcoming-list" style={{ marginTop: "0.75rem" }}>
      {games.map((game) => (
        <article key={game.id} className={`home-upcoming-row${game.user_has_prediction ? " is-predicted" : ""}`}>
          <div className="home-upcoming-time">
            <span>開始時刻</span>
            <strong>{formatJstTime(game.start_at)}</strong>
          </div>
          <div className="home-upcoming-venue">
            <span>球場</span>
            <strong>{game.stadium ?? "未定"}</strong>
          </div>
          <div className="home-upcoming-match">
            <div>{game.home_team.name}</div>
            <span>対</span>
            <div>{game.away_team.name}</div>
          </div>
          <div className="home-upcoming-venue">
            <span>状態</span>
            <strong>{gameStateLabel(game)}</strong>
          </div>
          <div className="home-upcoming-venue">
            <span>自分</span>
            <strong>{myStateLabel(game, isAuthenticated, isLoading)}</strong>
          </div>
          <div className="home-upcoming-action">
            <Link href={predictionHref(game, isAuthenticated)} className="home-btn home-btn-outline">
              {isAuthenticated ? "勝敗予想へ進む" : "ログインして予想"}
            </Link>
          </div>
        </article>
      ))}
    </div>
  );
}
