import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { Locale } from "@/lib/constants";
import { allContent, categories, getCategory } from "@/lib/content/catalog";
import { categoryLabel } from "@/lib/content/discovery";
import { createPageMetadata } from "@/lib/seo";
import { BlogCard } from "@/components/content/blog-card";
import { Breadcrumb } from "@/components/content/breadcrumb";
export function generateStaticParams() { return categories.flatMap(category => ["en", "zh"].map(locale => ({ locale, slug: category.slug }))); }
export function generateMetadata({ params }: { params: { locale: Locale; slug: string } }): Metadata {
  const category = getCategory(params.slug); if (!category) return { title: "Category Not Found", robots: { index: false, follow: false } };
  const name = categoryLabel(category.name, params.locale);
  return createPageMetadata({ locale: params.locale, path: `/categories/${category.slug}`, title: params.locale === "zh" ? `${name}文章与指南 | 青云间` : `${name} Articles and Guides | Qing Yun Jian`, description: params.locale === "zh" ? `阅读青云间的${name}文章，了解选茶、菜单资料与分享茶饮。` : `Explore practical ${name.toLowerCase()} articles and guides from QING YUN JIAN.` });
}
export default function CategoryPage({ params }: { params: { locale: Locale; slug: string } }) {
  const category = getCategory(params.slug); if (!category) notFound(); const zh = params.locale === "zh"; const name = categoryLabel(category.name, params.locale); const entries = allContent.filter(entry => entry.categorySlug === category.slug);
  return <main className="bg-[#f8f5ed]"><div className="mx-auto max-w-7xl px-5 py-16 md:px-8 md:py-24"><Breadcrumb locale={params.locale} items={[{ name: zh ? "首页" : "Home" }, { name: zh ? "茶饮主题" : "Categories", path: "/categories" }, { name, path: `/categories/${category.slug}` }]} /><h1 className="mt-10 font-serif text-5xl font-semibold text-forest md:text-7xl">{name}</h1><p className="mt-6 max-w-2xl text-lg leading-8 text-forest/60">{zh ? "围绕这一主题，继续了解菜单、个人选择与茶饮体验。" : "Explore this topic through drink information, personal choices and practical tea experiences."}</p><div className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-3">{entries.map(entry => <BlogCard key={`${entry.kind}-${entry.slug}`} entry={entry} locale={params.locale} />)}</div></div></main>;
}
