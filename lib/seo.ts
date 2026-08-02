import type { Metadata } from "next";
import { BRAND, Locale } from "@/lib/constants";

export type PageSeoImage = {
  url: string;
  width: number;
  height: number;
  alt: string;
};

export const SEO_IMAGE: PageSeoImage = {
  url: "/assets/hero-home-final-v1-final.png",
  width: 1672,
  height: 941,
  alt: "Luna Tide sparkling tea on a wooden terrace overlooking mountain scenery"
} as const;

type PageMetadataInput = {
  locale: Locale;
  path?: string;
  title: string;
  description: string;
  keywords?: string[];
  image?: PageSeoImage;
  includeLanguageAlternates?: boolean;
};

export function localizedUrl(locale: Locale, path = "") {
  const normalizedPath = path && !path.startsWith("/") ? `/${path}` : path;
  return `${BRAND.domain}/${locale}${normalizedPath}`;
}

export function createPageMetadata({
  locale,
  path = "",
  title,
  description,
  keywords,
  image = SEO_IMAGE,
  includeLanguageAlternates = true
}: PageMetadataInput): Metadata {
  const canonical = localizedUrl(locale, path);
  const alternateLocale: Locale = locale === "en" ? "zh" : "en";

  return {
    title: { absolute: title },
    description,
    keywords,
    alternates: {
      canonical,
      ...(includeLanguageAlternates ? {
        languages: {
          "en-SG": localizedUrl("en", path),
          "zh-SG": localizedUrl("zh", path),
          "x-default": localizedUrl("en", path)
        }
      } : {})
    },
    openGraph: {
      title,
      description,
      url: canonical,
      siteName: BRAND.nameEn,
      images: [image],
      locale: locale === "zh" ? "zh_SG" : "en_SG",
      alternateLocale: [alternateLocale === "zh" ? "zh_SG" : "en_SG"],
      type: "website"
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image.url]
    },
    robots: {
      index: true,
      follow: true
    }
  };
}

export type BreadcrumbItem = {
  name: string;
  path?: string;
};

export function breadcrumbSchema(locale: Locale, items: BreadcrumbItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: localizedUrl(locale, item.path)
    }))
  };
}
