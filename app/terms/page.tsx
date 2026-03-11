import Link from "next/link";
import { Lexend } from "next/font/google";

const lexend = Lexend({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"]
});

export default function TermsPage() {
  return (
    <div className={`${lexend.className} legal-page`}>
      <section className="legal-head">
        <p className="legal-kicker">規約</p>
        <h1>利用規約</h1>
        <p>YosoBase の利用条件を定めます。利用開始時点で本規約に同意したものとみなします。</p>
      </section>

      <section className="legal-card">
        <h2>1. サービス内容</h2>
        <ul className="legal-list">
          <li>本サービスはNPB試合の予想とポイント競争を提供します。</li>
          <li>試合データは運営が登録・更新した内容を基準とします。</li>
        </ul>
      </section>

      <section className="legal-card">
        <h2>2. アカウント</h2>
        <ul className="legal-list">
          <li>登録情報は正確かつ最新の内容を維持してください。</li>
          <li>アカウント管理責任は利用者本人にあります。</li>
          <li>不正アクセスが疑われる場合は速やかに運営へ連絡してください。</li>
        </ul>
      </section>

      <section className="legal-card">
        <h2>3. 禁止事項</h2>
        <ul className="legal-list">
          <li>法令違反、公序良俗違反、サービス運営を妨害する行為</li>
          <li>不正な手段によるポイント操作、データ改ざん、なりすまし行為</li>
          <li>他ユーザーまたは第三者の権利侵害行為</li>
        </ul>
      </section>

      <section className="legal-card">
        <h2>4. 免責</h2>
        <ul className="legal-list">
          <li>外部データ遅延や天候等により、表示・精算反映が遅れる場合があります。</li>
          <li>本サービス停止・障害に伴う損害について、運営は法令の範囲で責任を負います。</li>
        </ul>
        <p className="legal-meta">最終更新日: 2026-03-02</p>
      </section>

      <section className="legal-links">
        <Link href="/privacy" className="home-btn home-btn-outline">
          プライバシーポリシーを見る
        </Link>
        <Link href="/" className="home-btn home-btn-primary">
          トップへ戻る
        </Link>
      </section>
    </div>
  );
}
