import Image from "next/image";
import Link from "next/link";
import type { Locale } from "@/lib/constants";
import type { ContentEntry } from "@/lib/content/types";

export function BlogCard({ entry, locale }: { entry: ContentEntry; locale: Locale }) {
  const base = entry.kind === "guide" ? "guides" : "blog";
  return (
    <article className="overflow-hidden bg-white shadow-[0_24px_65px_rgba(10,24,20,0.08)]">
      <Link className="group block" href={`/${locale}/${base}/${entry.slug}`}>
        <div className="relative aspect-[16/10] overflow-hidden bg-[#e8eee8]">
          <Image alt={entry.heroAlt} className="object-cover transition duration-500 group-hover:scale-[1.015]" fill sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw" src={entry.heroImage} title={entry.title} />
        </div>
        <div className="p-6 md:p-8">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-gold">{entry.category}</p>
          <h2 className="mt-4 font-serif text-3xl font-semibold leading-tight text-forest">{entry.title}</h2>
          <p className="mt-4 line-clamp-3 leading-7 text-forest/60">{entry.description}</p>
          <p className="mt-5 text-sm font-semibold text-forest/45">{entry.readingTime} min read</p>
        </div>
      </Link>
    </article>
  );
}
