import Image from "next/image";
import Link from "next/link";
import type { Locale } from "@/lib/constants";
import { BRAND } from "@/lib/constants";
import type { ContentEntry } from "@/lib/content/types";
import { countWords } from "@/lib/content/generator";
import { parseMarkdown } from "@/lib/content/markdown";
import { localizedUrl } from "@/lib/seo";
import { StructuredData } from "@/components/structured-data";
import { AuthorCard } from "@/components/content/author-card";
import { Breadcrumb } from "@/components/content/breadcrumb";
import { FAQSection } from "@/components/content/faq-section";
import { RelatedArticles } from "@/components/content/related-articles";
import { ShareButtons } from "@/components/content/share-buttons";
import { TableOfContents } from "@/components/content/table-of-contents";

export function ContentLayout({ entry, locale, related }: { entry: ContentEntry; locale: Locale; related: ContentEntry[] }) {
  const blocks = parseMarkdown(entry.markdown);
  const base = entry.kind === "guide" ? "guides" : "blog";
  const canonical = localizedUrl(locale, `/${base}/${entry.slug}`);
  const schema = {
    "@context": "https://schema.org",
    "@type": entry.kind === "guide" ? "Article" : "BlogPosting",
    headline: entry.title,
    description: entry.description,
    image: `${BRAND.domain}${entry.heroImage}`,
    datePublished: entry.publishedAt,
    dateModified: entry.updatedAt,
    wordCount: countWords(entry.markdown),
    inLanguage: locale === "zh" ? "zh-SG" : "en-SG",
    mainEntityOfPage: canonical,
    author: { "@type": "Organization", name: entry.author.name },
    publisher: { "@id": `${BRAND.domain}/#organization` },
    articleSection: entry.category,
    keywords: entry.keywords.join(", ")
  };

  return (
    <main className="bg-[#fbfaf6]">
      <StructuredData data={schema} />
      <article className="mx-auto max-w-7xl px-5 py-16 md:px-8 md:py-24">
        <Breadcrumb locale={locale} items={[{ name: "Home" }, { name: entry.kind === "guide" ? "Guides" : "Blog", path: `/${base}` }, { name: entry.title, path: `/${base}/${entry.slug}` }]} />
        <header className="mt-10 max-w-5xl">
          <Link className="text-xs font-bold uppercase tracking-[0.2em] text-gold" href={`/${locale}/categories/${entry.categorySlug}`}>{entry.category}</Link>
          <h1 className="mt-5 font-serif text-5xl font-semibold leading-[0.98] text-forest md:text-7xl">{entry.title}</h1>
          <p className="mt-7 max-w-3xl text-xl leading-8 text-forest/65">{entry.description}</p>
          <div className="mt-7 flex flex-wrap gap-x-5 gap-y-2 text-sm font-semibold text-forest/45">
            <span>Published {new Date(entry.publishedAt).toLocaleDateString("en-SG", { day: "numeric", month: "long", year: "numeric" })}</span>
            <span>Updated {new Date(entry.updatedAt).toLocaleDateString("en-SG", { day: "numeric", month: "long", year: "numeric" })}</span>
            <span>{entry.readingTime} min read</span>
          </div>
        </header>

        <div className="relative mt-12 aspect-[16/9] overflow-hidden bg-[#e8eee8]">
          <Image alt={entry.heroAlt} className="object-cover" fill priority sizes="(min-width: 1280px) 1216px, 100vw" src={entry.heroImage} title={entry.title} />
        </div>

        <div className="mt-12 grid gap-12 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-start">
          <div className="min-w-0 max-w-3xl">
            <div className="grid gap-6 text-lg leading-8 text-forest/75">
              {blocks.map((block, index) => {
                if (block.type === "heading") return <h2 key={block.id} id={block.id} className="scroll-mt-28 pt-8 font-serif text-4xl font-semibold leading-tight text-forest">{block.text}</h2>;
                if (block.type === "list") return <ul key={`list-${index}`} className="grid list-disc gap-2 pl-6">{block.items.map((item) => <li key={item}>{item}</li>)}</ul>;
                return <p key={`paragraph-${index}`}>{block.text}</p>;
              })}
            </div>

            <nav aria-label="Explore Qing Yun Jian" className="mt-14 grid gap-4 border-y border-forest/10 py-8 sm:grid-cols-2">
              <Link className="font-semibold text-forest hover:text-gold" href={`/${locale}/menu`}>Explore the tea menu</Link>
              <Link className="font-semibold text-forest hover:text-gold" href={`/${locale}/membership`}>Discover membership privileges</Link>
              <Link className="font-semibold text-forest hover:text-gold" href={`/${locale}/promotions`}>View current promotions</Link>
              <Link className="font-semibold text-forest hover:text-gold" href={`/${locale}/${entry.kind === "guide" ? "blog" : "guides"}`}>Read {entry.kind === "guide" ? "tea stories" : "pillar guides"}</Link>
            </nav>

            <FAQSection faq={entry.faq} />
            <div className="mt-12"><ShareButtons title={entry.title} url={canonical} /></div>
            <div className="mt-12"><AuthorCard author={entry.author} /></div>
          </div>
          <div className="lg:sticky lg:top-28"><TableOfContents blocks={blocks} /></div>
        </div>
        <RelatedArticles entries={related} locale={locale} title={entry.kind === "guide" ? "Related Guides" : "Related Articles"} />
      </article>
    </main>
  );
}

export function BlogLayout(props: { entry: ContentEntry; locale: Locale; related: ContentEntry[] }) {
  return <ContentLayout {...props} />;
}

export function GuideLayout(props: { entry: ContentEntry; locale: Locale; related: ContentEntry[] }) {
  return <ContentLayout {...props} />;
}
