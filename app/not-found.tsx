import Link from "next/link";

export default function NotFoundPage() {
  return (
    <section className="not-found-page">
      <div className="not-found-card">
        <p className="not-found-kicker">Page Not Found</p>
        <p className="not-found-code">404</p>
        <h1 className="not-found-title">ページが見つかりません</h1>
        <p className="not-found-copy">
          指定したURLのページは存在しないか、移動した可能性があります。
          <br />
          トップページまたは試合日程から再度アクセスしてください。
        </p>
        <div className="not-found-actions">
          <Link href="/" className="home-btn home-btn-primary">
            トップへ戻る
          </Link>
          <Link href="/schedule" className="home-btn home-btn-outline">
            試合日程を見る
          </Link>
        </div>
      </div>
    </section>
  );
}
