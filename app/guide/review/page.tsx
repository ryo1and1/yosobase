import Link from "next/link";
import { GuideArticleMeta, GuideSources } from "@/components/guide/guide-article-meta";
import { createGuideMetadata, getGuideArticle } from "@/lib/guides";

const article = getGuideArticle("review");

export const metadata = createGuideMetadata(article);

const checkpoints = [
  "当たった理由と外れた理由を分けて記録する",
  "先発投手の出来が想定通りだったか確認する",
  "得点のきっかけが再現性のあるものだったか考える",
  "次回も使う材料と、過大評価した材料を分ける"
];

export default function ReviewGuidePage() {
  return (
    <article className="guide-page">
      <header className="guide-hero">
        <p className="guide-kicker">YosoBase Editorial Guide</p>
        <h1>予想結果の振り返り方</h1>
        <p>
          予想は当たり外れだけを見ると、偶然の要素に引っ張られやすくなります。大切なのは、事前に見ていた材料が妥当だったか、
          試合後にどの材料を次へ残すかを整理することです。
        </p>
        <GuideArticleMeta article={article} />
      </header>

      <section className="guide-summary" aria-labelledby="review-checklist-title">
        <div>
          <p className="guide-section-label">Review checklist</p>
          <h2 id="review-checklist-title">確認するポイント</h2>
        </div>
        <ol>
          {checkpoints.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ol>
      </section>

      <div className="guide-body">
        <section className="guide-section">
          <h2>当たり外れと判断の良し悪しを分ける</h2>
          <p>
            予想が当たっても、たまたま終盤の失策や一発で決まっただけなら、判断が正しかったとは限りません。
            反対に外れた場合でも、先発や打線の見立てが妥当だったなら、次も使える材料があります。
            結果だけでなく、事前に立てた根拠が試合内容と合っていたかを確認します。
          </p>
        </section>

        <section className="guide-section">
          <h2>先発と得点過程を振り返る</h2>
          <p>
            先発投手が想定した回まで投げたか、四球や長打で崩れたか、相手打線がどのように得点したかを見ます。
            得点が連打で生まれたのか、守備のミスや押し出しが絡んだのかで、次回に残す評価は変わります。
            再現性が高い内容と、偶然性が高い内容を分けることが重要です。
          </p>
        </section>

        <section className="guide-section">
          <h2>継投と終盤の分岐点を見る</h2>
          <p>
            接戦では、どの回で継投に入ったか、主力救援が使えたか、代打や守備固めがどう機能したかを確認します。
            終盤で逆転された試合でも、救援陣の連投を事前に見ていたなら予想の材料としては妥当です。
            見落としていた場合は、次回のチェック項目に追加します。
          </p>
        </section>

        <section className="guide-section">
          <h2>次回に残すメモを短く作る</h2>
          <p>
            振り返りは長く書く必要はありません。「先発の球数を見落とした」「打線の左右相性は有効だった」
            「救援の連投を過大評価した」のように、一つか二つのメモで十分です。次の予想前にそのメモを見返すことで、
            自分の判断の偏りに気づきやすくなります。
          </p>
        </section>

        <section className="guide-section">
          <h2>振り返りを3列に分ける</h2>
          <p>
            振り返りでは、予想前に確認できた情報、試合中に起きたこと、次回の行動を同じ行に残します。
            こうすると、結果を知った後だけもっともらしく理由を作ることを避けやすくなります。
          </p>
          <div className="guide-table-wrap">
            <table className="guide-data-table">
              <caption>試合後メモの書き方の例</caption>
              <thead>
                <tr>
                  <th scope="col">予想前の材料</th>
                  <th scope="col">実際に起きたこと</th>
                  <th scope="col">次回に残す行動</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>先発は6回までと想定</td>
                  <td>四球が増えて4回で降板</td>
                  <td>直近の球数と四球も確認する</td>
                </tr>
                <tr>
                  <td>勝ちパターンは休養十分</td>
                  <td>予定通り終盤を無失点</td>
                  <td>有効だった材料として残す</td>
                </tr>
                <tr>
                  <td>長打力を高く評価</td>
                  <td>守備の乱れが決勝点</td>
                  <td>的中と根拠の妥当性を分ける</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="guide-caption">内容は記録方法を説明する架空の例です。実際の試合では公式記録と見比べて更新します。</p>
        </section>

        <GuideSources article={article} />

        <section className="guide-note">
          <h2>YosoBaseで使うときの考え方</h2>
          <p>
            ランキングは短期的に上下しますが、振り返りを残すと予想の根拠が安定していきます。
            大きく当てた試合だけでなく、迷って配分を抑えた試合も見返すと、ポイント管理の判断材料になります。
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
