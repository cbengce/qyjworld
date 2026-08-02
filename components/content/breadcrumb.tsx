import Link from "next/link";
import type { Locale } from "@/lib/constants";
import type { BreadcrumbItem } from "@/lib/seo";
import { breadcrumbSchema } from "@/lib/seo";
import { StructuredData } from "@/components/structured-data";

export function Breadcrumb({ items, locale }: { items: BreadcrumbItem[]; locale: Locale }) {
  return (
    <>
      <StructuredData data={breadcrumbSchema(locale, items)} />
      <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-2 text-sm font-semibold text-forest/50">
        {items.map((item, index) => (
          <span key={`${item.name}-${index}`} className="flex items-center gap-2">
            {index ? <span aria-hidden="true">/</span> : null}
            {index === items.length - 1 ? <span aria-current="page">{item.name}</span> : <Link className="hover:text-forest" href={`/${locale}${item.path ?? ""}`}>{item.name}</Link>}
          </span>
        ))}
      </nav>
    </>
  );
}
