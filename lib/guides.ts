import type { Metadata } from "next";
import { getAppBaseUrl } from "@/lib/app-url";

export type GuideSource = {
  label: string;
  href: string;
  description: string;
};

export type GuideArticle = {
  slug: string;
  href: string;
  title: string;
  description: string;
  publishedAt: string;
  updatedAt: string;
  sources: readonly GuideSource[];
};

export const GUIDE_AUTHOR_NAME = "YosoBase運営";

export const GUIDE_ARTICLES: readonly GuideArticle[] = [
  {
    slug: "starting-pitchers",
    href: "/guide/starting-pitchers",
    title: "先発投手を見るときの基本",
    description: "防御率だけに寄せず、投球回、四球、球数、登板間隔、相手打線との組み合わせを整理します。",
    publishedAt: "2026-06-29",
    updatedAt: "2026-07-21",
    sources: [
      {
        label: "NPB公式サイト 個人投手成績",
        href: "https://npb.jp/bis/",
        description: "防御率、登板数、投球回などの公式記録を確認します。"
      },
      {
        label: "NPB公式サイト 試合日程・結果",
        href: "https://npb.jp/games/",
        description: "登板日、対戦カード、試合結果を確認します。"
      }
    ]
  },
  {
    slug: "bullpen",
    href: "/guide/bullpen",
    title: "救援陣と継投を読む",
    description: "接戦で勝敗が動きやすい終盤に向けて、連投状況、前日の起用、役割分担を確認します。",
    publishedAt: "2026-06-29",
    updatedAt: "2026-07-21",
    sources: [
      {
        label: "NPB公式サイト 試合日程・結果",
        href: "https://npb.jp/games/",
        description: "直近試合の継投と登板日を確認します。"
      },
      {
        label: "NPB公式サイト 個人投手成績",
        href: "https://npb.jp/bis/",
        description: "救援投手の登板数や投球回を確認します。"
      }
    ]
  },
  {
    slug: "review",
    href: "/guide/review",
    title: "予想結果の振り返り方",
    description: "当たり外れだけで終わらせず、先発、得点過程、継投、想定外の要素を次の判断へ残します。",
    publishedAt: "2026-06-29",
    updatedAt: "2026-07-21",
    sources: [
      {
        label: "NPB公式サイト 試合日程・結果",
        href: "https://npb.jp/games/",
        description: "スコア、責任投手、試合結果を振り返ります。"
      },
      {
        label: "NPB公式サイト 公式記録",
        href: "https://npb.jp/bis/",
        description: "試合後に更新された公式成績を確認します。"
      }
    ]
  },
  {
    slug: "batting-lineup",
    href: "/guide/batting-lineup",
    title: "打線とスタメンの見方",
    description: "打率だけでなく、出塁、長打、左右相性、当日の打順から得点の形を考えます。",
    publishedAt: "2026-07-10",
    updatedAt: "2026-07-21",
    sources: [
      {
        label: "NPB公式サイト 個人打撃成績",
        href: "https://npb.jp/bis/",
        description: "打率、本塁打、打点などの公式記録を確認します。"
      },
      {
        label: "NPB公式サイト 試合日程・結果",
        href: "https://npb.jp/games/",
        description: "直近の得点経過と対戦カードを確認します。"
      }
    ]
  },
  {
    slug: "ballpark-weather",
    href: "/guide/ballpark-weather",
    title: "球場と天候を予想に入れる",
    description: "球場の特徴、風、雨、気温を、投手タイプや守備力と組み合わせて整理します。",
    publishedAt: "2026-07-10",
    updatedAt: "2026-07-21",
    sources: [
      {
        label: "気象庁 天気予報",
        href: "https://www.jma.go.jp/bosai/forecast/",
        description: "屋外球場の地域予報と警報・注意報を確認します。"
      },
      {
        label: "NPB公式サイト 試合日程・結果",
        href: "https://npb.jp/games/",
        description: "開催球場と試合予定を確認します。"
      }
    ]
  },
  {
    slug: "points-strategy",
    href: "/guide/points-strategy",
    title: "ポイント配分の考え方",
    description: "根拠の強い試合と迷う試合を分け、確信度に応じてポイントを配分する考え方を扱います。",
    publishedAt: "2026-07-10",
    updatedAt: "2026-07-21",
    sources: [
      {
        label: "YosoBaseの遊び方",
        href: "/about",
        description: "ポイント上限、締切、精算方法などのサービス内ルールを確認します。"
      },
      {
        label: "NPB公式サイト 試合日程・結果",
        href: "https://npb.jp/games/",
        description: "対象となる試合日程と結果を確認します。"
      }
    ]
  }
] as const;

export function getGuideArticle(slug: string): GuideArticle {
  const article = GUIDE_ARTICLES.find((item) => item.slug === slug);
  if (!article) {
    throw new Error(`Unknown guide article: ${slug}`);
  }
  return article;
}

export function createGuideMetadata(article: GuideArticle): Metadata {
  const base = getAppBaseUrl();
  const canonical = `${base}${article.href}`;

  return {
    title: article.title,
    description: article.description,
    alternates: { canonical },
    authors: [{ name: GUIDE_AUTHOR_NAME, url: `${base}/editorial-policy` }],
    openGraph: {
      type: "article",
      locale: "ja_JP",
      siteName: "YosoBase",
      title: article.title,
      description: article.description,
      url: canonical,
      publishedTime: article.publishedAt,
      modifiedTime: article.updatedAt
    }
  };
}
