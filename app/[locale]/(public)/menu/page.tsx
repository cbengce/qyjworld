import type { Metadata } from "next";
import { BRAND, Locale } from "@/lib/constants";
import { getMenuItems } from "@/lib/menu";
import type { MenuItem } from "@/lib/menu-types";
import { breadcrumbSchema, createPageMetadata } from "@/lib/seo";
import { MenuCatalogue } from "@/components/menu/menu-catalogue";
import { StructuredData } from "@/components/structured-data";

function menuSchema(locale: Locale, items: MenuItem[]) {
  const sections = new Map<string, MenuItem[]>();

  for (const item of items) {
    const category = item.menu_categories?.name_en || "Qing Yun Jian Collection";
    sections.set(category, [...(sections.get(category) || []), item]);
  }

  return {
    "@context": "https://schema.org",
    "@type": "Menu",
    "@id": `${BRAND.domain}/${locale}/menu#menu`,
    name: "QING YUN JIAN Menu",
    url: `${BRAND.domain}/${locale}/menu`,
    hasMenuSection: Array.from(sections, ([category, sectionItems]) => ({
      "@type": "MenuSection",
      name: category,
      hasMenuItem: sectionItems.map((item) => {
        const offers = [
          item.regular_price === null ? null : {
            "@type": "Offer",
            name: "Regular price",
            price: item.regular_price.toFixed(2),
            priceCurrency: "SGD"
          },
          item.member_price === null ? null : {
            "@type": "Offer",
            name: "Member price",
            price: item.member_price.toFixed(2),
            priceCurrency: "SGD"
          }
        ].filter((offer): offer is NonNullable<typeof offer> => offer !== null);

        return {
          "@type": "MenuItem",
          "@id": `${BRAND.domain}/${locale}/menu#${item.id}`,
          name: locale === "zh" ? item.name_zh || item.name_en : item.name_en,
          alternateName: locale === "zh" ? item.name_en : item.name_zh,
          description: locale === "zh" ? item.description_zh || item.description_en : item.description_en,
          image: item.image_url
            ? item.image_url.startsWith("http") ? item.image_url : `${BRAND.domain}${item.image_url}`
            : undefined,
          offers: offers.length ? offers : undefined
        };
      })
    }))
  };
}

export function generateMetadata({ params }: { params: { locale: Locale } }): Metadata {
  return createPageMetadata({
    locale: params.locale,
    path: "/menu",
    title: "Sparkling Tea Menu Singapore | Qing Yun Jian",
    description: "Explore premium sparkling tea, fruit tea and milk tea crafted with Oriental tea traditions.",
    keywords: ["sparkling tea menu Singapore", "fruit tea Singapore", "milk tea Singapore", "Qing Yun Jian menu"]
  });
}

export default async function MenuPage({ params }: { params: { locale: Locale } }) {
  const items = await getMenuItems();
  return (
    <>
      <StructuredData data={[
        breadcrumbSchema(params.locale, [{ name: "Home" }, { name: "Menu", path: "/menu" }]),
        menuSchema(params.locale, items)
      ]} />
      <MenuCatalogue items={items} locale={params.locale} />
    </>
  );
}
