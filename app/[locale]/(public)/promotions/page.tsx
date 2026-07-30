import Link from "next/link";
import { Locale } from "@/lib/constants";
import { localizedPath } from "@/lib/i18n/routing";
import { formatPromotionDateRange, getPublicPromotions, Promotion, promotionStatusLabel } from "@/lib/promotions";
import { PromotionCardImage } from "@/components/promotions/promotion-card-image";
import { Section } from "@/components/ui";

function PromotionCard({ locale, promotion }: { locale: Locale; promotion: Promotion }) {
  const href = localizedPath(locale, `/promotions/${promotion.slug}`);
  const coverImage = promotion.cover_image_url || promotion.image_url;

  return (
    <article className="overflow-hidden bg-white shadow-[0_24px_65px_rgba(10,24,20,0.08)]">
      {coverImage ? <PromotionCardImage alt={`${promotion.title} campaign artwork`} mode={promotion.image_display_mode ?? "auto"} src={coverImage} /> : null}
      <div className="p-6 md:p-8">
        <div className="flex flex-wrap items-center gap-3">
          <span className="rounded-full border border-gold/35 px-3 py-1 text-[0.7rem] font-bold uppercase tracking-[0.16em] text-gold">
            {promotionStatusLabel(promotion)}
          </span>
          <span className="text-sm font-semibold text-forest/55">
            {formatPromotionDateRange(promotion.start_date, promotion.end_date)}
          </span>
        </div>
        <h3 className="mt-6 font-serif text-4xl font-semibold leading-tight text-forest">{promotion.title}</h3>
        {promotion.description ? (
          <p className="mt-5 overflow-hidden leading-7 text-forest/60" style={{ display: "-webkit-box", WebkitBoxOrient: "vertical", WebkitLineClamp: 2 }}>
            {promotion.description}
          </p>
        ) : null}
        <Link className="focus-ring mt-7 inline-flex min-h-12 items-center rounded-full border border-forest/20 px-6 text-sm font-bold text-forest transition duration-300 hover:-translate-y-0.5 hover:border-forest" href={href}>
          View Promotion
        </Link>
      </div>
    </article>
  );
}

function PromotionSection({ title, locale, promotions }: { title: string; locale: Locale; promotions: Promotion[] }) {
  return (
    <section className="mt-14">
      <h2 className="font-serif text-4xl font-semibold text-forest">{title}</h2>
      {promotions.length ? (
        <div className="mt-6 grid gap-5 lg:grid-cols-3">
          {promotions.map((promotion) => (
            <PromotionCard key={promotion.id} locale={locale} promotion={promotion} />
          ))}
        </div>
      ) : (
        <div className="mt-6 border border-forest/10 bg-white p-8 text-forest/60">No campaigns in this section yet.</div>
      )}
    </section>
  );
}

export default async function PromotionsPage({ params }: { params: { locale: Locale } }) {
  const promotions = await getPublicPromotions();
  const current = promotions.filter((promotion) => promotionStatusLabel(promotion) === "LIVE NOW");
  const comingSoon = promotions.filter((promotion) => promotionStatusLabel(promotion) === "COMING SOON");
  const past = promotions.filter((promotion) => promotionStatusLabel(promotion) === "ENDED");

  return (
    <main className="bg-[#f8f5ed]">
      <Section className="pt-28">
        <div className="mx-auto max-w-7xl">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-gold">Promotions</p>
          <h1 className="mt-5 max-w-4xl font-serif text-5xl font-semibold leading-[0.98] text-forest md:text-7xl">
            What&apos;s On at Qing Yun Jian.
          </h1>
          <p className="mt-7 max-w-2xl text-lg leading-8 text-forest/60">
            Seasonal moments, member privileges and community campaigns, curated for the Qing Yun Jian journey.
          </p>

          <PromotionSection locale={params.locale} promotions={current} title="Current Promotions" />
          <PromotionSection locale={params.locale} promotions={comingSoon} title="Coming Soon" />
          <PromotionSection locale={params.locale} promotions={past} title="Past Promotions" />
        </div>
      </Section>
    </main>
  );
}
