import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "NPB予想ガイド",
  description:
    "先発投手、打線、救援陣、球場、日程からNPBの試合を予想するための基本的な見方を、YosoBase独自の手順で解説します。"
};

const checklist = [
  "予告先発の今季成績だけでなく、直近数試合の投球内容を確認する",
  "左右の相性や直近の打順を見て、得点の作り方を想像する",
  "前日の救援投手の登板状況から、終盤の継投余力を考える",
  "球場の広さ、屋外球場の天候、移動を含む日程を確認する",
  "一つの材料だけで決めず、不確実な要素を残したまま判断する"
];

const factors = [
  {
    title: "1. 先発投手",
    body: "最初に見るのは先発投手です。防御率だけで結論を出さず、投球回、奪三振、四球、被本塁打、直近の登板間隔を合わせて確認します。投球回を安定して稼げる先発なら救援陣への負担を減らせます。一方、好成績でも四球が多い投手は、走者をためた一打で試合の流れが変わる可能性があります。"
  },
  {
    title: "2. 打線と得点の形",
    body: "チーム打率だけでなく、上位打線の出塁と中軸の長打がつながっているかを見ます。同じ3得点でも、長打で一気に取ったのか、四球や進塁打を重ねたのかで再現性は異なります。対戦する先発の左右によって打順が変わるチームでは、当日のスタメン発表後に予想を見直す余地を残します。"
  },
  {
    title: "3. 救援陣の登板状況",
    body: "接戦では先発投手と同じくらい救援陣が重要です。勝ちパターンの投手が前日までに連投していないか、延長戦で多くの投手を使っていないかを確認します。終盤を任せる投手が休養十分なら僅差を守りやすく、登板が続いている場合は先発を長く引っ張るなど采配にも影響します。"
  },
  {
    title: "4. 球場と天候",
    body: "球場ごとに外野の広さやファウルゾーン、風の影響は異なります。屋外球場では雨や強風によって守備と長打の出方が変わることがあります。ただし、天候だけを理由に勝敗を決めるのではなく、投手のタイプや両チームの守備力と組み合わせて考えるのが基本です。"
  },
  {
    title: "5. 日程と移動",
    body: "連戦の終盤、遠征からの移動直後、デーゲームの翌日などは選手起用が変わる場合があります。主力の休養日や捕手の組み合わせも予想材料です。日程は単独では小さな要素ですが、戦力が近いカードで判断に迷ったときの補助材料になります。"
  }
];

export default function GuidePage() {
  return (
    <article className="guide-page">
      <header className="guide-hero">
        <p className="guide-kicker">YosoBase Editorial Guide</p>
        <h1>NPBの試合予想で確認したい5つの材料</h1>
        <p>
          勝敗予想に絶対の方法はありません。YosoBaseでは、公開されている試合情報を一つずつ確認し、
          根拠の強さと不確実性を分けて考えることを基本にしています。このページでは、予想前に確認したい材料と判断の順序を解説します。
        </p>
        <p className="guide-updated">最終更新: 2026年6月18日</p>
      </header>

      <section className="guide-summary" aria-labelledby="guide-checklist-title">
        <div>
          <p className="guide-section-label">Quick checklist</p>
          <h2 id="guide-checklist-title">予想前のチェックリスト</h2>
        </div>
        <ol>
          {checklist.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ol>
      </section>

      <div className="guide-body">
        {factors.map((factor) => (
          <section key={factor.title} className="guide-section">
            <h2>{factor.title}</h2>
            <p>{factor.body}</p>
          </section>
        ))}

        <section className="guide-section">
          <h2>予想を組み立てる順序</h2>
          <p>
            最初に先発投手と打線の組み合わせから試合の大きな流れを考えます。次に救援陣、球場、日程を加え、
            最初の見立てを補正します。すべての材料が同じ方向を示すとは限りません。矛盾する材料がある場合は、
            無理に確信度を上げず、配分するポイントを抑える判断も予想の一部です。
          </p>
        </section>

        <section className="guide-section">
          <h2>結果よりも振り返りを残す</h2>
          <p>
            的中した予想でも、偶然の一打や失策に助けられた可能性があります。反対に外れた場合でも、確認した材料と判断過程が妥当なら、
            次の予想に生かせます。試合後は、先発の出来、得点のきっかけ、継投の分岐点を振り返り、事前の想定と違った点を一つ記録すると、
            自分が重視しすぎる材料や見落としやすい材料が分かります。
          </p>
        </section>

        <section className="guide-note">
          <h2>YosoBaseでの楽しみ方</h2>
          <p>
            YosoBaseは金銭を賭けるサービスではありません。付与されたサイト内ポイントを使い、NPBの試合を予想して成績を比較するゲームです。
            予想は試合開始5分前まで変更でき、結果確定後にポイントとランキングへ反映されます。
          </p>
          <div className="guide-actions">
            <Link href="/" className="home-btn home-btn-primary">
              今日の試合を見る
            </Link>
            <Link href="/about" className="home-btn home-btn-outline">
              ルールを確認する
            </Link>
          </div>
        </section>
      </div>
    </article>
  );
}
