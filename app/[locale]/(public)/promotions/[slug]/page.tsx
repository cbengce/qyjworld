import { notFound } from "next/navigation";
import { Locale } from "@/lib/constants";
import { getPublicPromotion } from "@/lib/promotions";
import { PromotionDetail } from "@/components/promotions/promotion-detail";

export default async function PromotionDetailPage({
  params
}: {
  params: { locale: Locale; slug: string };
}) {
  const promotion = await getPublicPromotion(params.slug);
  if (!promotion) notFound();

  return <PromotionDetail promotion={promotion} />;
}
