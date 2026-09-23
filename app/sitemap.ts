import type { MetadataRoute } from "next";
import { TRENDING_NAMES } from "@/lib/trending";
import { slugify } from "@/lib/utils";

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://example.com";

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: siteUrl, changeFrequency: "weekly", priority: 1 },
  ];

  const celebrityRoutes: MetadataRoute.Sitemap = TRENDING_NAMES.map((name) => ({
    url: `${siteUrl}/celebrity/${slugify(name)}`,
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  return [...staticRoutes, ...celebrityRoutes];
}
