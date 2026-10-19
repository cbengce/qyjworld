import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { GalleryGrid } from "@/components/gallery-grid";
import { StructuredData } from "@/components/structured-data";
import type { Locale } from "@/lib/constants";
import { getPublicGallery } from "@/lib/gallery";
import { breadcrumbSchema, createPageMetadata, localizedUrl } from "@/lib/seo";
export const dynamic = "force-dynamic";
export function generateMetadata({ params }: { params: { locale: Locale } }): Metadata {
  const zh = params.locale === "zh";
  return createPageMetadata({ locale: params.locale, path: "/gallery", title: zh ? "青云间画廊｜海报、飞马与门店影像" : "Art Gallery | QING YUN JIAN Posters, Pegasus & Store", description: zh ? "探索青云间的海报、飞马系列、门店照片与合作作品。按主题与媒体类型，发现每件作品背后的故事。" : "Explore QING YUN JIAN posters, Pegasus artwork, store photography and collaborations, organised by collection and media type." });
}
export default async function GalleryPage({ params }: { params: { locale: Locale } }) {
  const entries = await getPublicGallery();
  const locale = params.locale;
  const zh = locale === "zh";
  return <main className="bg-[#fbfaf6] pb-20 text-forest">
    <StructuredData data={[breadcrumbSchema(locale, [{ name: zh ? "首页" : "Home" }, { name: zh ? "青云间画廊" : "Art Gallery", path: "/gallery" }]), { "@context": "https://schema.org", "@type": "CollectionPage", name: zh ? "青云间画廊" : "QING YUN JIAN Art Gallery", url: localizedUrl(locale, "/gallery"), mainEntity: { "@type": "ItemList", itemListElement: entries.map((entry, index) => ({ "@type": "ListItem", position: index + 1, name: entry.title[locale], url: localizedUrl(locale, `/gallery/${entry.slug}`) })) } }]} />
    <div className="mx-auto max-w-7xl px-5 py-12 md:px-8 md:py-20">
      <header className="mb-12 grid items-center gap-8 md:grid-cols-[1fr_0.85fr]">
        <div><p className="text-xs font-bold uppercase tracking-[0.24em] text-[#8a641b]">QING YUN JIAN · CREATIVE COLLECTION</p><h1 className="mt-5 font-serif text-5xl font-semibold leading-tight md:text-7xl">{zh ? "青云间画廊" : "A world beyond the cup."}</h1><p className="mt-6 max-w-lg text-lg leading-8 text-forest/65">{zh ? "从一杯茶的灵感，到飞马的想象，再到门店里的日常。我们的海报、影像与合作故事，都在这里慢慢展开。" : "From the imagination of our Pegasus collection to the everyday life of our store. Discover the posters, images and collaborations behind QING YUN JIAN."}</p><Link href={`/${locale}/menu`} className="focus-ring mt-7 inline-block rounded-full border border-forest/25 px-6 py-3 text-sm font-bold">{zh ? "发现茶饮 →" : "Discover the teas →"}</Link></div>
        <div className="overflow-hidden rounded-[2rem] border border-forest/10 bg-[#edf3e8]"><Image src="/assets/gallery/pegasus-eleven-thumb.webp" alt={zh ? "青云间十一飞马系列海报" : "The eleven Pegasus collection poster"} width={7016} height={9933} className="max-h-[450px] w-full object-contain p-3" priority unoptimized /></div>
      </header>
      <GalleryGrid entries={entries} locale={locale} />
      <aside className="mt-12 border-t border-forest/15 pt-6 text-sm leading-7 text-forest/60">{zh ? "画廊保留历史设计。旧海报中的价格、优惠、二维码及营业时间仅反映当时的版本；现行供应与安排请查看菜单、活动页面或向门店确认。" : "This collection preserves past designs. Prices, offers, QR codes and opening hours on archived posters reflect their original versions. Check the menu, current promotions or the store for today's availability and terms."} <Link href={`/${locale}/promotions`} className="font-semibold underline">{zh ? "查看活动资讯" : "View promotions"}</Link></aside>
    </div>
  </main>;
}
