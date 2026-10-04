import { localizeContent } from "@/lib/content/discovery";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import type { Locale } from "@/lib/constants";
import { guides, getContentSeoImage, getGuide, getRelatedContent } from "@/lib/content/catalog";
import { createPageMetadata } from "@/lib/seo";
import { GuideLayout } from "@/components/content/content-layout";

export function generateStaticParams() { return guides.flatMap(entry => (entry.zh ? ["en", "zh"] : ["en"]).map(locale => ({ locale, slug: entry.slug }))); }
export function generateMetadata({ params }: { params: { locale: Locale; slug: string } }): Metadata { const source = getGuide(params.slug); const entry = source ? localizeContent(source, params.locale) : undefined; if (!entry) return { title: "Guide Not Found", robots: { index: false, follow: false } }; return createPageMetadata({ locale: params.locale, path: `/guides/${entry.slug}`, title: `${entry.title} | Qing Yun Jian`, description: entry.description, keywords: entry.keywords, image: getContentSeoImage(entry), includeLanguageAlternates: Boolean(entry.zh) }); }
export default function GuidePage({ params }: { params: { locale: Locale; slug: string } }) { const source = getGuide(params.slug); const entry = source ? localizeContent(source, params.locale) : undefined; if (!entry) notFound(); if (params.locale === "zh" && !entry.zh) redirect(`/en/guides/${entry.slug}`); return <GuideLayout entry={entry} locale={params.locale} related={getRelatedContent(entry)} />; }
