import Link from "next/link";
import { Lexend } from "next/font/google";
import { fetchGamesByDate } from "@/lib/data";
import { getAuthenticatedViewerUserId, getViewerUserId } from "@/lib/guest-user";
import { formatJstDate, formatJstTime, todayJst } from "@/lib/time";
import type { GameStatus, Side } from "@/lib/types";

const lexend = Lexend({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"]
});

type ScheduleGame = {
  id: string;
  start_at: string;
  stadium: string | null;
  status: GameStatus;
  winner: Side | null;
  home_team: { id: string; name: string };
  away_team: { id: string; name: string };
  user_prediction: Side | null;
  user_settlement_points: number | null;
  user_has_prediction: boolean;
};

function addDays(dateText: string, days: number): string {
  const base = new Date(`${dateText}T00:00:00+09:00`);
  const next = new Date(base.getTime() + days * 24 * 60 * 60 * 1000);
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Tokyo" }).format(next);
}

function gameStateLabel(game: ScheduleGame): string {
  if (game.status === "final") return "結果確定";
  if (game.status === "canceled") return "中止";
  if (game.status === "in_progress") return "試合中";
  const closeAt = new Date(game.start_at).getTime() - 5 * 60 * 1000;
  return Date.now() >= closeAt ? "締切" : "予想受付中";
}

function myStateLabel(game: ScheduleGame): string {
  if (game.user_settlement_points !== null) {
    const signed = game.user_settlement_points >= 0 ? `+${game.user_settlement_points}` : `${game.user_settlement_points}`;
    return `精算済み（${signed}pt）`;
  }
  if (game.user_prediction === "home") return "予想済み（ホーム）";
  if (game.user_prediction === "draw") return "予想済み（引き分け）";
  if (game.user_prediction === "away") return "予想済み（ビジター）";
  if (game.user_has_prediction) return "予想済み";
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

export default async function SchedulePage({
  searchParams
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const params = await searchParams;
  const selectedDate = params.date && /^\d{4}-\d{2}-\d{2}$/.test(params.date) ? params.date : todayJst();
  const dates = Array.from({ length: 14 }, (_, index) => addDays(todayJst(), index));

  const [viewerUserId, authenticatedUserId] = await Promise.all([getViewerUserId(), getAuthenticatedViewerUserId()]);
  const isAuthenticated = Boolean(authenticatedUserId);
  const games = (await fetchGamesByDate(selectedDate, viewerUserId)) as ScheduleGame[];

  return (
    <div className={`${lexend.className} schedule-page`}>
      <section className="schedule-head">
        <div>
          <p className="schedule-kicker">試合日程</p>
          <h1>試合日程</h1>
          <p>日付を選んで、試合状態とあなたの予想状態を確認できます。</p>
        </div>
      </section>

      <section className="schedule-date-grid">
        {dates.map((date, index) => {
          const label = index === 0 ? "今日" : index === 1 ? "明日" : null;
          return (
            <article key={date} className="schedule-date-card">
              <div className="schedule-date-head">
                <p>{formatJstDate(new Date(`${date}T00:00:00+09:00`))}</p>
                {label ? <span className="schedule-date-badge">{label}</span> : null}
              </div>
              <p className="schedule-date-sub">この日の試合カードと予想状況を表示</p>
              <div className="schedule-date-actions">
                <Link href={`/schedule?date=${date}`} className="home-btn home-btn-primary">
                  この日の試合を見る
                </Link>
              </div>
            </article>
          );
        })}
      </section>

      <section className="schedule-note-card">
        <h2>{formatJstDate(new Date(`${selectedDate}T00:00:00+09:00`))} の試合</h2>
        {games.length === 0 ? (
          <p>この日の試合はまだありません。</p>
        ) : (
          <div className="home-upcoming-list" style={{ marginTop: "0.75rem" }}>
            {games.map((game) => (
              <article key={game.id} className="home-upcoming-row">
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
                  <strong>{myStateLabel(game)}</strong>
                </div>
                <div className="home-upcoming-action">
                  <Link href={predictionHref(game, isAuthenticated)} className="home-btn home-btn-outline">
                    {isAuthenticated ? "勝敗を予想する" : "ログインして予想"}
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
