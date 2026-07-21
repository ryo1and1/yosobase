import Link from "next/link";
import { EditorialAd } from "@/components/ads/editorial-ad";
import { GuideArticleMeta, GuideSources } from "@/components/guide/guide-article-meta";
import { createGuideMetadata, getGuideArticle } from "@/lib/guides";

const article = getGuideArticle("bullpen");

export const metadata = createGuideMetadata(article);

const checkpoints = [
  "勝ちパターンの投手が前日までに連投していないかを見る",
  "延長戦や大量失点後に使った投手の人数を確認する",
  "先発が短い回で降りた場合の代替投手を想定する",
  "僅差の終盤でどちらが主導権を持ちやすいかを整理する"
];

export default function BullpenGuidePage() {
  return (
    <article className="guide-page">
      <header className="guide-hero">
        <p className="guide-kicker">YosoBase Editorial Guide</p>
        <h1>救援陣と継投を読む</h1>
        <p>
          NPBの接戦では、6回以降の継投で勝敗が動くことがあります。先発投手の比較だけで終わらせず、
          前日までの登板状況と勝ちパターンの使われ方を見ておくと、終盤のリスクを判断しやすくなります。
        </p>
        <GuideArticleMeta article={article} />
      </header>

      <section className="guide-summary" aria-labelledby="bullpen-checklist-title">
        <div>
          <p className="guide-section-label">Bullpen checklist</p>
          <h2 id="bullpen-checklist-title">確認するポイント</h2>
        </div>
        <ol>
          {checkpoints.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ol>
      </section>

      <div className="guide-body">
        <section className="guide-section">
          <h2>勝ちパターンの疲労を見る</h2>
          <p>
            終盤を任される投手が連投中の場合、通常より早い回で別の投手が起用されることがあります。
            抑えの投手だけでなく、7回、8回を任される投手の登板数も確認します。接戦を守る力が落ちている日は、
            先発の出来が良くても終盤に同点や逆転の余地が残ります。
          </p>
        </section>

        <section className="guide-section">
          <h2>前日の試合展開を読む</h2>
          <p>
            延長戦、雨天中断、先発の早期降板があった翌日は、救援陣の使い方が変わりやすくなります。
            反対に、大差の試合で主力の救援投手を温存できていれば、翌日の接戦で有利に働くことがあります。
            前日の勝敗だけでなく、どの投手を何人使ったかまで見ると判断が安定します。
          </p>
        </section>

        <section className="guide-section">
          <h2>先発の投球回とセットで考える</h2>
          <p>
            救援陣が万全でも、先発が早く降りると中盤から負担が増えます。逆に救援陣に不安があるチームでも、
            先発が長い回を投げられる見込みなら弱点が表に出にくくなります。先発と救援を別々に評価するのではなく、
            何回から継投に入るかを想定して組み合わせます。
          </p>
        </section>

        <section className="guide-section">
          <h2>僅差の終盤を具体的に想像する</h2>
          <p>
            1点差、2点差の終盤でどちらが主導権を持つかを想像すると、ポイント配分を決めやすくなります。
            リードしているチームが万全の継投を組めるなら、そのまま逃げ切る根拠になります。
            反対に主力救援が使いにくい状況なら、終盤に追いつかれる可能性も残します。
          </p>
        </section>

        <section className="guide-section">
          <h2>前日までの起用を整理する例</h2>
          <p>
            救援陣はチーム全体の防御率だけでは状態をつかみにくいため、役割ごとに直近の負荷を整理します。
            「登板したか」だけでなく、球数、連投、延長戦の有無を分けると、当日使える選択肢が見えます。
          </p>
          <div className="guide-table-wrap">
            <table className="guide-data-table">
              <caption>救援陣の状態を整理する架空の例</caption>
              <thead>
                <tr>
                  <th scope="col">役割</th>
                  <th scope="col">直近2日</th>
                  <th scope="col">確認したい点</th>
                  <th scope="col">予想への反映</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <th scope="row">抑え</th>
                  <td>2日連続で登板</td>
                  <td>球数と3連投の起用傾向</td>
                  <td>1点差の逃げ切りを強く見すぎない</td>
                </tr>
                <tr>
                  <th scope="row">セットアッパー</th>
                  <td>前日は休養</td>
                  <td>8回以外での起用可能性</td>
                  <td>終盤の代替手段として残す</td>
                </tr>
                <tr>
                  <th scope="row">ロング要員</th>
                  <td>前日に複数回</td>
                  <td>先発早期降板時の代役</td>
                  <td>中盤の不確実性を上げる</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="guide-caption">役割と起用状況は説明用の架空例です。チームの運用は時期や登録選手によって変わります。</p>
        </section>

        <GuideSources article={article} />

        <EditorialAd className="guide-ad-slot" />

        <section className="guide-note">
          <h2>YosoBaseで使うときの考え方</h2>
          <p>
            救援陣の不安は、勝敗を逆転させる材料にも、ポイント配分を抑える材料にもなります。
            先発、打線、救援の評価が揃っている試合ほど強めに配分し、終盤に不確実性がある試合では余力を残す判断が向いています。
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
