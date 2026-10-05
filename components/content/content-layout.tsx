import { localizeContent } from "@/lib/content/discovery";
import { CurrentTeaSelection } from "./current-tea-selection";
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

export async function ContentLayout({ entry, locale, related }: { entry: ContentEntry; locale: Locale; related: ContentEntry[] }) {
  entry = localizeContent(entry, locale);
  const zh = locale === "zh";
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
        <Breadcrumb locale={locale} items={[{ name: zh ? "首页" : "Home" }, { name: zh ? "茶饮指南" : entry.kind === "guide" ? "Guides" : "Blog", path: `/${base}` }, { name: entry.title, path: `/${base}/${entry.slug}` }]} />
        <header className="mt-10 max-w-5xl">
          <Link className="text-xs font-bold uppercase tracking-[0.2em] text-gold" href={`/${locale}/categories/${entry.categorySlug}`}>{entry.category}</Link>
          <h1 className="mt-5 font-serif text-5xl font-semibold leading-[0.98] text-forest md:text-7xl">{entry.title}</h1>
          <p className="mt-7 max-w-3xl text-xl leading-8 text-forest/65">{entry.description}</p>
          <div className="mt-7 flex flex-wrap gap-x-5 gap-y-2 text-sm font-semibold text-forest/45">
            <span>{zh ? "发布" : "Published"} {new Date(entry.publishedAt).toLocaleDateString(zh ? "zh-SG" : "en-SG", { day: "numeric", month: "long", year: "numeric" })}</span>
            <span>{zh ? "更新" : "Updated"} {new Date(entry.updatedAt).toLocaleDateString(zh ? "zh-SG" : "en-SG", { day: "numeric", month: "long", year: "numeric" })}</span>
            <span>{entry.readingTime} {zh ? "分钟阅读" : "min read"}</span>
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

            <CurrentTeaSelection locale={locale} showMenu={entry.showMenu} showStore={entry.showStore} />

            <nav aria-label="Explore Qing Yun Jian" className="mt-14 grid gap-4 border-y border-forest/10 py-8 sm:grid-cols-2">
              <Link className="font-semibold text-forest hover:text-gold" href={`/${locale}/menu`}>{zh ? "现行茶饮菜单" : "Explore the tea menu"}</Link>
              <Link className="font-semibold text-forest hover:text-gold" href={`/${locale}/group-orders`}>{zh ? "办公室与活动团体订购" : "Office & event group orders"}</Link>
              <Link className="font-semibold text-forest hover:text-gold" href={`/${locale}/promotions`}>{zh ? "查看现行活动" : "View current promotions"}</Link>
              <Link className="font-semibold text-forest hover:text-gold" href={`/${locale}/${entry.kind === "guide" ? "blog" : "guides"}`}>{zh ? "继续阅读茶饮文章与指南" : `Read ${entry.kind === "guide" ? "tea stories" : "tea guides"}`}</Link>
            </nav>

            {entry.sources?.length ? <section className="mt-10 border-t border-forest/10 pt-6"><h2 className="font-serif text-2xl text-forest">{zh ? "参考资料" : "References"}</h2><p className="mt-3 text-sm leading-6 text-forest/65">{zh ? "资料用于一般茶饮分类说明，不代表青云间的配方。具体茶品以现行资料及门店确认为准。" : "These sources support general drink-category context. They do not describe QING YUN JIAN recipes; use our current drink information and store confirmation for those details."}</p><ul className="mt-3 grid gap-2 text-sm text-forest underline">{entry.sources.map(source => <li key={source.url}><a href={source.url}>{source.title}</a></li>)}</ul></section> : null}
            <FAQSection faq={entry.faq} locale={locale} />
            <div className="mt-12"><ShareButtons title={entry.title} url={canonical} locale={locale} /></div>
            <div className="mt-12"><AuthorCard author={entry.author} locale={locale} /></div>
          </div>
          <div className="lg:sticky lg:top-28"><TableOfContents blocks={blocks} locale={locale} /></div>
        </div>
        <RelatedArticles entries={related} locale={locale} title={zh ? "继续探索" : "Continue exploring"} />
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
