import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="site-footer-row">
          <Link href="/" className="site-footer-brand">
            <span className="brand-mark">YB</span>
            <span>YosoBase</span>
          </Link>
          <nav className="site-footer-nav">
            <Link href="/privacy">プライバシーポリシー</Link>
            <Link href="/terms">利用規約</Link>
            <Link href="/about">ルール</Link>
          </nav>
          <small>© {new Date().getFullYear()} YosoBase</small>
        </div>
        <small className="site-footer-note">
          YosoBase は日本向けのNPB予想サービスです。ポイントや順位は参考値として提供されます。
        </small>
      </div>
    </footer>
  );
}
