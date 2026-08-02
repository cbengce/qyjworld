import type { MetadataRoute } from "next";
import { BRAND, locales } from "@/lib/constants";
import { getPublicPromotions } from "@/lib/promotions";

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

  return [
    {
      url: BRAND.domain,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1
    },
    ...localizedPages,
    ...promotionPages
  ];
}
