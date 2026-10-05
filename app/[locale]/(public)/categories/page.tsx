import type { Metadata } from "next";
import Link from "next/link";
import type { Locale } from "@/lib/constants";
import { categories } from "@/lib/content/catalog";
import { categoryLabel } from "@/lib/content/discovery";
import { createPageMetadata } from "@/lib/seo";
import { Breadcrumb } from "@/components/content/breadcrumb";
export function generateMetadata({ params }: { params: { locale: Locale } }): Metadata {
  const zh = params.locale === "zh";
  return createPageMetadata({ locale: params.locale, path: "/categories", title: zh ? "茶饮主题与分类 | 青云间" : "Tea Topics and Categories | Qing Yun Jian", description: zh ? "按气泡茶、茶饮原料、搭配与日常选茶浏览青云间中英文文章。" : "Browse QING YUN JIAN articles and guides by drink style, ingredients, pairing and occasion." });
}
export default function CategoriesPage({ params }: { params: { locale: Locale } }) {
  const zh = params.locale === "zh";
  return <main className="bg-[#f8f5ed]"><div className="mx-auto max-w-7xl px-5 py-16 md:px-8 md:py-24"><Breadcrumb locale={params.locale} items={[{ name: zh ? "首页" : "Home" }, { name: zh ? "茶饮主题" : "Categories", path: "/categories" }]} /><h1 className="mt-10 font-serif text-5xl font-semibold text-forest md:text-7xl">{zh ? "按主题探索茶饮。" : "Explore Tea by Topic."}</h1><div className="mt-14 grid gap-px bg-forest/10 md:grid-cols-2 lg:grid-cols-3">{categories.map(category => <Link key={category.slug} className="bg-white p-8 hover:bg-[#fbfaf6]" href={`/${params.locale}/categories/${category.slug}`}><h2 className="font-serif text-3xl font-semibold text-forest">{categoryLabel(category.name, params.locale)}</h2><p className="mt-3 text-forest/55">{category.count} {zh ? "篇文章与指南" : "articles and guides"}</p></Link>)}</div></div></main>;
}
