import type { MarkdownBlock } from "@/lib/content/markdown";

export function TableOfContents({ blocks, locale = "en" }: { blocks: MarkdownBlock[]; locale?: string }) {
  const headings = blocks.filter((block): block is Extract<MarkdownBlock, { type: "heading" }> => block.type === "heading");
  return (
    <aside aria-label={locale === "zh" ? "本文目录" : "Table of contents"} className="border-l-2 border-gold/40 pl-5">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-gold">{locale === "zh" ? "本文目录" : "On this page"}</p>
      <ol className="mt-4 grid gap-3 text-sm font-semibold text-forest/65">
        {headings.map((heading) => <li key={heading.id}><a className="hover:text-forest" href={`#${heading.id}`}>{heading.text}</a></li>)}
      </ol>
    </aside>
  );
}
