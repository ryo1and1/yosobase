import type { Metadata } from "next";
import Link from "next/link";
import "@/app/globals.css";
import { HeaderAccountMenu } from "@/components/header-account-menu";
import { SiteFooter } from "@/components/site-footer";
import { getAppBaseUrl } from "@/lib/app-url";
import { fetchHeaderAccount } from "@/lib/data";
import { getViewerUserId } from "@/lib/guest-user";

export const metadata: Metadata = {
  metadataBase: new URL(getAppBaseUrl()),
  title: {
    default: "YosoBase | NPB予想ゲーム",
    template: "%s | YosoBase"
  },
  description: "YosoBaseはNPBの試合を予想してポイントを競うMVP向け運用アプリです。",
  openGraph: {
    title: "YosoBase | NPB予想ゲーム",
    description: "毎日の試合を予想し、結果入力と精算でランキングを更新できます。",
    type: "website"
  },
  twitter: {
    card: "summary_large_image",
    title: "YosoBase | NPB予想ゲーム",
    description: "NPB試合を予想してランキングを競うゲーム"
  }
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const viewerUserId = await getViewerUserId();
  let headerPoints = 0;
  let headerAvatarLabel = "AC";

  if (viewerUserId) {
    try {
      const account = await fetchHeaderAccount(viewerUserId);
      headerPoints = account.pointBalance;
      const trimmedName = account.displayName?.trim() ?? "";
      headerAvatarLabel = Array.from(trimmedName)[0]?.toUpperCase() ?? "U";
    } catch {
      headerPoints = 0;
      headerAvatarLabel = "U";
    }
  }

  return (
    <html lang="ja">
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
                <Link href="/rankings">ランキング</Link>
                <Link href="/me">成績</Link>
                <Link href="/about">ルール</Link>
              </nav>
            </div>

            <div className="header-tools">
              {viewerUserId ? (
                <>
                  <div className="header-points">
                    <span>保有ポイント</span>
                    <strong>{headerPoints.toLocaleString()} pt</strong>
                  </div>
                  <HeaderAccountMenu avatarLabel={headerAvatarLabel} />
                </>
              ) : (
                <Link href="/login" className="header-auth-link">
                  ログイン / 登録
                </Link>
              )}
            </div>
          </div>
        </header>
        <main className="container page-shell">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}

