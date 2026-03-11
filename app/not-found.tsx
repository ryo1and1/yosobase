import Link from "next/link";

export default function NotFoundPage() {
  return (
    <section className="panel">
      <h1 className="page-title">ページが見つかりません</h1>
      <p className="section-subtitle">URLを確認するか、トップページから再度アクセスしてください。</p>
      <div className="actions">
        <Link href="/" className="btn btn-primary">
          トップへ戻る
        </Link>
      </div>
    </section>
  );
}
