"use client";

import Link from "next/link";
import { HomeDatePicker } from "@/components/home-date-picker";
import { usePersonalizedGames } from "@/components/use-personalized-games";
import { formatJstDate, formatJstTime } from "@/lib/time";
import { statusLabel } from "@/lib/ui";
import type { GameListItem } from "@/lib/types";

type TopGame = GameListItem & {
  home_team: {
    id: string;
    name: string;
  };
  away_team: {
    id: string;
    name: string;
  };
};

const TEAM_SHORT_MAP: Record<string, string> = {
  GIANTS: "G",
  TIGERS: "T",
  BAYSTARS: "DB",
  CARP: "C",
  SWALLOWS: "S",
  DRAGONS: "D",
  HAWKS: "H",
  FIGHTERS: "F",
  MARINES: "M",
  EAGLES: "E",
  LIONS: "L",
  BUFFALOES: "B"
};

function teamShort(id: string, name: string): string {
  if (TEAM_SHORT_MAP[id]) {
    return TEAM_SHORT_MAP[id];
  }
  const ascii = id.replace(/[^A-Z]/g, "");
  if (ascii.length > 0) {
    return ascii.slice(0, 3);
  }
  return name.slice(0, 2).toUpperCase();
}

function pointsLabel(game: TopGame): string {
  if (game.status === "final") {
    if (game.winner === null || game.winner === "draw") return "引き分け / 勝敗なし";
    return game.winner === "home" ? `${game.home_team.name} 勝利` : `${game.away_team.name} 勝利`;
  }
  if (game.status === "in_progress") return "試合中";
  if (game.status === "canceled") return "中止";
  return "試合前";
}

function gameStateLabel(game: TopGame): string {
  if (game.status === "final") return "結果確定";
  if (game.status === "canceled") return "中止";
  if (game.status === "in_progress") return "試合中";
  const closeAt = new Date(game.start_at).getTime() - 5 * 60 * 1000;
  return Date.now() >= closeAt ? "締切" : "予想受付中";
}

function myStateLabel(game: TopGame, isAuthenticated: boolean, isLoading: boolean): string {
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

function gameHref(game: TopGame, isAuthenticated: boolean): string {
  const closeAt = new Date(game.start_at).getTime() - 5 * 60 * 1000;
  const canPredict = game.status === "scheduled" && Date.now() < closeAt;
  const predictionTarget = `/games/${game.id}`;
  if (canPredict && !isAuthenticated) {
    return `/login?returnTo=${encodeURIComponent(predictionTarget)}&focus=prediction`;
  }
  return `${predictionTarget}?focus=prediction`;
}

function gameActionLabel(game: TopGame, isAuthenticated: boolean): string {
  const closeAt = new Date(game.start_at).getTime() - 5 * 60 * 1000;
  const canPredict = game.status === "scheduled" && Date.now() < closeAt;
  if (!canPredict) {
    return "試合詳細を見る";
  }
  return isAuthenticated ? "勝敗を予想する" : "ログインして予想";
}

export function HomePersonalizedSections({
  date,
  todayDate,
  scheduleDates,
  prevDate,
  nextDate,
  initialGames,
  isAuthenticated
}: {
  date: string;
  todayDate: string;
  scheduleDates: string[];
  prevDate: string;
  nextDate: string;
  initialGames: TopGame[];
  isAuthenticated: boolean;
}) {
  const { games, isLoading } = usePersonalizedGames({
    date,
    initialGames,
    enabled: isAuthenticated
  });

  const liveGames = games.filter((game) => game.status === "in_progress").slice(0, 2);
  const dayGames = [...games].sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime()).slice(0, 8);

  return (
    <>
      <section className="home-section">
        <div className="home-section-head">
          <div className="home-live-heading">
            <span className="home-live-dot" />
            <h2>進行中の試合</h2>
          </div>
          <Link href="/schedule" className="home-link-inline">
            試合日程を見る
          </Link>
        </div>

        {liveGames.length === 0 ? (
          <article className="home-empty-card">
            <p className="home-empty-title">現在進行中の試合はありません。</p>
            <p className="home-empty-sub">開始前の試合は下の「今日の試合予定」から予想できます。</p>
          </article>
        ) : (
          <div className="home-live-grid">
            {liveGames.map((game) => (
              <article key={game.id} className="home-live-card">
                <div className="home-live-meta">
                  <span className="home-live-status">{statusLabel(game.status)}</span>
                  <span>{formatJstTime(game.start_at)}</span>
                </div>
                <p className="meta" style={{ margin: "0.55rem 0 0", fontSize: "0.76rem" }}>
                  状態: {gameStateLabel(game)} / 自分: {myStateLabel(game, isAuthenticated, isLoading)}
                </p>
                <div className="home-live-match">
                  <div className="home-live-team">
                    <div className="home-live-badge">{teamShort(game.home_team.id, game.home_team.name)}</div>
                    <span>{game.home_team.name}</span>
                  </div>
                  <div className="home-live-center">
                    <strong>対</strong>
                    <span>{pointsLabel(game)}</span>
                  </div>
                  <div className="home-live-team">
                    <div className="home-live-badge">{teamShort(game.away_team.id, game.away_team.name)}</div>
                    <span>{game.away_team.name}</span>
                  </div>
                </div>
                <div className="home-live-actions">
                  <Link href={gameHref(game, isAuthenticated)} className="home-btn home-btn-primary">
                    試合詳細を見る
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="home-section">
        <div className="home-section-head home-section-head-stack">
          <h2>今日の試合予定</h2>
          <div className="home-date-tabs">
            <Link href={`/?date=${prevDate}`} className="home-date-btn">
              前日
            </Link>
            {scheduleDates.map((targetDate) => (
              <Link key={targetDate} href={`/?date=${targetDate}`} className={`home-date-btn ${targetDate === date ? "is-active" : ""}`}>
                {targetDate === todayDate ? "今日" : formatJstDate(new Date(`${targetDate}T00:00:00+09:00`))}
              </Link>
            ))}
            <Link href={`/?date=${nextDate}`} className="home-date-btn">
              翌日
            </Link>
            <HomeDatePicker value={date} />
          </div>
        </div>

        {dayGames.length === 0 ? (
          <article className="home-empty-card">
            <p className="home-empty-title">この日の試合はまだありません。</p>
          </article>
        ) : (
          <div className="home-upcoming-list">
            {dayGames.map((game) => (
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
                  <Link href={gameHref(game, isAuthenticated)} className="home-btn home-btn-outline">
                    {gameActionLabel(game, isAuthenticated)}
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
