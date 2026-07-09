import type { Metadata } from "next";
import Link from "next/link";
import { EditorialAd } from "@/components/ads/editorial-ad";

export const metadata: Metadata = {
  title: "打線とスタメンの見方",
  description:
    "NPBの試合予想で打線、スタメン、左右相性、得点の作り方をどう確認するかを解説します。"
};

const checkpoints = [
  "上位打線の出塁と中軸の長打がつながっているかを見る",
  "相手先発の左右でスタメンや打順が変わるか確認する",
  "得点が長打依存か、四球や進塁打を絡めたものかを分ける",
  "主力の休養、捕手、代打の使われ方を試合展開に重ねる"
];

export default function BattingLineupGuidePage() {
  return (
    <article className="guide-page">
      <header className="guide-hero">
        <p className="guide-kicker">YosoBase Editorial Guide</p>
        <h1>打線とスタメンの見方</h1>
        <p>
          打線を見るときは、チーム打率や本塁打数だけで判断しないことが大切です。どの打者が出塁し、
          どの打者が返す形になっているかを確認すると、得点の再現性を考えやすくなります。
        </p>
        <p className="guide-updated">最終更新: 2026年7月10日</p>
      </header>

      <section className="guide-summary" aria-labelledby="batting-checklist-title">
        <div>
          <p className="guide-section-label">Lineup checklist</p>
          <h2 id="batting-checklist-title">確認するポイント</h2>
        </div>
        <ol>
          {checkpoints.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ol>
      </section>

      <div className="guide-body">
        <section className="guide-section">
          <h2>得点の入口を見る</h2>
          <p>
            上位打線が出塁できているチームは、長打が出なくても得点機会を作りやすくなります。反対に中軸の長打に頼るチームは、
            一発で試合を動かせる一方で、相手投手に長打を抑えられると得点が止まりやすくなります。
            出塁率、四球、盗塁、進塁打を合わせて見ると、単純な打率よりも攻撃の形が分かります。
          </p>
        </section>

        <section className="guide-section">
          <h2>左右相性と当日の打順</h2>
          <p>
            相手先発が右投手か左投手かで、スタメンや打順を大きく変えるチームがあります。
            普段の成績だけで予想を固めると、当日の打順発表後に前提が変わることがあります。予告先発を確認した後は、
            左右の相性と代替選手の起用傾向を見て、最終判断に余白を残します。
          </p>
        </section>

        <section className="guide-section">
          <h2>直近の得点内容を分ける</h2>
          <p>
            連勝中のチームでも、相手の守備ミスや終盤の押し出しで得点している場合は、打線そのものの状態とは分けて考えます。
            長打、連打、四球、相手のミスのどれで得点したかを見れば、次の試合でも同じ形が期待できるか判断しやすくなります。
          </p>
        </section>

        <section className="guide-section">
          <h2>控え選手と代打も材料にする</h2>
          <p>
            終盤に代打を出しやすいチーム、守備固めを早めに使うチーム、捕手の組み合わせを重視するチームでは、
            スタメンだけでは試合全体を読み切れません。接戦になったときにベンチからどの選択肢が残っているかも、
            終盤の得点可能性を考える材料になります。
          </p>
        </section>

        <EditorialAd className="guide-ad-slot" />

        <section className="guide-note">
          <h2>YosoBaseで使うときの考え方</h2>
          <p>
            打線の評価は、先発投手や球場条件と合わせることで意味が強くなります。長打が出やすい球場で中軸が好調なら強めの根拠になり、
            相手先発との相性が読みにくい日はポイント配分を抑える判断につながります。
          </p>
          <div className="guide-actions">
            <Link href="/guide" className="home-btn home-btn-outline">
              ガイド一覧へ戻る
            </Link>
            <Link href="/" className="home-btn home-btn-primary">
              今日の試合を見る
            </Link>
          </div>
        </section>
      </div>
    </article>
  );
}
