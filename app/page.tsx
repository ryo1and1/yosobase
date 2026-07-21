import type { Metadata } from "next";
import { Lexend } from "next/font/google";
import Link from "next/link";
import { HomePersonalizedSections } from "@/components/home-personalized-sections";
import { GUIDE_ARTICLES } from "@/lib/guides";
import { fetchGamesByDate } from "@/lib/data";
import { formatJstDate, todayJst } from "@/lib/time";
import type { GameListItem } from "@/lib/types";
import { getRequestViewerUserId } from "@/lib/viewer-server";

export const metadata: Metadata = {
  title: { absolute: "YosoBase | NPB予想ゲーム" },
  description:
    "NPBの試合を予想し、結果に応じたサイト内ポイントとランキングで楽しむ無料ゲーム。先発、打線、救援陣、球場の見方も解説します。",
  alternates: { canonical: "/" }
};

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

      <section className="home-editorial-section" aria-labelledby="home-guides-title">
        <header className="home-editorial-head">
          <div>
            <p className="home-guide-kicker">NPB予想の基本</p>
            <h2 id="home-guides-title">結果だけでなく、予想の根拠を楽しむ</h2>
            <p>
              先発投手、打線、救援陣、球場、日程を順に確認すると、勝敗だけでは見えない試合のポイントが分かります。
              YosoBaseでは、公式記録や天候などの一次情報を確認し、分かっている事実と不確実な材料を分ける手順をまとめています。
            </p>
          </div>
          <Link href="/guide" className="home-btn home-btn-outline">
            ガイド一覧を読む
          </Link>
        </header>

        <div className="home-editorial-grid">
          {GUIDE_ARTICLES.map((guide) => (
            <Link key={guide.href} href={guide.href} className="home-editorial-link">
              <strong>{guide.title}</strong>
              <span>{guide.description}</span>
              <small>更新 {guide.updatedAt.replaceAll("-", ".")}</small>
            </Link>
          ))}
        </div>

        <div className="home-editorial-policy">
          <div>
            <h3>情報は公式発表を優先します</h3>
            <p>
              試合日程と成績はNPB公式情報、天候は気象庁などを確認先として明記しています。
              予想結果を保証せず、記事の公開日・更新日・編集者・出典を表示します。
            </p>
          </div>
          <Link href="/editorial-policy">運営・編集方針を見る</Link>
        </div>
      </section>

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
