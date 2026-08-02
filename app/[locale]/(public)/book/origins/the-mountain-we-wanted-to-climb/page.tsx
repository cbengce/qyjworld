import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { BOOK, BOOK_CHAPTER_PATH, BOOK_CHAPTER_TWO_PATH } from "@/lib/book";
import { BRAND, Locale } from "@/lib/constants";
import { localizedPath } from "@/lib/i18n/routing";
import { breadcrumbSchema, createPageMetadata, localizedUrl } from "@/lib/seo";
import { StructuredData } from "@/components/structured-data";

const chapterStanzas = [
  ["Every meaningful journey begins long before the first step."],
  ["Long before there was a logo.", "Long before there was a recipe.", "Long before there was even a name."],
  ["There was only a mountain.", "Not a mountain of stone,", "but a mountain of purpose."],
  [
    "Every person climbs a different one.",
    "Some pursue knowledge.",
    "Some seek peace.",
    "Some build families.",
    "Some create businesses.",
    "Some simply hope to become a little better than they were yesterday."
  ],
  [
    "We have always believed that success is not standing at the top of the mountain.",
    "Success is having the courage to keep climbing."
  ],
  ["That belief inspired the name Qing Yun Jian."],
  ["In Chinese culture, Qing Yun (青云) has long symbolised rising upward.", "Many interpret it as achievement or success."],
  ["To us, it means something quieter."],
  ["It is not about standing above others.", "It is about becoming the person you were capable of becoming."],
  ["A mountain is never conquered in a single day."],
  ["Every step matters.", "Every setback teaches.", "Every pause prepares.", "Every sunrise offers another beginning."],
  ["Perhaps that is why tea has always belonged in the mountains."],
  [
    "Tea trees do not rush.",
    "They grow with the seasons.",
    "They endure rain.",
    "They welcome sunlight.",
    "They wait patiently before offering their finest leaves."
  ],
  ["The mountain teaches the same lesson.", "Growth cannot be hurried.", "Neither can character."],
  ["Modern life often tells us that faster is always better."],
  ["Faster delivery.", "Faster success.", "Faster decisions.", "Faster lives."],
  ["Yet some of life’s greatest rewards refuse to be rushed."],
  ["Trust.", "Wisdom.", "Craftsmanship.", "Friendship.", "Tea."],
  ["At Qing Yun Jian, we never wanted to create another place where people hurried through another purchase."],
  ["We wanted to create a small space between one destination and the next."],
  ["A quiet interval.", "A moment to breathe.", "A reminder that even ambitious people deserve moments of stillness."],
  ["That is the meaning of Jian (间)."],
  ["It is not simply a place.", "It is a space between moments."],
  ["Between effort and rest.", "Between noise and silence.", "Between today and tomorrow."],
  ["Perhaps everyone needs such a place."],
  ["Not forever.", "Just long enough to remember why they began climbing in the first place."],
  ["Our mountain has never been measured by the number of stores we open.", "Nor by the number of drinks we sell."],
  ["Our mountain is measured differently."],
  [
    "Every time someone discovers that tea can still surprise them.",
    "Every time a young guest chooses tea over habit.",
    "Every time a conversation lasts longer because no one is rushing to leave.",
    "Every time a simple drink becomes a memorable experience."
  ],
  ["Those are the moments that tell us we are still climbing the right mountain."],
  ["The road ahead remains long."],
  ["There will be seasons of uncertainty.", "There will be difficult decisions.", "There will be mistakes we have yet to make."],
  ["That is the nature of every worthwhile journey."],
  ["But mountains are not climbed because they are easy.", "They are climbed because they remind us what we are capable of becoming."],
  ["Every cup we serve carries that quiet hope."],
  ["Not that it changes the world overnight.", "But that it changes one moment."],
  ["One conversation.", "One person."],
  ["And perhaps, over time,", "many more."]
] as const;

const closingReflection = [
  "Every mountain begins at ground level.",
  "Every meaningful journey begins with a single step.",
  "Ours begins again with every cup we serve."
] as const;

const chapterWordCount = [...chapterStanzas.flat(), ...closingReflection].join(" ").trim().split(/\s+/).length;
const chapterReadingMinutes = Math.max(1, Math.ceil(chapterWordCount / 200));

export function generateMetadata({ params }: { params: { locale: Locale } }): Metadata {
  return createPageMetadata({
    locale: params.locale,
    path: BOOK_CHAPTER_TWO_PATH,
    title: "The Mountain We Wanted to Climb | The Book of Qing Yun Jian",
    description: "A reflection on aspiration, patience, growth and the meaning behind the name Qing Yun Jian.",
    keywords: ["Qing Yun Jian", "Born to Ascend", "Qing Yun Jian meaning", "The Book of Qing Yun Jian"],
    includeLanguageAlternates: false
  });
}

