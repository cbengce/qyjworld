import type { MetadataRoute } from "next";
import { BRAND, locales } from "@/lib/constants";

const publicPaths = ["", "/menu", "/membership", "/about", "/contact", "/faq", "/privacy", "/terms"] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  return locales.flatMap((locale) =>
    publicPaths.map((path) => ({
      url: `${BRAND.domain}/${locale}${path}`,
      lastModified: now,
      changeFrequency: path === "" ? "weekly" : "monthly",
      priority: path === "" ? 1 : path === "/menu" || path === "/membership" ? 0.9 : 0.6
    }))
  );
}
