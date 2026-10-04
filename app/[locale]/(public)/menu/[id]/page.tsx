import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { BRAND, type Locale } from "@/lib/constants";
import { getMenuItems } from "@/lib/menu";
import { getPrimaryStore } from "@/lib/stores";
import { breadcrumbSchema, createPageMetadata, localizedUrl } from "@/lib/seo";
import { StructuredData } from "@/components/structured-data";
import { DiscoveryLinks } from "@/components/content/discovery-links";

export const dynamic = "force-dynamic";
const currentMenu = cache(getMenuItems);
export async function generateMetadata({ params }: { params: { locale: Locale; id: string } }): Promise<Metadata> {
  const item = (await currentMenu()).find(item => item.id === params.id);
  if (!item) return { title: "Drink not available", robots: { index: false, follow: true } };
  const zh = params.locale === "zh";
  const name = zh ? item.name_zh || item.name_en : item.name_en;
  return createPageMetadata({ locale: params.locale, path: `/menu/${encodeURIComponent(item.id)}`, title: `${name} | ${zh ? "青云间茶饮" : "QING YUN JIAN Tea Singapore"}`, description: (zh ? item.description_zh || item.description_en : item.description_en) || (zh ? `查看${name}的当前售卖状态、价格与订购入口。` : `Explore ${name}, its current availability, pricing and ordering options at QING YUN JIAN, Singapore.`) });
}
export default async function DrinkPage({ params }: { params: { locale: Locale; id: string } }) {
  const [menu, store] = await Promise.all([currentMenu(), getPrimaryStore()]);
  const item = menu.find(item => item.id === params.id);
  if (!item) notFound();
  const zh = params.locale === "zh";
  const name = zh ? item.name_zh || item.name_en : item.name_en;
  const description = zh ? item.description_zh || item.description_en : item.description_en;
  const available = item.availability_status === "available";
  const url = localizedUrl(params.locale, `/menu/${encodeURIComponent(item.id)}`);
  const category = zh ? item.menu_categories?.name_zh || item.menu_categories?.name_en : item.menu_categories?.name_en;
  const schema = { "@context": "https://schema.org", "@type": "Product", "@id": `${url}#product`, url, name, alternateName: zh ? item.name_en : item.name_zh || undefined, description: description || undefined, category: category || undefined, image: item.image_url ? new URL(item.image_url, BRAND.domain).href : undefined, brand: { "@type": "Brand", name: "QING YUN JIAN" }, ...(available && item.regular_price !== null ? { offers: { "@type": "Offer", price: item.regular_price.toFixed(2), priceCurrency: "SGD", availability: "https://schema.org/InStock", url } } : {}) };
  return <main className="bg-[#f8f5ed] text-forest">
    <StructuredData data={[schema, breadcrumbSchema(params.locale, [{ name: zh ? "首页" : "Home" }, { name: zh ? "菜单" : "Menu", path: "/menu" }, { name, path: `/menu/${encodeURIComponent(item.id)}` }])]} />
    <article className="mx-auto grid max-w-6xl gap-10 px-5 py-14 md:grid-cols-2 md:px-8 md:py-20">
      <div className="relative aspect-square rounded-3xl bg-[#e8efe1]">{item.image_url ? <Image src={item.image_url} alt={name} fill priority sizes="(min-width: 768px) 50vw, 100vw" unoptimized={item.image_url.startsWith("http")} className="object-contain p-8" /> : <div className="flex h-full items-center justify-center font-serif text-4xl">{name}</div>}</div>
      <div className="self-center"><Link href={`/${params.locale}/menu`} className="text-sm font-bold underline">{zh ? "← 返回菜单" : "← Back to the menu"}</Link><p className="mt-8 text-xs font-bold uppercase tracking-[.2em] text-gold">{category || "QING YUN JIAN"}</p><h1 className="mt-4 font-serif text-5xl md:text-6xl">{name}</h1><p className="mt-3 text-lg text-gold">{zh ? item.name_en : item.name_zh}</p>{description && <p className="mt-6 text-lg leading-8 text-forest/75">{description}</p>}
      <p className="mt-6 font-semibold">{available ? (zh ? "现行菜单茶品" : "Currently on the menu") : (zh ? "即将推出 · 暂不可订购" : "Coming soon · not currently orderable")}</p>
      <dl className="mt-6 grid grid-cols-2 gap-4"><div className="rounded-xl bg-white p-5"><dt className="text-sm">{zh ? "普通价格" : "Regular price"}</dt><dd className="mt-2 text-2xl font-bold">{item.regular_price !== null ? `S$${item.regular_price.toFixed(2)}` : zh ? "询问门店" : "Enquire in store"}</dd></div><div className="rounded-xl bg-forest p-5 text-white"><dt className="text-sm">{zh ? "会员价格" : "Member price"}</dt><dd className="mt-2 text-2xl font-bold text-gold">{item.member_price !== null ? `S$${item.member_price.toFixed(2)}` : zh ? "询问门店" : "Enquire in store"}</dd><Link href={`/${params.locale}/membership`} className="mt-2 block text-xs underline">{zh ? "查看会员条件" : "See membership terms"}</Link></div></dl>
      <div className="mt-7 flex flex-wrap gap-3">{available && item.online_ordering_enabled && store?.ordering_url && <a href={store.ordering_url} className="rounded-full bg-forest px-6 py-3 font-bold text-white">{zh ? "在线订购" : "Order online"}</a>}{available && <Link href={`/${params.locale}/group-orders`} className="rounded-full border border-forest/25 px-6 py-3 font-bold">{zh ? "加入团购申请" : "Plan a group order"}</Link>}<Link href={`/${params.locale}/contact`} className="rounded-full border border-forest/25 px-6 py-3 font-bold">{zh ? "到店与询问" : "Visit & enquire"}</Link></div><p className="mt-6 text-sm leading-6 text-forest/65">{zh ? "需要确认原料或调整选项时，请在订购前询问门店。团单的茶品、价格与执行安排须经确认。" : "Ask the store before ordering if you need ingredient or customisation details. Drinks, pricing and fulfilment for group requests require confirmation."}</p>
      </div>
    </article><DiscoveryLinks locale={params.locale} />
  </main>;
}
