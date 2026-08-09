import Link from "next/link";
import { GuideArticleMeta, GuideSources } from "@/components/guide/guide-article-meta";
import { createGuideMetadata, getGuideArticle } from "@/lib/guides";

const article = getGuideArticle("points-strategy");

export const metadata = createGuideMetadata(article);

const checkpoints = [
  "根拠が揃っている試合と迷う試合を分ける",
  "先発、打線、救援陣の材料が同じ方向か確認する",
  "不確実な材料が多い日は配分を抑える",
  "一日の結果ではなく、継続して判断を整える"
];

export default function PointsStrategyGuidePage() {
  return (
    <article className="guide-page">
      <header className="guide-hero">
        <p className="guide-kicker">YosoBase Editorial Guide</p>
        <h1>ポイント配分の考え方</h1>
        <p>
          YosoBaseでは、勝敗を選ぶだけでなくポイントをどう配分するかも予想の一部です。
          強く見えるカードに寄せる判断と、迷うカードで抑える判断を分けると、結果に振り回されにくくなります。
        </p>
        <GuideArticleMeta article={article} />
      </header>

      <section className="guide-summary" aria-labelledby="points-checklist-title">
        <div>
          <p className="guide-section-label">Point checklist</p>
          <h2 id="points-checklist-title">確認するポイント</h2>
        </div>
        <ol>
          {checkpoints.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ol>
      </section>

      <div className="guide-body">
        <section className="guide-section">
          <h2>根拠が揃う試合を探す</h2>
          <p>
            先発投手、打線、救援陣、球場条件が同じ方向を示している試合は、比較的ポイントを配分しやすくなります。
            例えば先発に安定感があり、相手打線との相性も良く、救援陣も休めている場合は、根拠が重なっている状態です。
            反対に材料が割れている試合は、無理に強い結論へ寄せない方が安定します。
          </p>
        </section>

        <section className="guide-section">
          <h2>不確実性を点数化しない</h2>
          <p>
            雨、主力の休養、当日のスタメン、救援陣の起用方針などは、直前まで読みづらい材料です。
            不確実な材料が多い試合では、勝敗予想そのものよりもポイント量を控える判断が重要になります。
            予想に自信がないことを認めるのも、長く続けるうえでは有効な選択です。
          </p>
        </section>

        <section className="guide-section">
          <h2>全試合を同じ強さで見ない</h2>
          <p>
            その日の全カードに同じようにポイントを置くと、根拠が強い試合と迷う試合の差が反映されません。
            まず注目するカードを絞り、残りの試合は控えめにする方法もあります。予想の目的は全試合で大きく勝負することではなく、
            判断しやすい場面を見つけることです。
          </p>
        </section>

        <section className="guide-section">
          <h2>振り返りで配分を調整する</h2>
          <p>
            結果が外れたときは、勝敗の読み違いだけでなくポイント配分も見直します。
            根拠が薄い試合に多く置きすぎていなかったか、逆に根拠が揃った試合で慎重になりすぎていなかったかを確認します。
            少しずつ配分の癖を把握すると、次の予想で判断しやすくなります。
          </p>
        </section>

        <section className="guide-section">
          <h2>確信度を配分へ置き換える例</h2>
          <p>
            ポイント量は「当たる確率」を厳密に示す数字ではなく、自分の根拠の強さを比較する目印として使います。
            毎回同じ基準で3段階に分けると、直前の感情だけで配分を変えることを減らせます。
          </p>
          <div className="guide-table-wrap">
            <table className="guide-data-table">
              <caption>1試合あたりの配分を考える架空の例</caption>
              <thead>
                <tr>
                  <th scope="col">確信度</th>
                  <th scope="col">材料の状態</th>
                  <th scope="col">配分の考え方</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <th scope="row">高い</th>
                  <td>先発、打線、救援が同じ方向</td>
                  <td>上限内で相対的に厚くする</td>
                </tr>
                <tr>
                  <th scope="row">中間</th>
                  <td>主な根拠はあるが反対材料もある</td>
                  <td>一方向へ寄せすぎず余力を残す</td>
                </tr>
                <tr>
                  <th scope="row">低い</th>
                  <td>スタメンや天候など未確定が多い</td>
                  <td>見送るか、配分を小さくする</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="guide-caption">
            配分は説明用の考え方です。YosoBaseのポイントは現金や賞品へ交換できず、金銭を賭けるサービスではありません。
          </p>
        </section>

        <GuideSources article={article} />

        <section className="guide-note">
          <h2>YosoBaseで使うときの考え方</h2>
          <p>
            ポイント配分は、予想の根拠を可視化するための仕組みです。大きく当てることだけを狙わず、
            迷う試合で抑える判断も含めて、自分の予想スタイルを作っていくのが長く楽しむコツです。
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
