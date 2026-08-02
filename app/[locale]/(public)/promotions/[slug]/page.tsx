import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Locale } from "@/lib/constants";
import { getPublicPromotion } from "@/lib/promotions";
import { breadcrumbSchema, createPageMetadata, localizedUrl } from "@/lib/seo";
import { PromotionDetail } from "@/components/promotions/promotion-detail";
import { StructuredData } from "@/components/structured-data";

export async function generateMetadata({ params }: { params: { locale: Locale; slug: string } }): Promise<Metadata> {
  const promotion = await getPublicPromotion(params.slug);
  if (!promotion) return { title: { absolute: "Promotion Not Found | Qing Yun Jian" }, robots: { index: false, follow: false } };

  const description = (promotion.subtitle || promotion.description || `Discover ${promotion.title} at Qing Yun Jian.`)
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 160);

  return createPageMetadata({
    locale: params.locale,
    path: `/promotions/${promotion.slug}`,
    title: `${promotion.title} | Qing Yun Jian Promotions`,
    description,
    keywords: [promotion.title, "Qing Yun Jian promotion", "tea promotion Singapore"]
  });
}

export default async function PromotionDetailPage({
  params
}: {
  params: { locale: Locale; slug: string };
}) {
  const promotion = await getPublicPromotion(params.slug);
  if (!promotion) notFound();

  const path = `/promotions/${promotion.slug}`;
  const promotionSchema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: promotion.title,
    description: promotion.description || promotion.subtitle || undefined,
    url: localizedUrl(params.locale, path),
    primaryImageOfPage: promotion.image_url ? { "@type": "ImageObject", url: promotion.image_url } : undefined,
    isPartOf: { "@id": "https://qyjworld.com/#website" }
  };

  return (
    <>
      <StructuredData
        data={[
          breadcrumbSchema(params.locale, [
            { name: "Home" },
            { name: "Promotions", path: "/promotions" },
            { name: promotion.title, path }
          ]),
          promotionSchema
        ]}
      />
      <PromotionDetail promotion={promotion} />
    </>
  );
}
