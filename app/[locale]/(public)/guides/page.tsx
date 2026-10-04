import type { Metadata } from "next";
import type { Locale } from "@/lib/constants";
import { guides } from "@/lib/content/catalog";
import { createPageMetadata } from "@/lib/seo";
import { BlogCard } from "@/components/content/blog-card";
import { Breadcrumb } from "@/components/content/breadcrumb";
import Link from "next/link";

export function generateMetadata({ params }: { params: { locale: Locale } }): Metadata {
  return createPageMetadata({ locale: params.locale, path: "/guides", title: params.locale === "zh" ? "选茶与团体订购指南 | 青云间" : "Tea & Group-Order Guides Singapore | QING YUN JIAN", description: params.locale === "zh" ? "从第一杯茶到办公室与活动团体订购，阅读青云间的实用指南。" : "Choose your first tea and plan office or event group orders with practical QING YUN JIAN guides." });
}
export default function IndexPage({ params }: { params: { locale: Locale } }) {
  const zh = params.locale === "zh";
  return <main className="bg-[#f8f5ed]"><div className="mx-auto max-w-7xl px-5 py-16 md:px-8 md:py-24">
    <Breadcrumb locale={params.locale} items={[{ name: zh ? "首页" : "Home" }, { name: zh ? "选茶与团体订购指南" : "Tea & Group-Order Guides", path: "/guides" }]} />
    <header className="mt-10 max-w-4xl"><p className="text-xs font-bold uppercase tracking-[0.22em] text-gold">QING YUN JIAN</p><h1 className="mt-5 font-serif text-5xl font-semibold leading-tight text-forest md:text-7xl">{zh ? "选茶与团体订购指南" : "Tea & Group-Order Guides"}</h1><p className="mt-7 max-w-2xl text-lg leading-8 text-forest/60">{zh ? "从第一杯茶到办公室与活动团体订购，阅读青云间的实用指南。" : "Choose your first tea and plan office or event group orders with practical QING YUN JIAN guides."}</p><div className="mt-6 flex flex-wrap gap-6 font-bold text-forest underline"><Link href={`/${params.locale}/menu`}>{zh ? "现行菜单" : "Current tea menu"}</Link><Link href={`/${params.locale}/group-orders`}>{zh ? "团体订购申请" : "Group-order request"}</Link><Link href={`/${params.locale}/blog`}>{zh ? "茶饮文章" : "Tea stories"}</Link></div></header>
    <div className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-3">{guides.map(entry => <BlogCard key={entry.slug} entry={entry} locale={params.locale} />)}</div>
  </div></main>;
}
