import { StoryDirectory } from "@/components/book/story-directory";
import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { BRAND, Locale } from "@/lib/constants";
import { breadcrumbSchema, createPageMetadata } from "@/lib/seo";
import { StructuredData } from "@/components/structured-data";

export function generateMetadata({ params }: { params: { locale: Locale } }): Metadata {
  return createPageMetadata({
    locale: params.locale,
    path: "/about",
    title: params.locale === "zh" ? "我们的故事 | 青云间" : "Our Story | QINGYUNJIAN",
    description: "Learn the story behind Qing Yun Jian, a Singapore premium sparkling tea brand inspired by Oriental tea culture.",
    keywords: ["about Qing Yun Jian", "Singapore tea brand", "Oriental tea culture", "Born to Ascend"]
  });
}

export default function AboutPage({ params }: { params: { locale: Locale } }) {
  const zh = params.locale === "zh";
  return (
    <main className="bg-[#f3f0e7] text-forest">
      <StructuredData data={breadcrumbSchema(params.locale, [{ name: "Home" }, { name: zh ? "我们的故事" : "Our Story", path: "/about" }])} />
      <section className="relative isolate overflow-hidden bg-forest text-white">
        <Image src="/assets/qingyunjian-hero.png" alt={zh ? "青云间品牌意境插画：云山与东方茶亭" : "Qing Yun Jian brand illustration of misty mountains and an Oriental tea pavilion"} fill priority sizes="100vw" className="object-cover object-[65%_center]" />
        <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-r from-[#09251e]/90 via-[#09251e]/60 to-[#09251e]/15" />
        <div className="relative mx-auto max-w-7xl px-5 py-20 sm:py-28 md:px-8 lg:py-36">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#edcf8b]">QING YUN JIAN · {zh ? "源于新加坡" : "Born in Singapore"}</p>
          <h1 className="mt-6 max-w-2xl font-serif text-6xl font-semibold leading-[1.05] sm:text-7xl lg:text-8xl">{zh ? "我们的故事" : "Our Story"}</h1>
          <p className="mt-7 max-w-xl text-xl leading-8 text-white/90 sm:text-2xl">Sparkling Tea Reimagined</p>
          <a href="#story-collection" className="mt-10 inline-flex min-h-12 items-center gap-6 border-b border-[#edcf8b]/70 pb-2 text-sm font-semibold text-[#edcf8b]">{zh ? "翻开青云间的故事" : "Explore our stories"}<span aria-hidden="true">↓</span></a>
          <p className="mt-12 text-xs text-white/65">{zh ? "品牌意境插画" : "Brand landscape illustration"}</p>
        </div>
      </section>
      <section className="px-5 py-14 md:px-8 md:py-20">
        <div className="mx-auto grid max-w-6xl items-center gap-10 md:grid-cols-[0.7fr_1.3fr] md:gap-16">
          <div className="relative flex min-h-64 items-center justify-center rounded-t-full border border-gold/25 bg-[#e4e9dc] p-10 md:min-h-80">
            <Image src="/assets/qing-yun-jian-logo-official.png" width={220} height={220} alt={zh ? "青云间官方金色飞马标志" : "Official Qing Yun Jian gold Pegasus logo"} className="h-auto w-44 shadow-[0_20px_50px_rgba(18,60,47,0.2)] md:w-52" />
          </div>
          <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-gold">Born to Ascend</p>
          <h2 className="mt-4 font-serif text-4xl font-semibold sm:text-5xl">{zh ? "青云间" : "A Modern Oriental tea experience"}</h2>
          <div className="mt-6 grid gap-5 text-base leading-8 text-forest/75 sm:text-lg">
            <p>
              {zh
                ? "青云间是新加坡现代东方茶饮品牌，以清爽气泡茶、东方灵感与高级简约体验为核心。"
                : "Qing Yun Jian is a Singapore-based modern Oriental tea brand operated by TCM AND HEALTHCARE COLLEGE PTE LTD."}
            </p>
            <p>
              {zh
                ? "品牌口号 Born to Ascend 代表向上、清朗与从容的品牌气质。"
                : "Born to Ascend expresses a calm upward spirit: refined, bright, and quietly ambitious."}
            </p>
          </div>
          <p className="mt-7 border-t border-forest/15 pt-5 text-xs leading-6 text-forest/55">{BRAND.company}</p>
          </div>
        </div>
      </section>
      <section className="bg-[#dfe9df] px-5 py-12 md:px-8 md:py-16">
        <div className="mx-auto grid max-w-6xl items-center gap-8 lg:grid-cols-[0.65fr_1.35fr]">
          <div><p className="text-xs font-bold uppercase tracking-[0.2em] text-forest/60">QING YUN JIAN · Pegasus</p><h2 className="mt-4 font-serif text-4xl font-semibold leading-tight">{zh ? "茶与我们的品牌" : "Tea & Our Identity"}</h2><Link className="mt-6 inline-flex min-h-12 items-center gap-4 border-b border-forest/30 text-sm font-bold" href={`/${params.locale}/ascend`}>{zh ? "发现你的 Pegasus" : "Discover your Pegasus"}<span aria-hidden="true">→</span></Link></div>
          <Image src="/assets/hero-pegasus-family-eleven-v1.webp" width={1672} height={941} sizes="(min-width: 1024px) 750px, 100vw" alt={zh ? "青云间十一只彩色 Pegasus 小飞马品牌插画" : "Qing Yun Jian's eleven colourful Pegasus characters in brand artwork"} className="h-auto w-full rounded-[1.5rem] shadow-[0_20px_55px_rgba(18,60,47,0.1)]" />
        </div>
      </section>
      <StoryDirectory locale={params.locale} />
    </main>
  );
}