export default function OriginsChapterTwoPage({ params }: { params: { locale: Locale } }) {
  if (params.locale !== "en") {
    redirect(`/en${BOOK_CHAPTER_TWO_PATH}`);
  }

  const canonical = localizedUrl(params.locale, BOOK_CHAPTER_TWO_PATH);

  return (
    <main className="bg-paper text-ink">
      <StructuredData
        data={breadcrumbSchema(params.locale, [
          { name: "Home" },
          { name: BOOK.title, path: "/book" },
          { name: BOOK.volume.title, path: "/book" },
          { name: BOOK.volume.chapterTwo.title, path: BOOK_CHAPTER_TWO_PATH }
        ])}
      />
      <StructuredData
        data={{
          "@context": "https://schema.org",
          "@type": "Article",
          headline: BOOK.volume.chapterTwo.title,
          description: "A reflection on aspiration, patience, growth and the meaning behind the name Qing Yun Jian.",
          mainEntityOfPage: canonical,
          image: `${BRAND.domain}/assets/hero-home-final-v1-final.png`,
          author: { "@type": "Organization", name: BRAND.nameEn },
          publisher: {
            "@type": "Organization",
            name: BRAND.nameEn,
            url: BRAND.domain,
            logo: { "@type": "ImageObject", url: `${BRAND.domain}/assets/qing-yun-jian-logo-official.png` }
          },
          inLanguage: "en-SG",
          articleSection: `${BOOK.volume.number}: ${BOOK.volume.title}`,
          isPartOf: { "@type": "CreativeWorkSeries", name: BOOK.title, url: `${BRAND.domain}/en/book` },
          wordCount: chapterWordCount,
          timeRequired: `PT${chapterReadingMinutes}M`
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
                <p className="text-sm font-semibold text-forest/45">
                  {BOOK.volume.title} · {BOOK.volume.chapterTwo.number}
                </p>
                <h1 className="mt-5 max-w-4xl font-serif text-5xl font-semibold leading-[0.98] text-forest md:text-7xl">
                  {BOOK.volume.chapterTwo.title}
                </h1>
                <p className="mt-7 max-w-3xl text-xl leading-8 text-forest/60">{BOOK.volume.chapterTwo.excerpt}</p>
                <p className="mt-5 text-sm font-semibold text-forest/40">{chapterReadingMinutes} min read</p>
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
              <p className="mt-3 text-sm leading-6 text-forest/45">Chapter Two</p>
            </aside>

            <div className="max-w-3xl text-lg leading-9 text-forest/75">
              {chapterStanzas.map((stanza, stanzaIndex) => (
                <p className={stanzaIndex === 0 ? "font-serif text-3xl font-semibold leading-snug text-forest md:text-4xl" : "mt-9"} key={`stanza-${stanzaIndex}`}>
                  {stanza.map((line, lineIndex) => (
                    <span className="block" key={`line-${stanzaIndex}-${lineIndex}`}>{line}</span>
                  ))}
                </p>
              ))}

              <section className="mt-16 border-y border-forest/15 py-10" aria-labelledby="closing-reflection">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-gold" id="closing-reflection">Closing Reflection</p>
                <p className="mt-6 font-serif text-3xl font-semibold leading-snug text-forest">
                  {closingReflection.map((line) => <span className="block" key={line}>{line}</span>)}
                </p>
              </section>

              <nav aria-label="Chapter navigation" className="mt-12 grid gap-5 border-b border-forest/15 pb-10 sm:grid-cols-2">
                <Link className="group py-4" href={localizedPath(params.locale, BOOK_CHAPTER_PATH)}>
                  <span className="text-xs font-bold uppercase tracking-[0.18em] text-forest/40">Previous Chapter</span>
                  <span className="mt-3 block font-serif text-2xl font-semibold text-forest transition group-hover:text-gold">
                    ← {BOOK.volume.chapter.title}
                  </span>
                </Link>
                <div className="border-t border-forest/10 py-4 sm:border-l sm:border-t-0 sm:pl-8">
                  <span className="text-xs font-bold uppercase tracking-[0.18em] text-forest/30">Next Chapter</span>
                  <span className="mt-3 block font-serif text-2xl font-semibold text-forest/30">Coming Soon</span>
                </div>
              </nav>
            </div>
          </div>
        </div>
      </article>
    </main>
  );
}

