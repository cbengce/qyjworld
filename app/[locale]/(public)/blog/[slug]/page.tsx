import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { Locale } from "@/lib/constants";
import { articles, getArticle, getContentSeoImage, getRelatedContent } from "@/lib/content/catalog";
import { createPageMetadata } from "@/lib/seo";
import { BlogLayout } from "@/components/content/content-layout";

export function generateStaticParams() { return articles.map((entry) => ({ locale: "en", slug: entry.slug })); }
export function generateMetadata({ params }: { params: { locale: Locale; slug: string } }): Metadata {
  const entry = getArticle(params.slug);
  if (!entry) return { title: "Article Not Found", robots: { index: false, follow: false } };
  return createPageMetadata({ locale: params.locale, path: `/blog/${entry.slug}`, title: `${entry.title} | Qing Yun Jian`, description: entry.description, keywords: entry.keywords, image: getContentSeoImage(entry), includeLanguageAlternates: false });
}
export default function BlogArticlePage({ params }: { params: { locale: Locale; slug: string } }) {
  const entry = getArticle(params.slug); if (!entry) notFound();
  return <BlogLayout entry={entry} locale={params.locale} related={getRelatedContent(entry)} />;
}
