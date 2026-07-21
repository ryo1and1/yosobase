import Link from "next/link";
import { EditorialAd } from "@/components/ads/editorial-ad";
import { GuideArticleMeta, GuideSources } from "@/components/guide/guide-article-meta";
import { createGuideMetadata, getGuideArticle } from "@/lib/guides";

const article = getGuideArticle("ballpark-weather");

export const metadata = createGuideMetadata(article);

const checkpoints = [
  "球場ごとの広さやフェンスの特徴を確認する",
  "屋外球場では風、雨、気温を材料として分ける",
  "投手タイプと守備力に天候の影響を重ねる",
  "天候だけで勝敗を決めず、他の材料と合わせて判断する"
];

export default function BallparkWeatherGuidePage() {
  return (
    <article className="guide-page">
      <header className="guide-hero">
        <p className="guide-kicker">YosoBase Editorial Guide</p>
        <h1>球場と天候を予想に入れる</h1>
        <p>
          同じ対戦カードでも、球場や天候によって試合の性格は変わります。長打が出やすい条件か、
          守備に負担がかかる条件かを確認すると、投手と打線の見立てを補正できます。
        </p>
        <GuideArticleMeta article={article} />
      </header>

      <section className="guide-summary" aria-labelledby="ballpark-checklist-title">
        <div>
          <p className="guide-section-label">Condition checklist</p>
          <h2 id="ballpark-checklist-title">確認するポイント</h2>
        </div>
        <ol>
          {checkpoints.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ol>
      </section>

      <div className="guide-body">
        <section className="guide-section">
          <h2>球場の特徴を入口にする</h2>
          <p>
            外野の広さ、フェンスの高さ、ファウルゾーンの広さは、長打や守備の難しさに影響します。
            広い球場では外野守備と走塁が重要になり、狭い球場では一発で試合が動く可能性が高まります。
            ただし球場だけで勝敗を決めるのではなく、両チームの打線と投手タイプを組み合わせて考えます。
          </p>
        </section>

        <section className="guide-section">
          <h2>屋外球場の風と雨</h2>
          <p>
            風が強い日は外野フライの判断が難しくなり、雨が絡む日は守備や投手の制球に影響が出ることがあります。
            中断や開始遅延の可能性がある場合は、先発投手が通常のリズムで投げられない展開も想定します。
            天候は不確実性が高いため、強い根拠というよりリスク調整の材料として扱うと使いやすくなります。
          </p>
        </section>

        <section className="guide-section">
          <h2>投手タイプと合わせて見る</h2>
          <p>
            フライが多い投手、ゴロを打たせる投手、四球で走者を出しやすい投手では、同じ球場でも受ける影響が変わります。
            風で長打が伸びやすい条件ではフライ型の投手に注意し、雨で守備が難しい日はゴロ処理や送球の乱れも考えます。
          </p>
        </section>

        <section className="guide-section">
          <h2>過度に重く見すぎない</h2>
          <p>
            球場や天候は重要ですが、毎試合の勝敗を決定づける材料ではありません。先発、打線、救援陣の評価が近いときに、
            最後の補助材料として使うのが基本です。条件が読みづらい日は、予想の確信度を上げすぎない判断も必要です。
          </p>
        </section>

        <section className="guide-section">
          <h2>天候情報を判断へつなぐ順序</h2>
          <p>
            予報を見たら、その数値をそのまま勝敗へ結びつけるのではなく、試合への影響と不確実性を分けます。
            とくに屋外球場では予報が変わるため、予想を確定する時刻も決めておくと過度な反応を減らせます。
          </p>
          <div className="guide-table-wrap">
            <table className="guide-data-table">
              <caption>球場条件を整理する手順</caption>
              <thead>
                <tr>
                  <th scope="col">情報</th>
                  <th scope="col">起こり得る影響</th>
                  <th scope="col">一緒に見る材料</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <th scope="row">強い風</th>
                  <td>外野フライや長打の距離が変わる</td>
                  <td>風向き、投手の打球傾向、外野守備</td>
                </tr>
                <tr>
                  <th scope="row">雨</th>
                  <td>制球、守備、中断の影響が出る</td>
                  <td>降水の時間帯、グラウンド、継投余力</td>
                </tr>
                <tr>
                  <th scope="row">高温</th>
                  <td>長い試合で負荷が増える</td>
                  <td>開始時刻、先発の投球回、選手起用</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="guide-caption">
            天候は変化します。気象庁と主催球団の最新案内を確認し、中止・開始時刻変更の情報を優先してください。
          </p>
        </section>

        <GuideSources article={article} />

        <EditorialAd className="guide-ad-slot" />

        <section className="guide-note">
          <h2>YosoBaseで使うときの考え方</h2>
          <p>
            球場と天候は、ポイントを大きく寄せる根拠にも、抑える理由にもなります。
            他の材料が揃っていて条件も追い風なら強めに、条件が不安定なら配分を控えめにするのが扱いやすい考え方です。
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
