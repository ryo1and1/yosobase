import { Lexend } from "next/font/google";
import Link from "next/link";
import { AdSenseScript } from "@/components/ads/adsense-script";
import { AdSenseUnit } from "@/components/ads/adsense-unit";
import { HomePersonalizedSections } from "@/components/home-personalized-sections";
import { getAdSenseUnitConfig } from "@/lib/ads";
import { fetchGamesByDate } from "@/lib/data";
import { formatJstDate, todayJst } from "@/lib/time";
import type { GameListItem } from "@/lib/types";
import { getRequestViewerUserId } from "@/lib/viewer-server";

const lexend = Lexend({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "900"]
});

function addDays(dateText: string, days: number): string {
  const base = new Date(`${dateText}T00:00:00+09:00`);
  const next = new Date(base.getTime() + days * 24 * 60 * 60 * 1000);
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Tokyo" }).format(next);
}

export default async function HomePage({
  searchParams
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const params = await searchParams;
  const todayDate = todayJst();
  const date = params.date && /^\d{4}-\d{2}-\d{2}$/.test(params.date) ? params.date : todayDate;

  const viewerUserId = await getRequestViewerUserId();
  const isAuthenticated = Boolean(viewerUserId);
  const games = (await fetchGamesByDate(date, null)) as GameListItem[];
  const topAd = getAdSenseUnitConfig("top");
  const shouldShowTopAd = Boolean(topAd) && games.length > 0;

  const prevDate = addDays(date, -1);
  const nextDate = addDays(date, 1);
  const tomorrowDate = addDays(todayDate, 1);
  const afterTomorrowDate = addDays(todayDate, 2);
  const baseDates = [todayDate, tomorrowDate, afterTomorrowDate];
  const scheduleDates = baseDates.includes(date)
    ? baseDates
    : [todayDate, addDays(date, -1), date, addDays(date, 1)].filter(
        (value, index, arr) => arr.indexOf(value) === index
      );

  return (
    <div className={`${lexend.className} home-top`}>
      <section className="home-subnav">
        <div className="home-subnav-row">
          <div className="home-hero-main">
            <p className="home-kicker">本日のカード</p>
            <h1 className="home-title">今日の試合を予想しよう</h1>
            <p className="home-subtitle">{formatJstDate(new Date(`${date}T00:00:00+09:00`))} / NPB公式戦</p>
            <div className="home-hero-pills">
              <span className="home-hero-pill">予想締切: 試合開始5分前</span>
              <span className="home-hero-pill">対象: NPB 12球団</span>
            </div>
          </div>
        </div>
      </section>

      <HomePersonalizedSections
        date={date}
        todayDate={todayDate}
        scheduleDates={scheduleDates}
        prevDate={prevDate}
        nextDate={nextDate}
        initialGames={games}
        isAuthenticated={isAuthenticated}
      />

      {shouldShowTopAd ? <AdSenseScript /> : null}
      {shouldShowTopAd && topAd ? <AdSenseUnit client={topAd.client} slot={topAd.slot} className="home-ad-slot" /> : null}

      <section className="home-banner">
        <div>
          <h3>週間ランキングチャレンジ</h3>
          <p>今週の上位10名にボーナスポイント。毎日の予想でランキング上位を目指しましょう。</p>
        </div>
        <div className="home-banner-actions">
          <Link href="/rankings" className="home-btn home-btn-light">
            ランキングを見る
          </Link>
          <Link href="/about" className="home-btn home-btn-ghost">
            ルールを見る
          </Link>
        </div>
      </section>
    </div>
  );
}
