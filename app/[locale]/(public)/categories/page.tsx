import type { Metadata } from "next";
import Link from "next/link";
import type { Locale } from "@/lib/constants";
import { categories } from "@/lib/content/catalog";
import { createPageMetadata } from "@/lib/seo";
import { Breadcrumb } from "@/components/content/breadcrumb";

export function generateMetadata({ params }: { params: { locale: Locale } }): Metadata { return createPageMetadata({ locale: params.locale, path: "/categories", title: "Tea Topics and Categories | Qing Yun Jian", description: "Browse Qing Yun Jian articles and guides by sparkling tea, Chinese tea, ingredients, pairings, culture and lifestyle.", keywords: ["tea topics", "tea categories", "Qing Yun Jian guides"], includeLanguageAlternates: false }); }
export default function CategoriesPage({ params }: { params: { locale: Locale } }) { return <main className="bg-[#f8f5ed]"><div className="mx-auto max-w-7xl px-5 py-16 md:px-8 md:py-24"><Breadcrumb locale={params.locale} items={[{ name: "Home" }, { name: "Categories", path: "/categories" }]} /><h1 className="mt-10 font-serif text-6xl font-semibold text-forest md:text-8xl">Explore Tea by Topic.</h1><div className="mt-14 grid gap-px bg-forest/10 md:grid-cols-2 lg:grid-cols-3">{categories.map((category) => <Link key={category.slug} className="bg-white p-8 hover:bg-[#fbfaf6]" href={`/${params.locale}/categories/${category.slug}`}><h2 className="font-serif text-3xl font-semibold text-forest">{category.name}</h2><p className="mt-3 text-forest/55">{category.count} {category.count === 1 ? "resource" : "resources"}</p></Link>)}</div></div></main>; }
