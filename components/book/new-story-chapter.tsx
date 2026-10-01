import Image from "next/image";
import Link from "next/link";
import { BRAND, type Locale } from "@/lib/constants";
import { BOOK } from "@/lib/book";
import { NEW_BOOK_STORIES, bookStoryText, newBookStoryPath, type NewBookStory } from "@/lib/book-stories";
import { localizedPath } from "@/lib/i18n/routing";
import { breadcrumbSchema, localizedUrl } from "@/lib/seo";
import { StructuredData } from "@/components/structured-data";

export function NewStoryChapter({ story, locale }: { story: NewBookStory; locale: Locale }) {
  const copy = bookStoryText(story, locale);
  const index = NEW_BOOK_STORIES.indexOf(story);
  const previous = NEW_BOOK_STORIES[index - 1];
  const next = NEW_BOOK_STORIES[index + 1];
  const path = newBookStoryPath(story);
  const body = [copy.lead, ...copy.sections.flatMap(section => [section.heading, ...section.paragraphs])].join(" ");
  const wordCount = locale === "zh" ? body.replace(/\s/g, "").length : body.split(/\s+/).length;
  return <main className="bg-paper text-ink">
    <StructuredData data={breadcrumbSchema(locale, [
      { name: "Home" }, { name: BOOK.title, path: "/book" },
      { name: copy.volume, path: "/book" }, { name: copy.title, path }
    ])}/>
    <StructuredData data={{
      "@context": "https://schema.org", "@type": "Article", headline: copy.title,
      description: copy.description, mainEntityOfPage: localizedUrl(locale, path),
      author: { "@type": "Organization", name: BRAND.nameEn },
      publisher: { "@type": "Organization", name: BRAND.nameEn, url: BRAND.domain,
        logo: { "@type": "ImageObject", url: `${BRAND.domain}/assets/qing-yun-jian-logo-official.png` } },
      inLanguage: locale === "zh" ? "zh-SG" : "en-SG", articleSection: copy.volume,
      isPartOf: { "@type": "CreativeWorkSeries", name: BOOK.title, url: `${BRAND.domain}/en/book` },
      wordCount
    }}/>
    <article>
      <header className="border-b border-forest/10 px-5 py-14 md:px-8 md:py-20">
        <div className="mx-auto max-w-5xl">
          <Link className="text-sm font-bold text-forest/55 transition hover:text-forest" href={localizedPath(locale,"/book")}>← The Book of Qing Yun Jian</Link>
          {"zh" in story ? <nav aria-label="Language" className="mt-6 flex gap-6"><Link href={localizedPath("en",path)}>English</Link><Link href={localizedPath("zh",path)}>中文</Link></nav> : null}
          <div className="mt-14 grid gap-6 md:grid-cols-[9rem_minmax(0,1fr)]">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-gold">{copy.volume}</p>
            <div>
              <p className="text-sm font-semibold text-forest/45">{copy.number} · {Math.max(1,Math.ceil(wordCount/(locale === "zh" ? 400 : 200)))} {locale === "zh" ? "分钟阅读" : "min read"}</p>
              <h1 className="mt-5 max-w-4xl font-serif text-5xl font-semibold leading-[1.02] text-forest md:text-7xl">{copy.title}</h1>
              <p className="mt-7 max-w-2xl text-xl leading-8 text-forest/65">{copy.excerpt}</p>
            </div>
          </div>
        </div>
      </header>
      {story.slug === "a-winged-horse-a-simple-invitation" ? <div className="relative mx-auto my-14 aspect-square w-[min(76vw,20rem)] bg-[#071713] p-7 shadow-[0_24px_55px_rgba(7,23,19,0.16)]"><Image src="/assets/qing-yun-jian-logo-official.png" alt="QING YUN JIAN official Pegasus symbol" fill sizes="320px" className="object-contain p-7"/></div> : null}
      <div className="px-5 py-14 md:px-8 md:py-24"><div className="mx-auto grid max-w-5xl gap-10 lg:grid-cols-[9rem_minmax(0,1fr)]">
        <aside className="text-xs font-bold uppercase tracking-[0.2em] text-gold">{copy.number}</aside>
        <div className="max-w-3xl text-lg leading-9 text-forest/80">
          <p className="font-serif text-3xl font-semibold leading-snug text-forest md:text-4xl">{copy.lead}</p>
          {copy.sections.map(section=><section className="mt-14" key={section.heading}>
            <h2 className="font-serif text-3xl font-semibold text-forest md:text-4xl">{section.heading}</h2>
            {section.paragraphs.map(paragraph=><p className="mt-6" key={paragraph}>{paragraph}</p>)}
          </section>)}
          <nav aria-label="Chapter navigation" className="mt-20 grid gap-6 border-t border-forest/15 pt-9 sm:grid-cols-2">
            <Link className="group" href={previous ? localizedPath(locale,newBookStoryPath(previous)) : localizedPath(locale,`/book/origins/${BOOK.volume.chapterTwo.slug}`)}>
              <span className="block text-xs font-bold uppercase tracking-widest text-forest/45">Previous Chapter</span>
              <span className="mt-3 block font-serif text-2xl font-semibold text-forest transition group-hover:text-gold">← {previous ? bookStoryText(previous, locale).title : BOOK.volume.chapterTwo.title}</span>
            </Link>
            {next ? <Link className="group" href={localizedPath(locale,newBookStoryPath(next))}>
              <span className="block text-xs font-bold uppercase tracking-widest text-forest/45">Next Chapter</span>
              <span className="mt-3 block font-serif text-2xl font-semibold text-forest transition group-hover:text-gold">{bookStoryText(next, locale).title} →</span>
            </Link> : <Link className="group" href={localizedPath(locale,"/book")}>
              <span className="block text-xs font-bold uppercase tracking-widest text-forest/45">Return to</span>
              <span className="mt-3 block font-serif text-2xl font-semibold text-forest transition group-hover:text-gold">The Book →</span>
            </Link>}
          </nav>
        </div>
      </div></div>
    </article>
  </main>;
}
