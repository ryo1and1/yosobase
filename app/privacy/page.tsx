import Link from "next/link";
import { Lexend } from "next/font/google";

const lexend = Lexend({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"]
});

export default function PrivacyPage() {
  return (
    <div className={`${lexend.className} legal-page`}>
      <section className="legal-head">
        <p className="legal-kicker">プライバシー</p>
        <h1>プライバシーポリシー</h1>
        <p>YosoBase（以下「本サービス」）における個人情報の取扱いを定めます。</p>
      </section>

      <section className="legal-card">
        <h2>1. 取得する情報</h2>
        <ul className="legal-list">
          <li>アカウント情報（ニックネーム、メールアドレス、好きな球団）</li>
          <li>認証情報（セッションID、ログイン状態）</li>
          <li>利用情報（予想履歴、ポイント、ランキング表示用データ）</li>
          <li>運用上必要なアクセスログ、エラー情報</li>
        </ul>
      </section>

      <section className="legal-card">
        <h2>2. 利用目的</h2>
        <ul className="legal-list">
          <li>予想ゲームの提供、結果反映、ランキング表示のため</li>
          <li>ログイン認証および不正利用防止のため</li>
          <li>障害調査、機能改善、運用保守のため</li>
        </ul>
      </section>

      <section className="legal-card">
        <h2>3. 第三者提供</h2>
        <p>法令に基づく場合を除き、本人の同意なく個人情報を第三者へ提供しません。</p>
      </section>

      <section className="legal-card">
        <h2>4. 改定</h2>
        <p>本ポリシーは必要に応じて改定することがあります。重要な変更は本サービス上で告知します。</p>
        <p className="legal-meta">最終更新日: 2026-03-02</p>
      </section>

      <section className="legal-links">
        <Link href="/terms" className="home-btn home-btn-outline">
          利用規約を見る
        </Link>
        <Link href="/" className="home-btn home-btn-primary">
          トップへ戻る
        </Link>
      </section>
    </div>
  );
}
