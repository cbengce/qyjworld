import Link from "next/link";
import { formatPromotionDateRange, Promotion, promotionStatusLabel } from "@/lib/promotions";
import { AscendCommunityCard } from "@/components/community/ascend-community-card";
import { PromotionDetailImage } from "@/components/promotions/promotion-card-image";
import { ButtonLink, Section } from "@/components/ui";

export function PromotionDetail({
  promotion,
  previewControls
}: {
  promotion: Promotion;
  previewControls?: {
    badge: string;
    backHref: string;
  };
}) {
  return (
    <main className="bg-[#f8f5ed]">
      <Section className="pt-28">
        <article className="mx-auto max-w-5xl overflow-hidden bg-white shadow-[0_28px_75px_rgba(10,24,20,0.08)]">
          {promotion.image_url ? (
            <PromotionDetailImage alt={`${promotion.title} campaign artwork`} src={promotion.image_url} />
          ) : null}
          <div className="p-7 md:p-12">
            <div className="flex flex-wrap items-center gap-3">
              {previewControls ? (
                <span className="rounded-full bg-forest px-3 py-1 text-[0.7rem] font-bold uppercase tracking-[0.16em] text-white">
                  {previewControls.badge}
                </span>
              ) : null}
              <span className="rounded-full border border-gold/35 px-3 py-1 text-[0.7rem] font-bold uppercase tracking-[0.16em] text-gold">
                {promotionStatusLabel(promotion)}
              </span>
              <span className="text-sm font-semibold text-forest/55">
                {formatPromotionDateRange(promotion.start_date, promotion.end_date)}
              </span>
            </div>
            <h1 className="mt-7 font-serif text-5xl font-semibold leading-[0.98] text-forest md:text-7xl">{promotion.title}</h1>
            {promotion.subtitle ? <p className="mt-5 text-xl font-semibold text-forest/75">{promotion.subtitle}</p> : null}
            {promotion.description ? <p className="mt-7 max-w-3xl text-lg leading-8 text-forest/60">{promotion.description}</p> : null}
            {promotion.cta_label && promotion.cta_url ? (
              <div className="mt-9 grid gap-3">
                <ButtonLink className="w-fit rounded-full bg-forest px-8 text-white hover:-translate-y-0.5 hover:bg-ink" href={promotion.cta_url}>
                  {promotion.cta_label}
                </ButtonLink>
                {previewControls ? <p className="break-all text-sm font-semibold text-forest/55">CTA destination: {promotion.cta_url}</p> : null}
              </div>
            ) : null}
            {previewControls ? (
              <Link className="focus-ring mt-9 inline-flex min-h-12 items-center rounded-full border border-forest/20 px-6 text-sm font-bold text-forest transition duration-300 hover:-translate-y-0.5 hover:border-forest" href={previewControls.backHref}>
                Back to Edit
              </Link>
            ) : null}
          </div>
        </article>
      </Section>
      {promotion.show_ascend_community_cta ? <AscendCommunityCard compact /> : null}
    </main>
  );
}
