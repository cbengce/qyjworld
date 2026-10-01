import Image from "next/image";
import type { Metadata } from "next";
import { GroupOrderForm } from "@/components/group-orders/order-form";
import { getMenuItems } from "@/lib/menu";
import { getPrimaryStore } from "@/lib/stores";
import { createPageMetadata } from "@/lib/seo";
import type { Locale } from "@/lib/constants";
export const dynamic = "force-dynamic";
export function generateMetadata({ params }: { params: { locale: Locale } }): Metadata {
  return createPageMetadata({ locale: params.locale, title: params.locale === "zh" ? "团体订购 | 青云间" : "Group Orders | QING YUN JIAN", description: "Choose tea for your office, gathering or event. Submit a group order request and receive a personalised quotation." });
}
export default async function GroupOrdersPage({ params }: { params: { locale: Locale } }) {
  const [menu, store] = await Promise.all([getMenuItems(), getPrimaryStore()]);
  const zh = params.locale === "zh";
  const available = menu.filter(m => m.availability_status === "available");
  return <main className="bg-[#f8f5ed] pb-20 text-forest"><section className="relative overflow-hidden bg-[#eaf0e3] px-5 py-14 md:px-8 md:py-20"><div aria-hidden="true" className="absolute -right-12 -top-16 h-80 w-80 rounded-full bg-[#f9d6c0]/60 blur-2xl" /><div className="relative mx-auto max-w-6xl lg:pr-[380px]"><p className="text-xs font-bold uppercase tracking-[.25em] text-forest/70">{zh ? "青云间 · 团体订购" : "QING YUN JIAN · Tea, together"}</p><h1 className="mt-5 max-w-3xl font-serif text-5xl leading-[1.08] md:text-7xl">{zh ? <>一杯好茶，<br />一起分享。</> : <>Good tea.<br />Better together.</>}</h1><p className="mt-6 max-w-xl text-lg leading-8 text-forest/70">{zh ? "办公室的午后、朋友的聚会、值得庆祝的一天。挑选大家喜欢的茶饮，把您的安排交给我们一起确认。" : "An office afternoon, a gathering with friends, a day worth celebrating. Choose your teas and let us help plan the details."}</p><a href="#choose-drinks" className="mt-7 inline-flex rounded-full bg-forest px-7 py-4 font-bold text-white">{zh ? "开始挑选茶饮 ↓" : "Build your tea order ↓"}</a><div className="mt-9 flex flex-wrap gap-3 text-sm">{(zh ? ["办公室茶歇", "聚会与活动", "自取或申请配送"] : ["Office tea breaks", "Gatherings & events", "Collection or delivery request"]).map(label => <span key={label} className="rounded-full border border-forest/15 bg-white/50 px-4 py-2">{label}</span>)}</div><div aria-hidden="true" className="absolute right-0 top-8 hidden items-center gap-3 lg:flex">{available.slice(0, 2).map((item, index) => <div key={item.id} className={`w-44 rounded-[1.5rem] bg-white p-3 shadow-[0_20px_55px_rgba(18,60,47,.14)] ${index ? "translate-y-14 rotate-6" : "-rotate-6"}`}><div className="relative h-60 rounded-xl bg-[#fff6e9]">{item.image_url && <Image src={item.image_url} alt="" fill sizes="180px" className="object-contain p-2" />}</div><p className="mt-3 pb-2 text-center font-serif text-xl">{zh ? item.name_zh : item.name_en}</p></div>)}</div></div></section><div className="mx-auto max-w-6xl px-5 pt-12 md:px-8">{store && available.length ? <GroupOrderForm menu={available} locale={params.locale} storeName={store.name} /> : <p className="rounded-2xl bg-white p-8">{zh ? "目前暂无可提交的饮品，请稍后重试。" : "The group-order menu is currently unavailable. Please try again later."}</p>}</div></main>;
}
