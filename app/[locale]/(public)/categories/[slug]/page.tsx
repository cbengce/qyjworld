import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { Locale } from "@/lib/constants";
import { allContent, categories, getCategory } from "@/lib/content/catalog";
import { createPageMetadata } from "@/lib/seo";
import { BlogCard } from "@/components/content/blog-card";
import { Breadcrumb } from "@/components/content/breadcrumb";

export function generateStaticParams() { return categories.map((category) => ({ locale: "en", slug: category.slug })); }
export function generateMetadata({ params }: { params: { locale: Locale; slug: string } }): Metadata { const category = getCategory(params.slug); if (!category) return { title: "Category Not Found", robots: { index: false, follow: false } }; return createPageMetadata({ locale: params.locale, path: `/categories/${category.slug}`, title: `${category.name} Articles and Guides | Qing Yun Jian`, description: `Explore practical ${category.name.toLowerCase()} articles and comprehensive guides from the Qing Yun Jian editorial team.`, keywords: [category.name, `${category.name} guide`, "Qing Yun Jian"], includeLanguageAlternates: false }); }
export default function CategoryPage({ params }: { params: { locale: Locale; slug: string } }) { const category = getCategory(params.slug); if (!category) notFound(); const entries = allContent.filter((entry) => entry.categorySlug === category.slug); return <main className="bg-[#f8f5ed]"><div className="mx-auto max-w-7xl px-5 py-16 md:px-8 md:py-24"><Breadcrumb locale={params.locale} items={[{ name: "Home" }, { name: "Categories", path: "/categories" }, { name: category.name, path: `/categories/${category.slug}` }]} /><h1 className="mt-10 font-serif text-6xl font-semibold text-forest md:text-8xl">{category.name}</h1><p className="mt-6 max-w-2xl text-lg leading-8 text-forest/60">Articles and pillar guides for understanding {category.name.toLowerCase()} with clarity and practical context.</p><div className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-3">{entries.map((entry) => <BlogCard key={`${entry.kind}-${entry.slug}`} entry={entry} locale={params.locale} />)}</div></div></main>; }
