import Link from "next/link";
import { EditorialAd } from "@/components/ads/editorial-ad";
import { GuideArticleMeta, GuideSources } from "@/components/guide/guide-article-meta";
import { createGuideMetadata, getGuideArticle } from "@/lib/guides";

const article = getGuideArticle("starting-pitchers");

export const metadata = createGuideMetadata(article);

const checkpoints = [
  "防御率だけでなく、投球回と失点の内訳を見る",
  "四球、被本塁打、奪三振から崩れ方と安定感を考える",
  "直近登板の球数と登板間隔を確認する",
  "相手打線の左右バランスと長打力を合わせて見る"
];

export default function StartingPitchersGuidePage() {
  return (
    <article className="guide-page">
      <header className="guide-hero">
        <p className="guide-kicker">YosoBase Editorial Guide</p>
        <h1>先発投手を見るときの基本</h1>
        <p>
          NPBの予想では、先発投手の比較が最初の軸になります。ただし、防御率の数字だけを見ても試合の流れは読み切れません。
          どのような形で走者を出しているか、長い回を任せられるか、相手打線と噛み合うかを分けて確認します。
        </p>
        <GuideArticleMeta article={article} />
      </header>

      <section className="guide-summary" aria-labelledby="pitcher-checklist-title">
        <div>
          <p className="guide-section-label">Pitcher checklist</p>
          <h2 id="pitcher-checklist-title">確認するポイント</h2>
        </div>
        <ol>
          {checkpoints.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ol>
      </section>

      <div className="guide-body">
        <section className="guide-section">
          <h2>防御率は入口として使う</h2>
          <p>
            防御率は投手の状態を知る入口になりますが、短い期間では一度の大量失点に大きく引っ張られます。
            先発が安定しているかを見るときは、失点数と合わせて投球回を確認します。6回前後を継続して投げている投手なら、
            救援陣への負担を抑えやすく、接戦のまま終盤に入れる可能性が高くなります。
          </p>
        </section>

        <section className="guide-section">
          <h2>四球と被本塁打で崩れ方を見る</h2>
          <p>
            同じ3失点でも、安打を重ねられた失点と、四球から長打を浴びた失点では意味が違います。四球が多い投手は、
            安打が少ない日でも球数が増えやすく、早い回で継投に入ることがあります。被本塁打が多い投手は、
            長打力のある打線や風の影響を受けやすい球場でリスクが上がります。
          </p>
        </section>

        <section className="guide-section">
          <h2>登板間隔と球数を確認する</h2>
          <p>
            直近登板で球数が多かった投手、復帰直後の投手、登板間隔が空いた投手は、普段と同じ投球回を期待しすぎない方が安全です。
            予想では、先発が何回まで投げられそうかを先に置き、その後に救援陣の状態を重ねると試合後半の見方が整理しやすくなります。
          </p>
        </section>

        <section className="guide-section">
          <h2>相手打線との組み合わせを見る</h2>
          <p>
            投手単体の数字が良くても、相手打線の主力と相性が悪い場合は注意が必要です。左投手に強い右打者が並ぶチーム、
            長打よりも出塁と機動力で揺さぶるチームなど、攻撃の形によって投手の負担は変わります。予告先発が発表された後は、
            当日のスタメンが出るまで結論を固定しないことも大切です。
          </p>
        </section>

        <section className="guide-section">
          <h2>数字を並べるときの比較例</h2>
          <p>
            例えば防御率が近い2人を比べるときは、次のように「どこまで投げられそうか」と「崩れるきっかけ」を別の列にします。
            防御率が低い方を自動的に選ぶのではなく、試合後半まで含めた見通しを作るための表です。
          </p>
          <div className="guide-table-wrap">
            <table className="guide-data-table">
              <caption>先発投手を比較する架空の例</caption>
              <thead>
                <tr>
                  <th scope="col">確認項目</th>
                  <th scope="col">投手A</th>
                  <th scope="col">投手B</th>
                  <th scope="col">判断への使い方</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <th scope="row">直近の投球回</th>
                  <td>6回前後で安定</td>
                  <td>5回前後が中心</td>
                  <td>継投に入る時刻を想定する</td>
                </tr>
                <tr>
                  <th scope="row">四球</th>
                  <td>少なめ</td>
                  <td>走者をためやすい</td>
                  <td>球数増加と大量失点の入口を見る</td>
                </tr>
                <tr>
                  <th scope="row">前回の球数</th>
                  <td>通常範囲</td>
                  <td>多め</td>
                  <td>登板間隔と合わせて負荷を考える</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="guide-caption">
            数値は説明用の架空例です。実際の判断では、公式記録の更新日時と当日の登録・スタメン情報を確認します。
          </p>
        </section>

        <GuideSources article={article} />

        <EditorialAd className="guide-ad-slot" />

        <section className="guide-note">
          <h2>YosoBaseで使うときの考え方</h2>
          <p>
            先発投手に差があると感じた試合でも、全ポイントを一方向に寄せる必要はありません。
            救援陣や球場条件に不安がある場合は配分を抑え、根拠が揃った試合にポイントを残す判断も有効です。
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
