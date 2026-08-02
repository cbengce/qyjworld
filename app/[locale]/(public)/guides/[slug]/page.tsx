import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { Locale } from "@/lib/constants";
import { guides, getContentSeoImage, getGuide, getRelatedContent } from "@/lib/content/catalog";
import { createPageMetadata } from "@/lib/seo";
import { GuideLayout } from "@/components/content/content-layout";

export function generateStaticParams() { return guides.map((entry) => ({ locale: "en", slug: entry.slug })); }
export function generateMetadata({ params }: { params: { locale: Locale; slug: string } }): Metadata { const entry = getGuide(params.slug); if (!entry) return { title: "Guide Not Found", robots: { index: false, follow: false } }; return createPageMetadata({ locale: params.locale, path: `/guides/${entry.slug}`, title: `${entry.title} | Qing Yun Jian`, description: entry.description, keywords: entry.keywords, image: getContentSeoImage(entry), includeLanguageAlternates: false }); }
export default function GuidePage({ params }: { params: { locale: Locale; slug: string } }) { const entry = getGuide(params.slug); if (!entry) notFound(); return <GuideLayout entry={entry} locale={params.locale} related={getRelatedContent(entry)} />; }
