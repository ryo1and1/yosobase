import type { MetadataRoute } from "next";
import { getAppBaseUrl } from "@/lib/app-url";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = getAppBaseUrl();
  return [
    { url: `${base}/`, changeFrequency: "daily", priority: 1 },
    { url: `${base}/guide`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/guide/starting-pitchers`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${base}/guide/bullpen`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${base}/guide/review`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${base}/guide/batting-lineup`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${base}/guide/ballpark-weather`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${base}/guide/points-strategy`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${base}/about`, changeFrequency: "monthly", priority: 0.4 },
    { url: `${base}/terms`, changeFrequency: "monthly", priority: 0.3 },
    { url: `${base}/privacy`, changeFrequency: "monthly", priority: 0.3 }
  ];
}
