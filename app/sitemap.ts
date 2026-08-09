import type { MetadataRoute } from "next";
import { getAppBaseUrl } from "@/lib/app-url";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = getAppBaseUrl();
  return [
    { url: `${base}/`, changeFrequency: "daily", priority: 1 },
    { url: `${base}/guide`, lastModified: "2026-08-09", changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/editorial-policy`, lastModified: "2026-08-09", changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/about`, changeFrequency: "monthly", priority: 0.4 },
    { url: `${base}/terms`, changeFrequency: "monthly", priority: 0.3 },
    { url: `${base}/privacy`, changeFrequency: "monthly", priority: 0.3 }
  ];
}
