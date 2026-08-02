import type { Metadata } from "next";
import type { Locale } from "@/lib/constants";
import { articles } from "@/lib/content/catalog";
import { createPageMetadata } from "@/lib/seo";
import { BlogCard } from "@/components/content/blog-card";
import { Breadcrumb } from "@/components/content/breadcrumb";

export function generateMetadata({ params }: { params: { locale: Locale } }): Metadata {
  return createPageMetadata({ locale: params.locale, path: "/blog", title: "Tea Stories and Insights | Qing Yun Jian Blog", description: "Explore thoughtful articles about Singapore tea, sparkling tea, Oriental tea culture, ingredients, pairings and modern tea rituals.", keywords: ["tea blog Singapore", "sparkling tea articles", "Oriental tea culture"], includeLanguageAlternates: false });
}

export default function BlogIndexPage({ params }: { params: { locale: Locale } }) {
  return <main className="bg-[#f8f5ed]"><div className="mx-auto max-w-7xl px-5 py-16 md:px-8 md:py-24"><Breadcrumb locale={params.locale} items={[{ name: "Home" }, { name: "Blog", path: "/blog" }]} /><header className="mt-10 max-w-4xl"><p className="text-xs font-bold uppercase tracking-[0.22em] text-gold">Tea Journal</p><h1 className="mt-5 font-serif text-6xl font-semibold leading-[0.95] text-forest md:text-8xl">Tea Stories for Modern Singapore.</h1><p className="mt-7 max-w-2xl text-lg leading-8 text-forest/60">Practical, culturally aware writing about tea, ingredients, pairings and the evolving world of modern Oriental beverages.</p></header><div className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-3">{articles.map((entry) => <BlogCard key={entry.slug} entry={entry} locale={params.locale} />)}</div></div></main>;
}
