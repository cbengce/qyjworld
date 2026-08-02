import type { Metadata } from "next";
import { Locale } from "@/lib/constants";
import { getMenuItems } from "@/lib/menu";
import { breadcrumbSchema, createPageMetadata } from "@/lib/seo";
import { MenuCatalogue } from "@/components/menu/menu-catalogue";
import { StructuredData } from "@/components/structured-data";

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
      <StructuredData data={breadcrumbSchema(params.locale, [{ name: "Home" }, { name: "Menu", path: "/menu" }])} />
      <MenuCatalogue items={items} locale={params.locale} />
    </>
  );
}
