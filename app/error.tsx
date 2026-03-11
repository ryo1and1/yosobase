"use client";

import Link from "next/link";

export default function GlobalError({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="panel">
      <h1 className="page-title">エラーが発生しました</h1>
      <p className="section-subtitle">{error.message}</p>
      <div className="actions">
        <button className="btn btn-primary" onClick={reset}>
          再読み込み
        </button>
        <Link href="/" className="btn btn-subtle">
          トップへ
        </Link>
      </div>
    </div>
  );
}
