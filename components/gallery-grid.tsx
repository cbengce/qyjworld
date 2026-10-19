"use client";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { filterGallery, galleryMedia, galleryTopics, mediaLabels, topicLabels, type GalleryEntry } from "@/lib/gallery-model";
import type { Locale } from "@/lib/constants";

export function GalleryGrid({ entries, locale }: { entries: GalleryEntry[]; locale: Locale }) {
  const [media, setMedia] = useState("all");
  const [topic, setTopic] = useState("all");
  const [query, setQuery] = useState("");
  const [tag, setTag] = useState("all");
  const visible = filterGallery(entries, media, topic, query, tag);
  const tags = [...new Set(entries.flatMap(entry => entry.tags))].sort();
  const zh = locale === "zh";
  const pill = (active: boolean) => `focus-ring min-h-11 rounded-full border px-5 py-2 text-sm font-semibold transition ${active ? "border-forest bg-forest text-white" : "border-forest/15 bg-white text-forest hover:border-forest/50"}`;
  return <section aria-label={zh ? "画廊作品" : "Gallery collection"}>
    <div className="space-y-5 rounded-3xl border border-forest/10 bg-[#f1efe6] p-5 md:p-7">
      <div className="flex flex-wrap gap-2" role="group" aria-label={zh ? "媒体类型" : "Media type"}>
        <button type="button" className={pill(media === "all")} aria-pressed={media === "all"} onClick={() => setMedia("all")}>{zh ? "全部媒体" : "All media"}</button>
        {galleryMedia.map(type => <button type="button" key={type} className={pill(media === type)} aria-pressed={media === type} onClick={() => setMedia(type)}>{mediaLabels[type][locale]} <span className="ml-1 opacity-60">{entries.filter(e => e.media === type).length}</span></button>)}
      </div>
      <div className="flex flex-wrap gap-2" role="group" aria-label={zh ? "作品主题" : "Collection"}>
        <button type="button" className={pill(topic === "all")} aria-pressed={topic === "all"} onClick={() => setTopic("all")}>{zh ? "全部主题" : "All collections"}</button>
        {galleryTopics.map(t => <button type="button" key={t} className={pill(topic === t)} aria-pressed={topic === t} onClick={() => setTopic(t)}>{topicLabels[t][locale]}</button>)}
      </div>
      <label className="block max-w-lg text-sm font-semibold text-forest">{zh ? "搜索作品、产品或合作伙伴" : "Find a work, drink or collaboration"}<input className="focus-ring mt-2 min-h-12 w-full rounded-xl border border-forest/20 bg-white px-4 font-normal" value={query} onChange={event => setQuery(event.target.value)} placeholder="Luna Tide · 月汐 · ibis · TEFUDA · Anytime" type="search" /></label>
      <label className="block max-w-lg text-sm font-semibold text-forest">{zh ? "产品／系列／伙伴" : "Product / series / partner"}<select className="focus-ring mt-2 min-h-12 w-full rounded-xl border border-forest/20 bg-white px-4 font-normal" value={tag} onChange={event => setTag(event.target.value)}><option value="all">{zh ? "全部产品与标签" : "All products & tags"}</option>{tags.map(t => <option key={t} value={t}>{t}</option>)}</select></label>
    </div>
    <p className="my-6 text-sm text-forest/65" role="status" aria-live="polite">{visible.length} {zh ? "件作品" : "works"}</p>
    {visible.length ? <div className="grid items-start gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {visible.map(entry => <article key={entry.slug} className="group overflow-hidden rounded-2xl border border-forest/10 bg-white shadow-[0_10px_30px_rgba(18,60,47,0.04)]">
        <Link href={`/${locale}/gallery/${entry.slug}`} className="focus-ring block" aria-label={entry.title[locale]}>
          <div className="relative flex aspect-[4/3] items-center justify-center overflow-hidden bg-[#f1eee5] p-3">
            {entry.media !== "video" || entry.thumbnail ? <Image src={entry.thumbnail || entry.asset} alt={entry.title[locale]} fill sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw" className="object-contain p-3 transition duration-500 group-hover:scale-[1.025]" unoptimized /> : <span className="text-5xl text-forest" aria-hidden="true">▷</span>}
            <span className="absolute left-4 top-4 rounded-full bg-white/95 px-3 py-1 text-xs font-bold text-forest shadow-sm">{mediaLabels[entry.media][locale]}</span>
          </div>
          <div className="p-6">
            {entry.archived && <p className="text-xs font-bold uppercase tracking-widest text-[#8a641b]">{zh ? "历史作品" : "From the archive"}</p>}
            <h2 className="mt-2 font-serif text-2xl font-semibold text-forest"><span className="block">{entry.title.en}</span><span className="mt-1 block font-sans text-base font-normal text-forest/65">{entry.title.zh}</span></h2>
            <p className="mt-4 line-clamp-2 text-sm leading-6 text-forest/65">{entry.caption[locale]}</p>
            <div className="mt-5 flex flex-wrap gap-2">{entry.tags.slice(0, 3).map(tag => <span key={tag} className="rounded-full bg-[#f1efe6] px-3 py-1 text-xs text-forest/70">{tag}</span>)}</div>
            <span className="mt-5 inline-block text-sm font-bold text-forest">{zh ? "查看作品与故事 →" : "Explore the work →"}</span>
          </div>
        </Link>
      </article>)}
    </div> : <div className="rounded-2xl border border-forest/10 bg-white p-10 text-center"><p className="text-forest/70">{zh ? "这个组合暂时没有作品。试试其他主题或搜索词。" : "No works in this selection yet. Try another collection or search."}</p><button type="button" className={pill(false) + " mt-5"} onClick={() => { setMedia("all"); setTopic("all"); setQuery(""); setTag("all"); }}>{zh ? "清除筛选" : "Clear filters"}</button></div>}
  </section>;
}
