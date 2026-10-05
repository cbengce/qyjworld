import { getMenuItems } from "@/lib/menu";
import type { MetadataRoute } from "next";
import { BRAND, locales } from "@/lib/constants";
import { NEW_BOOK_STORIES, newBookStoryPath } from "@/lib/book-stories";
import { getPublicPromotions } from "@/lib/promotions";
import { allContent, categories } from "@/lib/content/catalog";

const publicPaths = [
  "",
  "/menu",
  "/group-orders",
  "/membership",
  "/about",
  "/contact",
  "/faq",
  "/ascend/leaderboard",
  "/promotions",
  "/privacy",
  "/terms",
  "/ascend"
] as const;

const growthPaths = ["/blog", "/guides", "/categories", "/search"] as const;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const [promotions, menu] = await Promise.all([getPublicPromotions(), getMenuItems()]);
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

  const growthIndexPages: MetadataRoute.Sitemap = growthPaths.flatMap((path) => locales.map(locale => ({
    url: `${BRAND.domain}/${locale}${path}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: path === "/blog" || path === "/guides" ? 0.9 : 0.7
  })));

  const editorialPages: MetadataRoute.Sitemap = allContent.flatMap((entry) => (entry.zh ? locales : ["en"]).map(locale => ({
      url: `${BRAND.domain}/${locale}/${entry.kind === "guide" ? "guides" : "blog"}/${entry.slug}`,
      lastModified: new Date(entry.updatedAt),
      changeFrequency: "monthly",
      priority: entry.kind === "guide" ? 0.85 : 0.75,
      alternates: entry.zh ? { languages: { "en-SG": `${BRAND.domain}/en/${entry.kind === "guide" ? "guides" : "blog"}/${entry.slug}`, "zh-SG": `${BRAND.domain}/zh/${entry.kind === "guide" ? "guides" : "blog"}/${entry.slug}` } } : undefined
    })));

  const categoryPages: MetadataRoute.Sitemap = locales.flatMap(locale => categories.map((category) => ({
      url: `${BRAND.domain}/${locale}/categories/${category.slug}`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.7
    })));

  const bookPages: MetadataRoute.Sitemap = [
    {
      url: `${BRAND.domain}/en/book`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.75
    },
    {
      url: `${BRAND.domain}/en/book/origins/why-qing-yun-jian-exists`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.7
    },
    {
      url: `${BRAND.domain}/en/book/origins/the-mountain-we-wanted-to-climb`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.7
    },
    ...NEW_BOOK_STORIES.flatMap(story => ("zh" in story ? locales : ["en"]).map(locale => ({
      url: `${BRAND.domain}/${locale}${newBookStoryPath(story)}`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.7
    })))
  ];

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
    ...locales.flatMap(locale => menu.map(item => ({ url: `${BRAND.domain}/${locale}/menu/${encodeURIComponent(item.id)}`, changeFrequency: "weekly" as const, priority: 0.8 }))),
    ...categoryPages,
    ...bookPages
  ];
}
