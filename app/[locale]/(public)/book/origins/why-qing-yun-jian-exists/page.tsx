import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { BOOK, BOOK_CHAPTER_PATH, BOOK_CHAPTER_TWO_PATH } from "@/lib/book";
import { BRAND, Locale } from "@/lib/constants";
import { localizedPath } from "@/lib/i18n/routing";
import { breadcrumbSchema, createPageMetadata, localizedUrl } from "@/lib/seo";
import { StructuredData } from "@/components/structured-data";

export function generateMetadata({ params }: { params: { locale: Locale } }): Metadata {
  return createPageMetadata({
    locale: params.locale,
    path: BOOK_CHAPTER_PATH,
    title: "Why Qing Yun Jian Exists | The Book of Qing Yun Jian",
    description: "Chapter One of Origins: the verified purpose and upward-looking philosophy behind QING YUN JIAN.",
    keywords: ["why Qing Yun Jian exists", "Book of Qing Yun Jian", "Born to Ascend", "Qing Yun Jian origins"],
    includeLanguageAlternates: false
  });
}

export default function OriginsChapterOnePage({ params }: { params: { locale: Locale } }) {
  if (params.locale !== "en") {
    redirect(`/en${BOOK_CHAPTER_PATH}`);
  }

  const canonical = localizedUrl(params.locale, BOOK_CHAPTER_PATH);

  return (
    <main className="bg-paper text-ink">
      <StructuredData
        data={breadcrumbSchema(params.locale, [
          { name: "Home" },
          { name: BOOK.title, path: "/book" },
          { name: BOOK.volume.title, path: "/book" },
          { name: BOOK.volume.chapter.title, path: BOOK_CHAPTER_PATH }
        ])}
      />
      <StructuredData
        data={{
          "@context": "https://schema.org",
          "@type": "Article",
          headline: BOOK.volume.chapter.title,
          description: "The verified purpose and upward-looking philosophy behind QING YUN JIAN.",
          mainEntityOfPage: canonical,
          image: `${BRAND.domain}/assets/hero-home-final-v1-final.png`,
          author: { "@type": "Organization", name: BRAND.nameEn },
          publisher: { "@type": "Organization", name: BRAND.nameEn, url: BRAND.domain },
          inLanguage: "en-SG",
          articleSection: `${BOOK.volume.number}: ${BOOK.volume.title}`
        }}
      />

      <article>
        <header className="px-5 py-14 md:px-8 md:py-20">
          <div className="mx-auto max-w-5xl">
            <Link className="text-sm font-bold text-forest/55 transition hover:text-forest" href={localizedPath(params.locale, "/book")}>
              ← The Book of Qing Yun Jian
            </Link>
            <div className="mt-14 grid gap-5 sm:grid-cols-[9rem_1fr]">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-gold">{BOOK.volume.number}</p>
              <div>
                <p className="text-sm font-semibold text-forest/45">{BOOK.volume.title} · {BOOK.volume.chapter.number}</p>
                <h1 className="mt-5 max-w-4xl font-serif text-5xl font-semibold leading-[0.98] text-forest md:text-7xl">
                  {BOOK.volume.chapter.title}
                </h1>
              </div>
            </div>
          </div>
        </header>

        <div className="relative aspect-[16/8] min-h-72 w-full overflow-hidden bg-forest">
          <Image
            alt="Luna Tide tea overlooking a mountain landscape at the QING YUN JIAN terrace"
            className="object-cover"
            fill
            priority
            sizes="100vw"
            src="/assets/hero-home-final-v1-final.png"
            title="QING YUN JIAN — Born to Ascend"
          />
        </div>

        <div className="px-5 py-16 md:px-8 md:py-24">
          <div className="mx-auto grid max-w-5xl gap-12 lg:grid-cols-[9rem_minmax(0,1fr)]">
            <aside>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-gold">Origins</p>
              <p className="mt-3 text-sm leading-6 text-forest/45">Singapore<br />2026</p>
            </aside>

            <div className="max-w-3xl text-lg leading-9 text-forest/75">
              <p className="font-serif text-3xl font-semibold leading-snug text-forest md:text-4xl">
                QING YUN JIAN exists to create a contemporary tea experience in Singapore, informed by Oriental tea culture and expressed for the present.
              </p>

              <h2 className="mt-14 font-serif text-4xl font-semibold text-forest">A name that looks upward</h2>
              <p className="mt-6">
                The name QING YUN JIAN expresses upward movement, aspiration, and the idea of rising towards the clouds. It gives the brand a direction that is hopeful without being hurried: to keep learning, to move with purpose, and to remain open to what comes next.
              </p>

              <h2 className="mt-14 font-serif text-4xl font-semibold text-forest">The Pegasus</h2>
              <p className="mt-6">
                The winged horse carries the same approved meaning. It is a symbol of movement and ascent. Together, the name and Pegasus shape an identity that is calm, modern, and upward-looking.
              </p>

              <h2 className="mt-14 font-serif text-4xl font-semibold text-forest">Beginning in Singapore</h2>
              <p className="mt-6">
                QING YUN JIAN was founded in Singapore in 2026. Its first store is at MacPherson Mall. This is the starting point for a Modern Oriental tea experience: a contemporary expression of tea grounded in a clear sense of place.
              </p>

              <h2 className="mt-14 font-serif text-4xl font-semibold text-forest">Born to Ascend</h2>
              <p className="mt-6">
                Born to Ascend is the brand&apos;s central line. It gathers the meaning of the name and symbol into three words: an invitation to move upwards with thought, restraint, and hope.
              </p>

              <div className="mt-16 border-y border-forest/15 py-10">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-gold">End of Chapter One</p>
                <Link
                  className="group mt-5 inline-flex items-center gap-3 font-serif text-3xl font-semibold text-forest"
                  href={localizedPath(params.locale, BOOK_CHAPTER_TWO_PATH)}
                >
                  Next: {BOOK.volume.chapterTwo.title}
                  <span aria-hidden="true" className="transition-transform group-hover:translate-x-1">→</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </article>
    </main>
  );
}
