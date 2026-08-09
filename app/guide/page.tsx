import type { Metadata } from "next";
import Link from "next/link";
import { EditorialAd } from "@/components/ads/editorial-ad";
import { getAppBaseUrl } from "@/lib/app-url";
import { GUIDE_ARTICLES, GUIDE_AUTHOR_NAME } from "@/lib/guides";

export const metadata: Metadata = {
  title: "NPB予想ガイド",
  description:
    "先発投手、打線、救援陣、球場、日程からNPBの試合を予想するための基本的な見方を、YosoBase独自の手順で解説します。",
  alternates: { canonical: "/guide" },
  authors: [{ name: GUIDE_AUTHOR_NAME, url: "/editorial-policy" }]
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

const workflow = [
  {
    title: "前日までに土台を作る",
    body: "対戦カード、球場、予告先発、直近の登板状況を先に確認します。この段階では結論を出さず、当日に変わり得る項目をメモしておきます。先発の変更、主力の休養、開催情報は前提を変えるため、数字より先に更新日時を確認します。"
  },
  {
    title: "当日に打線と救援を重ねる",
    body: "スタメンが発表されたら、左右の組み合わせとベンチに残る選択肢を見ます。前日の救援投手の登板数や連投もここで確認し、先発が早く降りた場合にどの投手が使えるかを想像します。先発と打線だけで作った最初の見立てを、試合後半まで含む形に更新します。"
  },
  {
    title: "確定前に不確実な材料を残す",
    body: "天候、スタメン、選手のコンディションは直前まで変わることがあります。分からない項目を都合よく補わず、『確認できた事実』『そこからの解釈』『まだ分からないこと』の3列に分けます。確信を持てないカードの配分を抑えることも、情報を正しく扱う方法です。"
  },
  {
    title: "試合後に仮説を検証する",
    body: "結果だけでなく、先発が想定した回まで投げたか、得点がどの経路で生まれたか、継投の分岐点はどこだったかを記録します。的中した理由を過大評価せず、外れた理由を一つに決めつけないために、予想前のメモと公式記録を並べて確認します。"
  }
];

export default function GuidePage() {
  const base = getAppBaseUrl();
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "NPB予想ガイド",
    description: metadata.description,
    url: `${base}/guide`,
    inLanguage: "ja-JP",
    dateModified: "2026-08-09",
    author: {
      "@type": "Organization",
      name: GUIDE_AUTHOR_NAME,
      url: `${base}/editorial-policy`
    },
    mainEntity: {
      "@type": "ItemList",
      itemListElement: GUIDE_ARTICLES.map((guide, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: guide.title,
        url: `${base}${guide.href}`
      }))
    }
  };

  return (
    <article className="guide-page">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }}
      />
      <header className="guide-hero">
        <p className="guide-kicker">YosoBase Editorial Guide</p>
        <h1>NPBの試合予想で確認したい5つの材料</h1>
        <p>
          勝敗予想に絶対の方法はありません。YosoBaseでは、公開されている試合情報を一つずつ確認し、
          根拠の強さと不確実性を分けて考えることを基本にしています。このページでは、予想前に確認したい材料と判断の順序を解説します。
        </p>
        <div className="guide-article-meta">
          <span>
            編集: <Link href="/editorial-policy">{GUIDE_AUTHOR_NAME}</Link>
          </span>
          <span>最終更新: 2026年8月9日</span>
        </div>
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
          <h2>情報の更新時刻を先に確認する</h2>
          <p>
            試合予想で起きやすい失敗は、古い情報を正しい前提として扱うことです。予告先発は変更されることがあり、
            スタメンは試合直前に発表され、天候や開催可否も変わります。各情報を見た時刻を残し、最後に確認した時点で
            何が確定しているかを整理してから予想を決めると、後から都合よく理由を作ることを防げます。
          </p>
        </section>

        <section className="guide-section">
          <h2>予想前のワークシート</h2>
          <p>
            次の表は、材料を同じ重さで並べるための簡単な記録例です。数字を点数に変換するものではありません。
            事実と解釈を分け、反対方向の材料も一つ書くことで、最初の印象だけに引っ張られにくくなります。
          </p>
          <div className="guide-table-wrap">
            <table className="guide-data-table">
              <caption>試合前に残すメモの例</caption>
              <thead>
                <tr>
                  <th scope="col">確認項目</th>
                  <th scope="col">確認できた事実</th>
                  <th scope="col">予想への解釈</th>
                  <th scope="col">まだ分からないこと</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <th scope="row">先発</th>
                  <td>直近の投球回と球数を確認</td>
                  <td>終盤まで任せられる可能性を考える</td>
                  <td>当日の球威や制球</td>
                </tr>
                <tr>
                  <th scope="row">打線</th>
                  <td>スタメンと左右の組み合わせを確認</td>
                  <td>出塁と長打の経路を想像する</td>
                  <td>試合中の対応力</td>
                </tr>
                <tr>
                  <th scope="row">救援</th>
                  <td>前日までの登板状況を確認</td>
                  <td>接戦の終盤を守れるか考える</td>
                  <td>監督の起用方針</td>
                </tr>
                <tr>
                  <th scope="row">条件</th>
                  <td>球場、風、雨、日程を確認</td>
                  <td>長打や守備への影響を補正する</td>
                  <td>天候の変化と中断</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="guide-caption">
            表は記録方法を説明するための例です。実際の成績や開催情報は、各記事に記載した公式の確認先で更新状況を確認してください。
          </p>
        </section>

        <section className="guide-summary guide-workflow" aria-labelledby="guide-workflow-title">
          <div>
            <p className="guide-section-label">A repeatable process</p>
            <h2 id="guide-workflow-title">判断の手順を毎回そろえる</h2>
          </div>
          <ol>
            {workflow.map((step) => (
              <li key={step.title}>
                <strong>{step.title}</strong>
                <span>{step.body}</span>
              </li>
            ))}
          </ol>
        </section>

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

        <section className="guide-section">
          <h2>詳しく読む</h2>
          <div className="guide-link-grid">
            {GUIDE_ARTICLES.map((guide) => (
              <Link key={guide.href} href={guide.href} className="guide-link-card">
                <strong>{guide.title}</strong>
                <span>{guide.description}</span>
              </Link>
            ))}
          </div>
        </section>

        <section className="guide-sources" aria-labelledby="guide-editorial-title">
          <p className="guide-section-label">Editorial policy</p>
          <h2 id="guide-editorial-title">情報の扱い方</h2>
          <p>
            YosoBaseのガイドは、NPB公式記録や気象庁などの一次情報を確認するための手順をまとめたものです。
            特定の試合結果を保証せず、数字の更新時刻と不確実な材料を区別して記載します。
          </p>
          <Link href="/editorial-policy">運営・編集方針と訂正方法を確認する</Link>
        </section>

        <EditorialAd className="guide-ad-slot" />

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
