import type { Metadata } from "next";
import Link from "next/link";
import "@/app/globals.css";
import { HeaderSessionPanel } from "@/components/header-session-panel";
import { SiteFooter } from "@/components/site-footer";
import { getAppBaseUrl } from "@/lib/app-url";

export const metadata: Metadata = {
  metadataBase: new URL(getAppBaseUrl()),
  title: {
    default: "YosoBase | NPB予想ゲーム",
    template: "%s | YosoBase"
  },
  description: "YosoBaseはNPBの試合を予想し、ポイントとランキングで楽しむ無料の予想ゲームです。",
  openGraph: {
    title: "YosoBase | NPB予想ゲーム",
    description: "NPBの試合を予想し、結果に応じたポイントとランキングで楽しめます。",
    type: "website"
  },
  twitter: {
    card: "summary_large_image",
    title: "YosoBase | NPB予想ゲーム",
    description: "NPB試合を予想してランキングを競うゲーム"
  },
  other: {
    "google-adsense-account": "ca-pub-1679412386569499"
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <head />
      <body suppressHydrationWarning>
        <div className="orb orb-a" aria-hidden />
        <div className="orb orb-b" aria-hidden />
        <header className="site-header">
          <div className="container header-inner">
            <div className="header-left">
              <Link className="header-brand" href="/">
                <span className="brand-mark">YB</span>
                <span className="brand-text">YosoBase</span>
              </Link>
              <nav className="header-nav">
                <Link href="/">トップ</Link>
                <Link href="/guide">予想ガイド</Link>
                <Link href="/rankings">ランキング</Link>
                <Link href="/me">成績</Link>
                <Link href="/about">ルール</Link>
              </nav>
            </div>
            <HeaderSessionPanel />
          </div>
        </header>
        <main className="container page-shell">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
