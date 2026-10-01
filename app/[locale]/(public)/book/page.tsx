import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { BOOK, BOOK_CHAPTER_PATH, BOOK_CHAPTER_TWO_PATH } from "@/lib/book";
import { NEW_BOOK_STORIES, newBookStoryPath } from "@/lib/book-stories";
import { BRAND, Locale } from "@/lib/constants";
import { localizedPath } from "@/lib/i18n/routing";
import { breadcrumbSchema, createPageMetadata } from "@/lib/seo";
import { StructuredData } from "@/components/structured-data";

export function generateMetadata({ params }: { params: { locale: Locale } }): Metadata {
  return createPageMetadata({
    locale: params.locale,
    path: "/book",
    title: "The Book of Qing Yun Jian | Born to Ascend",
    description: "Read the continuing story of QING YUN JIAN: its origins, first address, modern tea direction and Pegasus symbol.",
    keywords: ["Book of Qing Yun Jian", "Born to Ascend", "Qing Yun Jian philosophy", "Modern Oriental tea"],
    includeLanguageAlternates: false
  });
}

export default function BookPage({ params }: { params: { locale: Locale } }) {
  if (params.locale !== "en") {
    redirect("/en/book");
  }

  const chapterHref = localizedPath(params.locale, BOOK_CHAPTER_PATH);
  const chapterTwoHref = localizedPath(params.locale, BOOK_CHAPTER_TWO_PATH);

  return (
    <main className="overflow-hidden bg-paper text-ink">
      <StructuredData data={breadcrumbSchema(params.locale, [{ name: "Home" }, { name: BOOK.title, path: "/book" }])} />

      <section className="border-b border-forest/10 px-5 py-16 md:px-8 md:py-24 lg:py-28">
        <div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-[minmax(0,1fr)_26rem] lg:gap-20">
          <div className="max-w-4xl">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-gold">QING YUN JIAN</p>
            <h1 className="mt-6 font-serif text-6xl font-semibold leading-[0.92] text-forest sm:text-7xl lg:text-8xl">
              The Book of
              <br />
              Qing Yun Jian
            </h1>
            <p className="mt-8 max-w-2xl text-lg leading-8 text-forest/65 md:text-xl">
              Stories and reflections on the beginning of QING YUN JIAN, its first address and a contemporary way to meet tea.
            </p>
          </div>

          <div className="relative mx-auto aspect-square w-full max-w-sm overflow-hidden bg-[#071713] shadow-[0_32px_90px_rgba(7,23,19,0.18)]">
            <Image
              alt="QING YUN JIAN gold Pegasus symbol"
              className="object-contain p-10"
              fill
              priority
              sizes="(min-width: 1024px) 416px, 80vw"
              src="/assets/qing-yun-jian-logo-official.png"
              title="QING YUN JIAN — Born to Ascend"
            />
          </div>
        </div>
      </section>

      <section className="px-5 py-16 md:px-8 md:py-24">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-5 border-b border-forest/15 pb-10 md:grid-cols-[12rem_1fr] md:items-end">
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-gold">{BOOK.volume.number}</p>
            <h2 className="font-serif text-5xl font-semibold leading-none text-forest md:text-7xl">{BOOK.volume.title}</h2>
          </div>

          <div className="grid lg:grid-cols-2">
            <Link
              className="group border-b border-forest/15 py-10 transition-colors hover:bg-white/55 sm:px-8 lg:border-r lg:px-10 lg:py-14"
              href={chapterHref}
            >
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-gold">Published</p>
              <p className="mt-8 text-sm font-semibold text-forest/45">{BOOK.volume.chapter.number}</p>
              <h3 className="mt-4 max-w-xl font-serif text-4xl font-semibold leading-tight text-forest md:text-5xl">
                {BOOK.volume.chapter.title}
              </h3>
              <span className="mt-9 inline-flex items-center gap-3 text-sm font-bold text-forest">
                Read Chapter
                <span aria-hidden="true" className="transition-transform group-hover:translate-x-1">→</span>
              </span>
            </Link>

            <Link
              className="group border-b border-forest/15 py-10 transition-colors hover:bg-white/55 sm:px-8 lg:px-10 lg:py-14"
              href={chapterTwoHref}
            >
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-gold">Published</p>
              <p className="mt-8 text-sm font-semibold text-forest/45">{BOOK.volume.chapterTwo.number}</p>
              <h3 className="mt-4 max-w-xl font-serif text-4xl font-semibold leading-tight text-forest md:text-5xl">
                {BOOK.volume.chapterTwo.title}
              </h3>
              <span className="mt-9 inline-flex items-center gap-3 text-sm font-bold text-forest">
                Read Chapter
                <span aria-hidden="true" className="transition-transform group-hover:translate-x-1">→</span>
              </span>
            </Link>
          </div>

          <div className="grid lg:grid-cols-2">
            {NEW_BOOK_STORIES.filter(story => story.volume === "Origins").map(story => <Link
              className="group border-b border-forest/15 py-10 transition-colors hover:bg-white/55 sm:px-8 lg:px-10 lg:py-14"
              href={localizedPath(params.locale,newBookStoryPath(story))} key={story.slug}
            >
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-gold">Published</p>
              <p className="mt-8 text-sm font-semibold text-forest/45">{story.number}</p>
              <h3 className="mt-4 max-w-xl font-serif text-4xl font-semibold leading-tight text-forest md:text-5xl">{story.title}</h3>
              <p className="mt-5 max-w-xl leading-7 text-forest/60">{story.excerpt}</p>
              <span className="mt-9 inline-flex items-center gap-3 text-sm font-bold text-forest">Read Chapter <span aria-hidden="true" className="transition-transform group-hover:translate-x-1">→</span></span>
            </Link>)}
          </div>

          <div className="grid gap-5 border-b border-forest/15 pb-10 pt-20 md:grid-cols-[12rem_1fr] md:items-end">
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-gold">Volume II</p>
            <h2 className="font-serif text-5xl font-semibold leading-none text-forest md:text-7xl">Expression</h2>
          </div>
          <div className="grid lg:grid-cols-2">
            {NEW_BOOK_STORIES.filter(story => story.volume === "Expression").map(story => <Link
              className="group border-b border-forest/15 py-10 transition-colors hover:bg-white/55 sm:px-8 lg:px-10 lg:py-14"
              href={localizedPath(params.locale,newBookStoryPath(story))} key={story.slug}
            >
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-gold">Published</p>
              <p className="mt-8 text-sm font-semibold text-forest/45">{story.number}</p>
              <h3 className="mt-4 max-w-xl font-serif text-4xl font-semibold leading-tight text-forest md:text-5xl">{story.title}</h3>
              <p className="mt-5 max-w-xl leading-7 text-forest/60">{story.excerpt}</p>
              <span className="mt-9 inline-flex items-center gap-3 text-sm font-bold text-forest">Read Chapter <span aria-hidden="true" className="transition-transform group-hover:translate-x-1">→</span></span>
            </Link>)}
          </div>
        </div>
      </section>

      <section className="bg-[#071713] px-5 py-16 text-white md:px-8 md:py-20">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <p className="font-serif text-4xl font-semibold md:text-5xl">{BRAND.tagline}</p>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-gold">{BRAND.line}</p>
        </div>
      </section>
    </main>
  );
}
