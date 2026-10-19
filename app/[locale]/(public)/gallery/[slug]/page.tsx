import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { StructuredData } from "@/components/structured-data";
import type { Locale } from "@/lib/constants";
import { getPublicGallery, getPublicGalleryEntry } from "@/lib/gallery";
import { mediaLabels, topicLabels } from "@/lib/gallery-model";
import { breadcrumbSchema, createPageMetadata, localizedUrl } from "@/lib/seo";
export const dynamic = "force-dynamic";
type Props = { params: { locale: Locale; slug: string } };
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const entry = await getPublicGalleryEntry(params.slug);
  if (!entry) return { robots: { index: false, follow: false } };
  return createPageMetadata({ locale: params.locale, path: `/gallery/${entry.slug}`, title: `${entry.title[params.locale]} | QING YUN JIAN`, description: entry.caption[params.locale].slice(0, 160) });
}
export default async function GalleryDetail({ params }: Props) {
  const entry = await getPublicGalleryEntry(params.slug);
  if (!entry) notFound();
  const locale = params.locale, zh = locale === "zh";
  const related = (await getPublicGallery()).filter(e => e.slug !== entry.slug && (e.tags.some(tag => entry.tags.includes(tag)) || e.topics.some(topic => entry.topics.includes(topic)))).slice(0, 3);
  const path = `/gallery/${entry.slug}`;
  return <main className="bg-[#fbfaf6] text-forest">
    <StructuredData data={[breadcrumbSchema(locale, [{ name: zh ? "首页" : "Home" }, { name: zh ? "画廊" : "Art Gallery", path: "/gallery" }, { name: entry.title[locale], path }]), { "@context": "https://schema.org", "@type": "CreativeWork", name: entry.title[locale], description: entry.caption[locale], url: localizedUrl(locale, path), image: entry.media !== "video" ? (entry.asset.startsWith("/") ? new URL(entry.asset, localizedUrl(locale)).href : entry.asset) : undefined, inLanguage: zh ? "zh-SG" : "en-SG", keywords: entry.tags.join(", ") }]} />
    <article className="mx-auto max-w-7xl px-5 py-10 md:px-8 md:py-16">
      <Link href={`/${locale}/gallery`} className="focus-ring text-sm font-bold">← {zh ? "返回画廊" : "Back to the gallery"}</Link>
      <div className="mt-8 grid items-start gap-10 lg:grid-cols-[1.3fr_1fr]">
        <figure className="overflow-hidden rounded-2xl border border-forest/10 bg-[#f1eee5] p-3 md:p-5">
          {entry.media === "video" ? <video controls preload="metadata" poster={entry.thumbnail || undefined} src={entry.asset} className="max-h-[80vh] w-full" aria-label={entry.title[locale]} /> : <Image src={entry.asset} alt={entry.title[locale]} width={1800} height={1800} priority unoptimized className="max-h-[85vh] w-full object-contain" />}
          <figcaption className="pt-4 text-center text-xs leading-6 text-forest/60">{mediaLabels[entry.media][locale]}{entry.source ? ` · ${entry.source}` : ""}</figcaption>
        </figure>
        <div className="lg:sticky lg:top-32">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#8a641b]">{entry.topics.map(t => topicLabels[t][locale]).join(" / ")}</p>
          <h1 className="mt-4 font-serif text-4xl font-semibold leading-tight md:text-5xl"><span className="block">{entry.title.en}</span><span className="mt-3 block font-sans text-2xl font-normal text-forest/70">{entry.title.zh}</span></h1>
          <p className="mt-7 whitespace-pre-line text-base leading-8 text-forest/75">{entry.caption[locale]}</p>
          {entry.archived && <aside className="mt-7 rounded-xl border border-[#c6ac72]/40 bg-[#f5edda] p-5 text-sm leading-7 text-forest/75"><strong className="block">{zh ? "历史作品 · 非现行优惠公告" : "Archive artwork · not a current offer"}</strong>{zh ? "原稿中的价格、优惠、二维码、营业时间及产品表述保留了当时的设计，不代表现行安排或经验证的营养数据。最新资料请向门店确认。" : "The original design retains its earlier prices, offers, QR codes, opening hours and product wording. These are not current terms or verified nutritional data. Please check with the store for current details."}</aside>}
          <div className="mt-6 flex flex-wrap gap-2">{entry.tags.map(tag => <span key={tag} className="rounded-full bg-[#eeeee5] px-3 py-2 text-xs">{tag}</span>)}</div>
          <div className="mt-8 flex flex-wrap gap-3"><a className="focus-ring rounded-full border border-forest/20 px-5 py-3 text-sm font-bold" href={entry.asset} target="_blank" rel="noopener noreferrer">{zh ? "打开完整作品" : "Open the full artwork"} ↗</a><Link className="focus-ring rounded-full bg-forest px-5 py-3 text-sm font-bold text-white" href={`/${locale}/menu`}>{zh ? "查看菜单" : "Explore the menu"}</Link><Link className="focus-ring rounded-full border border-forest/20 px-5 py-3 text-sm font-bold" href={`/${locale}/group-orders?source=website`}>{zh ? "团体订购" : "Group orders"}</Link></div>
        </div>
      </div>
      {!!related.length && <section className="mt-16 border-t border-forest/10 pt-8"><h2 className="font-serif text-3xl font-semibold">{zh ? "接着看看" : "Continue exploring"}</h2><div className="mt-6 grid gap-5 sm:grid-cols-3">{related.map(work => <Link key={work.slug} href={`/${locale}/gallery/${work.slug}`} className="focus-ring rounded-xl border border-forest/10 bg-white p-4">{(work.media !== "video" || work.thumbnail) && <Image src={work.thumbnail || work.asset} width={600} height={450} alt={work.title[locale]} unoptimized className="h-44 w-full object-contain" />}<span className="mt-3 block font-semibold">{work.title[locale]} →</span></Link>)}</div></section>}
    </article>
  </main>;
}
