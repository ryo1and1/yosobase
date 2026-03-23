import Link from "next/link";
import { Lexend } from "next/font/google";
import { SchedulePersonalizedList } from "@/components/schedule-personalized-list";
import { fetchGamesByDate } from "@/lib/data";
import { formatJstDate, todayJst } from "@/lib/time";
import type { GameListItem } from "@/lib/types";
import { getRequestViewerUserId } from "@/lib/viewer-server";

const lexend = Lexend({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"]
});

function addDays(dateText: string, days: number): string {
  const base = new Date(`${dateText}T00:00:00+09:00`);
  const next = new Date(base.getTime() + days * 24 * 60 * 60 * 1000);
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Tokyo" }).format(next);
}

export default async function SchedulePage({
  searchParams
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const params = await searchParams;
  const selectedDate = params.date && /^\d{4}-\d{2}-\d{2}$/.test(params.date) ? params.date : todayJst();
  const dates = Array.from({ length: 14 }, (_, index) => addDays(todayJst(), index));

  const viewerUserId = await getRequestViewerUserId();
  const isAuthenticated = Boolean(viewerUserId);
  const games = (await fetchGamesByDate(selectedDate, null)) as GameListItem[];

  return (
    <div className={`${lexend.className} schedule-page`}>
      <section className="schedule-head">
        <div>
          <p className="schedule-kicker">試合カレンダー</p>
          <h1>試合日程</h1>
          <p>先の日程を確認しながら、気になるカードを選んで予想ページへ進めます。</p>
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
              <p className="schedule-date-sub">この日の試合一覧と、自分の予想状況をまとめて確認できます。</p>
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
        <SchedulePersonalizedList date={selectedDate} initialGames={games} isAuthenticated={isAuthenticated} />
      </section>
    </div>
  );
}
