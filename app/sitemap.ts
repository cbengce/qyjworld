import type { MetadataRoute } from "next";
import { BRAND, locales } from "@/lib/constants";
import { getPublicPromotions } from "@/lib/promotions";
import { allContent, categories } from "@/lib/content/catalog";

const publicPaths = [
  "",
  "/menu",
  "/membership",
  "/about",
  "/contact",
  "/faq",
  "/leaderboard",
  "/promotions",
  "/privacy",
  "/terms"
] as const;

const growthPaths = ["/blog", "/guides", "/categories", "/search"] as const;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const promotions = await getPublicPromotions();
  const localizedPages: MetadataRoute.Sitemap = locales.flatMap((locale) =>
    publicPaths.map((path) => ({
      url: `${BRAND.domain}/${locale}${path}`,
      lastModified: now,
      changeFrequency: path === "" ? "weekly" : "monthly",
      priority: path === "" ? 1 : path === "/menu" || path === "/membership" ? 0.9 : 0.6
    }))
  );

  const promotionPages: MetadataRoute.Sitemap = locales.flatMap((locale) =>
    promotions.map((promotion) => ({
      url: `${BRAND.domain}/${locale}/promotions/${promotion.slug}`,
      lastModified: new Date(promotion.updated_at),
      changeFrequency: "weekly",
      priority: 0.7
    }))
  );

  const growthIndexPages: MetadataRoute.Sitemap = growthPaths.map((path) => ({
    url: `${BRAND.domain}/en${path}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: path === "/blog" || path === "/guides" ? 0.9 : 0.7
  }));

  const editorialPages: MetadataRoute.Sitemap = allContent.map((entry) => ({
      url: `${BRAND.domain}/en/${entry.kind === "guide" ? "guides" : "blog"}/${entry.slug}`,
      lastModified: new Date(entry.updatedAt),
      changeFrequency: "monthly",
      priority: entry.kind === "guide" ? 0.85 : 0.75
    }));

  const categoryPages: MetadataRoute.Sitemap = categories.map((category) => ({
      url: `${BRAND.domain}/en/categories/${category.slug}`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.7
    }));

  return [
    {
      url: BRAND.domain,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1
    },
    ...localizedPages,
    ...promotionPages,
    ...growthIndexPages,
    ...editorialPages,
    ...categoryPages
  ];
}
