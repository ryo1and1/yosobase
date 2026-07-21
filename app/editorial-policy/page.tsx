import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "運営・編集方針",
  description:
    "YosoBaseの運営主体、記事の作成方針、参照する一次情報、更新・訂正方法、広告掲載方針を案内します。",
  alternates: { canonical: "/editorial-policy" }
};

export default function EditorialPolicyPage() {
  return (
    <article className="legal-page">
      <header className="legal-head">
        <p className="legal-kicker">Editorial policy</p>
        <h1>運営・編集方針</h1>
        <p>YosoBaseが公開する予想ガイドとサービス情報の作成・更新ルールを案内します。</p>
      </header>

      <section className="legal-card">
        <h2>運営とサイトの目的</h2>
        <p>
          YosoBaseは、NPBの試合を観戦するときに、先発投手、打線、救援陣、球場条件などを順序立てて確認し、
          サイト内ポイントで予想を楽しむためのサービスです。運営・編集はYosoBase運営が行います。
        </p>
        <p>
          本サービスは日本野球機構、各球団、選手その他の関係団体が運営する公式サービスではありません。
          金銭や賞品を賭ける機能、ポイントを現金へ交換する機能はありません。
        </p>
      </section>

      <section className="legal-card">
        <h2>記事で参照する情報</h2>
        <p>
          試合日程、結果、選手成績はNPB公式サイトなどの一次情報を優先します。天候を扱う記事では気象庁の予報を参照し、
          開催可否や開始時刻の変更については主催者の最新発表を優先します。各記事の末尾に主な確認先を明記します。
        </p>
        <p>
          記事内の表やケースは、特定の試合結果を断定するものではありません。説明用の例は架空であることを明記し、
          実在する選手や試合の数字を掲載する場合は、対象期間と確認日を示します。
        </p>
      </section>

      <section className="legal-card">
        <h2>作成・更新・訂正</h2>
        <ul className="legal-list">
          <li>記事ごとに公開日、更新日、編集者、主な情報源を表示します。</li>
          <li>結果を保証する表現を避け、事実、見方、判断例を区別します。</li>
          <li>ルールやデータの参照先が変わった場合は、該当記事を確認して更新します。</li>
          <li>誤りを確認した場合は本文を訂正し、内容に影響する変更では更新日も変更します。</li>
        </ul>
      </section>

      <section className="legal-card">
        <h2>広告掲載方針</h2>
        <p>
          広告を掲載する場合は、独自の本文が中心となる編集記事に限定します。ログイン、登録、エラー、ナビゲーション、
          ランキング、予想入力など、操作を主目的とする画面には広告を配置しません。広告であることが分かる表示と余白を設け、
          本文や操作を妨げない位置に掲載します。
        </p>
      </section>

      <section className="legal-card">
        <h2>お問い合わせ</h2>
        <p>
          記事の誤り、リンク切れ、掲載内容に関する連絡は
          {" "}
          <a href="mailto:contact@yosobase.com">contact@yosobase.com</a>
          {" "}
          へお送りください。確認に必要なページURLと該当箇所を添えていただくと、内容を特定しやすくなります。
        </p>
        <p className="legal-meta">制定・最終更新: 2026年7月21日</p>
      </section>

      <nav className="legal-links" aria-label="関連ページ">
        <Link href="/guide" className="home-btn home-btn-outline">
          予想ガイドを見る
        </Link>
        <Link href="/privacy" className="home-btn home-btn-outline">
          プライバシーポリシー
        </Link>
        <Link href="/" className="home-btn home-btn-primary">
          トップへ戻る
        </Link>
      </nav>
    </article>
  );
}
