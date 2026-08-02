import { BRAND } from "@/lib/constants";
import { allContent } from "@/lib/content/catalog";

function escapeXml(value: string) { return value.replace(/[<>&'\"]/g, (character) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", "\"": "&quot;" })[character] ?? character); }

export function GET() {
  const items = [...allContent].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt)).map((entry) => { const section = entry.kind === "guide" ? "guides" : "blog"; const url = `${BRAND.domain}/en/${section}/${entry.slug}`; return `<item><title>${escapeXml(entry.title)}</title><link>${url}</link><guid isPermaLink="true">${url}</guid><description>${escapeXml(entry.description)}</description><pubDate>${new Date(entry.publishedAt).toUTCString()}</pubDate><category>${escapeXml(entry.category)}</category></item>`; }).join("");
  const xml = `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>${BRAND.nameEn} Tea Journal</title><link>${BRAND.domain}/en/blog</link><description>Singapore tea stories, guides and modern Oriental tea culture.</description><language>en-SG</language><lastBuildDate>${new Date().toUTCString()}</lastBuildDate>${items}</channel></rss>`;
  return new Response(xml, { headers: { "Cache-Control": "public, max-age=3600, s-maxage=3600", "Content-Type": "application/rss+xml; charset=utf-8" } });
}
