import { notFound } from "next/navigation";
import { Locale } from "@/lib/constants";
import { requireAdmin } from "@/lib/data";
import { Promotion } from "@/lib/promotions";
import { createServiceClient } from "@/lib/supabase/admin";
import { PromotionDetail } from "@/components/promotions/promotion-detail";

export default async function AdminPromotionPreviewPage({
  params
}: {
  params: { locale: Locale; id: string };
}) {
  await requireAdmin(params.locale);

  const supabase = createServiceClient();
  const { data: promotion, error } = await supabase
    .from("promotions")
    .select("*")
    .eq("id", params.id)
    .maybeSingle();

  if (error || !promotion) notFound();

  return (
    <PromotionDetail
      promotion={promotion as Promotion}
      previewControls={{
        badge: promotion.status === "draft" ? "Draft Preview" : "Admin Preview",
        backHref: `/${params.locale}/admin/promotions?edit=${params.id}#promotion-${params.id}`
      }}
    />
  );
}
