import { DiscoveryLinks } from "@/components/content/discovery-links";
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
          url: `${BRAND.domain}/${locale}/menu/${encodeURIComponent(item.id)}`,
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
    title: params.locale === "zh" ? "青云间新加坡茶饮菜单" : "Sparkling Tea Menu Singapore | QING YUN JIAN",
    description: params.locale === "zh" ? "查看青云间现行茶饮介绍、价格与售卖状态，探索自己的一杯或办公室团体订购。" : "Explore the current QING YUN JIAN tea menu, drink descriptions, pricing and availability in Singapore. Plan your own cup or an office group order.",
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
      <DiscoveryLinks locale={params.locale} />
    </>
  );
}
