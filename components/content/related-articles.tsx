import type { Locale } from "@/lib/constants";
import type { ContentEntry } from "@/lib/content/types";
import { BlogCard } from "@/components/content/blog-card";

export function RelatedArticles({ entries, locale, title = "Continue Exploring" }: { entries: ContentEntry[]; locale: Locale; title?: string }) {
  return (
    <section aria-labelledby="related-content-title" className="mt-16 border-t border-forest/10 pt-12">
      <h2 id="related-content-title" className="font-serif text-4xl font-semibold text-forest">{title}</h2>
      <div className="mt-7 grid gap-5 md:grid-cols-3">{entries.map((entry) => <BlogCard key={entry.slug} entry={entry} locale={locale} />)}</div>
    </section>
  );
}
