import type { Metadata } from "next";
import type { Locale } from "@/lib/constants";
import { articles } from "@/lib/content/catalog";
import { createPageMetadata } from "@/lib/seo";
import { BlogCard } from "@/components/content/blog-card";
import { Breadcrumb } from "@/components/content/breadcrumb";
import Link from "next/link";

export function generateMetadata({ params }: { params: { locale: Locale } }): Metadata {
  return createPageMetadata({ locale: params.locale, path: "/blog", title: params.locale === "zh" ? "新加坡茶饮与到店指南 | 青云间" : "Tea Stories & Visiting Guides | QING YUN JIAN", description: params.locale === "zh" ? "阅读青云间的气泡茶介绍、选茶比较与 MacPherson Mall 到店指南。" : "Read practical QING YUN JIAN articles about sparkling tea, choosing a drink and visiting MacPherson Mall." });
}
export default function IndexPage({ params }: { params: { locale: Locale } }) {
  const zh = params.locale === "zh";
  return <main className="bg-[#f8f5ed]"><div className="mx-auto max-w-7xl px-5 py-16 md:px-8 md:py-24">
    <Breadcrumb locale={params.locale} items={[{ name: zh ? "首页" : "Home" }, { name: zh ? "新加坡茶饮与到店指南" : "Tea Stories for Modern Singapore", path: "/blog" }]} />
    <header className="mt-10 max-w-4xl"><p className="text-xs font-bold uppercase tracking-[0.22em] text-gold">QING YUN JIAN</p><h1 className="mt-5 font-serif text-5xl font-semibold leading-tight text-forest md:text-7xl">{zh ? "新加坡茶饮与到店指南" : "Tea Stories for Modern Singapore"}</h1><p className="mt-7 max-w-2xl text-lg leading-8 text-forest/60">{zh ? "阅读青云间的气泡茶介绍、选茶比较与 MacPherson Mall 到店指南。" : "Read practical QING YUN JIAN articles about sparkling tea, choosing a drink and visiting MacPherson Mall."}</p><div className="mt-6 flex flex-wrap gap-6 font-bold text-forest underline"><Link href={`/${params.locale}/menu`}>{zh ? "现行菜单" : "Current tea menu"}</Link><Link href={`/${params.locale}/group-orders`}>{zh ? "团体订购申请" : "Group-order request"}</Link><Link href={`/${params.locale}/guides`}>{zh ? "选茶与团购指南" : "Tea & group-order guides"}</Link></div></header>
    <div className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-3">{articles.map(entry => <BlogCard key={entry.slug} entry={entry} locale={params.locale} />)}</div>
  </div></main>;
}
