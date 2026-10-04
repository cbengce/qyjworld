import Link from "next/link";
import Image from "next/image";
import { BOOK, BOOK_CHAPTER_PATH, BOOK_CHAPTER_TWO_PATH } from "@/lib/book";
import { NEW_BOOK_STORIES, bookStoryText, newBookStoryPath } from "@/lib/book-stories";
import { type Locale } from "@/lib/constants";
import { localizedPath } from "@/lib/i18n/routing";

export function StoryDirectory({ locale }: { locale: Locale }) {
  const zh = locale === "zh";
  const chapters = [
    { volume: "Origins", number: BOOK.volume.chapter.number, title: BOOK.volume.chapter.title, excerpt: BOOK.description, path: BOOK_CHAPTER_PATH, locale: "en" as Locale },
    { volume: "Origins", number: BOOK.volume.chapterTwo.number, title: BOOK.volume.chapterTwo.title, excerpt: BOOK.volume.chapterTwo.excerpt, path: BOOK_CHAPTER_TWO_PATH, locale: "en" as Locale },
    ...NEW_BOOK_STORIES.map(story => ({ ...bookStoryText(story, locale), volume: story.volume, path: newBookStoryPath(story), locale: "zh" in story ? locale : "en" as Locale }))
  ];
  const groups = [
    { volume: "Origins", title: zh ? "我们的起点" : "Our Beginnings" },
    { volume: "Expression", title: zh ? "茶与品牌" : "Tea & Our Identity" },
    { volume: "Purpose", title: zh ? "初心与远景" : "Purpose & Vision" }
  ];
  const covers = ["drift-ancient-tea-path", "cloudlift-highland-sunrise", "luna-tide-moon-lake", "night-nectar-rain-pavilion", "monsoon-highland-rain", "clearsky-cloud-valley", "evenfall-autumn-forest", "stillearth-winter-path"];
  return <section id="story-collection" className="scroll-mt-28 px-5 py-16 md:px-8 md:py-20" aria-label={zh ? "我们的故事目录" : "Our story collection"}>
    <div className="mx-auto max-w-6xl">
      <p className="text-sm font-semibold text-gold">{BOOK.title}</p>
      <p className="mt-3 text-xs text-forest/55">{zh ? "配图为品牌意境插画。" : "Accompanied by brand landscape illustrations."}</p>
      {groups.map(group => <div className="mt-12" key={group.volume}>
        <h2 className="border-b border-forest/15 pb-6 font-serif text-3xl font-semibold text-forest md:text-4xl">{group.title}</h2>
        <div className="grid gap-5 pt-6 md:grid-cols-2">
          {chapters.filter(chapter => chapter.volume === group.volume).map(chapter => <Link key={chapter.path} href={localizedPath(chapter.locale, chapter.path)} className="group overflow-hidden rounded-2xl border border-forest/10 bg-[#faf7ef] transition hover:-translate-y-1 hover:shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-forest">
            <div className="relative aspect-[16/9] overflow-hidden bg-forest"><Image src={`/assets/ascend/landscapes/${covers[chapters.indexOf(chapter) % covers.length]}.png`} fill sizes="(min-width: 768px) 560px, 100vw" alt="" className="object-cover transition duration-500 group-hover:scale-105 motion-reduce:transform-none" /><div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-forest/40 to-transparent" /></div>
            <div className="p-6 sm:p-7">
            <p className="text-xs font-semibold text-gold">{chapter.number}</p>
            <h3 className="mt-4 font-serif text-3xl font-semibold leading-tight text-forest">{chapter.title}</h3>
            <p className="mt-4 leading-7 text-forest/65">{chapter.excerpt}</p>
            <span className="mt-7 inline-block text-sm font-bold text-forest">{zh ? (chapter.locale === "zh" ? "阅读全文" : "阅读英文全文") : "Read the story"} →</span>
            </div>
          </Link>)}
        </div>
      </div>)}
    </div>
  </section>;
}
