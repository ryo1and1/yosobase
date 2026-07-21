import Link from "next/link";
import type { GuideArticle } from "@/lib/guides";
import { GUIDE_AUTHOR_NAME } from "@/lib/guides";
import { getAppBaseUrl } from "@/lib/app-url";

function formatDate(date: string): string {
  return date.replace(/^(\d{4})-(\d{2})-(\d{2})$/, "$1年$2月$3日");
}

export function GuideArticleMeta({ article }: { article: GuideArticle }) {
  const base = getAppBaseUrl();
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description: article.description,
    inLanguage: "ja-JP",
    datePublished: article.publishedAt,
    dateModified: article.updatedAt,
    mainEntityOfPage: `${base}${article.href}`,
    author: {
      "@type": "Organization",
      name: GUIDE_AUTHOR_NAME,
      url: `${base}/editorial-policy`
    },
    publisher: {
      "@type": "Organization",
      name: "YosoBase",
      url: base
    }
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }}
      />
      <div className="guide-article-meta">
        <span>
          編集: <Link href="/editorial-policy">{GUIDE_AUTHOR_NAME}</Link>
        </span>
        <span>公開: {formatDate(article.publishedAt)}</span>
        <span>更新: {formatDate(article.updatedAt)}</span>
      </div>
    </>
  );
}

export function GuideSources({ article }: { article: GuideArticle }) {
  return (
    <section className="guide-sources" aria-labelledby={`${article.slug}-sources-title`}>
      <p className="guide-section-label">Primary sources</p>
      <h2 id={`${article.slug}-sources-title`}>確認に使う一次情報</h2>
      <p>
        記事の考え方は一般的な確認手順です。実際の予想では、更新日時を確認したうえで公式情報を参照してください。
      </p>
      <ul>
        {article.sources.map((source) => (
          <li key={source.href}>
            <a href={source.href}>{source.label}</a>
            <span>{source.description}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
