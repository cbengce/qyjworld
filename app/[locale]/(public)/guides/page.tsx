import type { Metadata } from "next";
import type { Locale } from "@/lib/constants";
import { guides } from "@/lib/content/catalog";
import { createPageMetadata } from "@/lib/seo";
import { BlogCard } from "@/components/content/blog-card";
import { Breadcrumb } from "@/components/content/breadcrumb";

export function generateMetadata({ params }: { params: { locale: Locale } }): Metadata { return createPageMetadata({ locale: params.locale, path: "/guides", title: "Complete Tea Guides Singapore | Qing Yun Jian", description: "Read comprehensive guides to sparkling tea, Chinese tea, jasmine, oolong, tea pairing, ingredients and Singapore tea culture.", keywords: ["tea guides Singapore", "sparkling tea guide", "Chinese tea guide"], includeLanguageAlternates: false }); }
export default function GuidesIndexPage({ params }: { params: { locale: Locale } }) { return <main className="bg-[#f8f5ed]"><div className="mx-auto max-w-7xl px-5 py-16 md:px-8 md:py-24"><Breadcrumb locale={params.locale} items={[{ name: "Home" }, { name: "Guides", path: "/guides" }]} /><header className="mt-10 max-w-4xl"><p className="text-xs font-bold uppercase tracking-[0.22em] text-gold">Pillar Guides</p><h1 className="mt-5 font-serif text-6xl font-semibold leading-[0.95] text-forest md:text-8xl">A Deeper Understanding of Tea.</h1><p className="mt-7 max-w-2xl text-lg leading-8 text-forest/60">Structured reference guides for choosing, tasting, pairing and appreciating tea in Singapore.</p></header><div className="mt-14 grid gap-6 md:grid-cols-2">{guides.map((entry) => <BlogCard key={entry.slug} entry={entry} locale={params.locale} />)}</div></div></main>; }
