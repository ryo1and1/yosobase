import Link from "next/link";
import { Lexend } from "next/font/google";

const lexend = Lexend({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"]
});

const ruleCards = [
  {
    title: "対象",
    value: "NPB 12球団",
    description: "YosoBase はプロ野球ファン向けの参加型予想ゲームです。"
  },
  {
    title: "予想形式",
    value: "3択 / 7択",
    description: "ライト向けの3択と、点差まで狙う7択から選んで予想できます。"
  },
  {
    title: "初期ポイント",
    value: "30,000pt",
    description: "1試合あたり合計 1,000pt まで、複数の選択肢に自由配分できます。"
  },
  {
    title: "精算",
    value: "変動オッズ",
    description: "試合開始5分前にオッズが固定され、試合終了後に自動精算されます。"
  }
];

export default function AboutPage() {
  return (
    <div className={`${lexend.className} rules-page`}>
      <section className="rules-head">
        <div>
          <p className="rules-kicker">ルール</p>
          <h1>YosoBase の遊び方</h1>
          <p>MVP 時点の仕様です。予想方式、ポイント、ランキングの基本ルールを確認できます。</p>
        </div>
      </section>

      <section className="rules-card-grid">
        {ruleCards.map((card) => (
          <article key={card.title} className="rules-card">
            <small>{card.title}</small>
            <strong>{card.value}</strong>
            <p>{card.description}</p>
          </article>
        ))}
      </section>

      <section className="rules-detail-card">
        <h2>基本ルール</h2>
        <ol className="rules-list">
          <li>各試合で 3択 または 7択 を選び、合計 1,000pt まで自由に配分して予想します。</li>
          <li>オッズは投票比率から自動計算されます。仮想票を入れて急な乱高下を抑えています。</li>
          <li>予想受付は試合開始 5 分前までです。開始後は投稿も取消もできません。</li>
          <li>試合が `final` になり結果が入ると精算され、獲得ポイントが残高とランキングに反映されます。</li>
          <li>結果訂正が入った場合は、再精算でポイントと成績も自動で補正されます。</li>
        </ol>
      </section>

      <section className="rules-detail-card">
        <h2>ランキングと表示</h2>
        <ul className="rules-list">
          <li>ランキングは日次、週次、月間、シーズンで表示します。</li>
          <li>週次は JST 月曜 00:00 開始、日次は JST 基準で集計します。</li>
          <li>ニックネームが重複しても区別できるよう、公開IDを併記します。</li>
        </ul>
      </section>

      <section className="rules-links">
        <Link href="/" className="home-btn home-btn-outline">
          トップへ戻る
        </Link>
        <Link href="/login" className="home-btn home-btn-primary">
          ログイン / 会員登録
        </Link>
      </section>
    </div>
  );
}
