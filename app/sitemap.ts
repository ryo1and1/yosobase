import type { MetadataRoute } from "next";
import { getAppBaseUrl } from "@/lib/app-url";
import { GUIDE_ARTICLES } from "@/lib/guides";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = getAppBaseUrl();
  return [
    { url: `${base}/`, changeFrequency: "daily", priority: 1 },
    { url: `${base}/guide`, changeFrequency: "monthly", priority: 0.8 },
    ...GUIDE_ARTICLES.map((article) => ({
      url: `${base}${article.href}`,
      lastModified: article.updatedAt,
      changeFrequency: "monthly" as const,
      priority: 0.7
    })),
    { url: `${base}/editorial-policy`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/about`, changeFrequency: "monthly", priority: 0.4 },
    { url: `${base}/terms`, changeFrequency: "monthly", priority: 0.3 },
    { url: `${base}/privacy`, changeFrequency: "monthly", priority: 0.3 }
  ];
}
