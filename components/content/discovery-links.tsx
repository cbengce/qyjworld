import Link from "next/link";
import type { Locale } from "@/lib/constants";
import { discoveryEntries, localizeContent } from "@/lib/content/discovery";

export function DiscoveryLinks({ locale }: { locale: Locale }) {
  const zh = locale === "zh";
  return <section className="mx-auto max-w-6xl px-5 py-14 md:px-8" aria-labelledby="tea-discovery-title">
    <p className="text-xs font-bold uppercase tracking-[.2em] text-gold">{zh ? "从一杯到一群人" : "From one cup to a shared occasion"}</p>
    <h2 id="tea-discovery-title" className="mt-4 font-serif text-4xl text-forest">{zh ? "选茶与团购指南" : "Find your tea. Plan your gathering."}</h2>
    <div className="mt-7 grid gap-4 md:grid-cols-3">{discoveryEntries.filter(entry => entry.kind === "guide").map(original => {
      const entry = localizeContent(original, locale);
      return <Link key={entry.slug} href={`/${locale}/guides/${entry.slug}`} className="rounded-2xl border border-forest/10 bg-[#eef3e9] p-6 transition hover:bg-[#e1ead8]">
        <h3 className="font-serif text-2xl leading-tight text-forest">{entry.title}</h3><p className="mt-3 text-sm leading-6 text-forest/70">{entry.description}</p><span className="mt-4 block text-sm font-bold text-forest">{zh ? "阅读指南 →" : "Read the guide →"}</span>
      </Link>;
    })}</div>
    <div className="mt-6 flex flex-wrap gap-6 font-semibold text-forest underline"><Link href={`/${locale}/menu`}>{zh ? "现行菜单" : "Current tea menu"}</Link><Link href={`/${locale}/group-orders`}>{zh ? "办公室与活动团体订购" : "Office & event group orders"}</Link><Link href={`/${locale}/guides`}>{zh ? "所有指南" : "All tea guides"}</Link></div>
  </section>;
}
