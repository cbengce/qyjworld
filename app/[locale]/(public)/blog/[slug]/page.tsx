import { localizeContent } from "@/lib/content/discovery";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import type { Locale } from "@/lib/constants";
import { articles, getArticle, getContentSeoImage, getRelatedContent } from "@/lib/content/catalog";
import { createPageMetadata } from "@/lib/seo";
import { BlogLayout } from "@/components/content/content-layout";

export function generateStaticParams() { return articles.flatMap(entry => (entry.zh ? ["en", "zh"] : ["en"]).map(locale => ({ locale, slug: entry.slug }))); }
export function generateMetadata({ params }: { params: { locale: Locale; slug: string } }): Metadata {
  const source = getArticle(params.slug); const entry = source ? localizeContent(source, params.locale) : undefined;
  if (!entry) return { title: "Article Not Found", robots: { index: false, follow: false } };
  return createPageMetadata({ locale: params.locale, path: `/blog/${entry.slug}`, title: `${entry.title} | Qing Yun Jian`, description: entry.description, keywords: entry.keywords, image: getContentSeoImage(entry), includeLanguageAlternates: Boolean(entry.zh) });
}
export default function BlogArticlePage({ params }: { params: { locale: Locale; slug: string } }) {
  const source = getArticle(params.slug); const entry = source ? localizeContent(source, params.locale) : undefined; if (!entry) notFound();
  if (params.locale === "zh" && !entry.zh) redirect(`/en/blog/${entry.slug}`);
  return <BlogLayout entry={entry} locale={params.locale} related={getRelatedContent(entry)} />;
}
