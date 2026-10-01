import Image from "next/image";
import type { Metadata } from "next";
import { Locale } from "@/lib/constants";
import { localizedPath } from "@/lib/i18n/routing";
import { breadcrumbSchema, createPageMetadata } from "@/lib/seo";
import { formatPromotionDateRange, getHomepagePromotions, promotionStatusLabel } from "@/lib/promotions";
import { AscendCommunityCard } from "@/components/community/ascend-community-card";
import { PromotionCardImage } from "@/components/promotions/promotion-card-image";
import { ButtonLink } from "@/components/ui";
import { StructuredData } from "@/components/structured-data";
import { getPrimaryStore } from "@/lib/stores";
import { effectiveStoreHoursForDate, formatEffectiveStoreHours, storeAddressLines, storeDirectionsUrl, storeMapEmbedUrl } from "@/lib/store-types";
import { getMenuItems } from "@/lib/menu";

export function generateMetadata({ params }: { params: { locale: Locale } }): Metadata {
  return createPageMetadata({
    locale: params.locale,
    title: "Premium Sparkling Tea Singapore | Qing Yun Jian",
    description: "Discover Singapore's modern Oriental sparkling tea experience. Premium tea crafted with real tea leaves, fruits and botanicals.",
    keywords: ["premium sparkling tea Singapore", "Oriental tea Singapore", "Qing Yun Jian", "MacPherson Mall tea"]
  });
}

const storyCards = [
  {
    index: "01",
    title: "Born in Singapore",
    text: "A modern tea ritual created for warm afternoons, meaningful conversations and everyday moments of ascent."
  },
  {
    index: "02",
    title: "Born to Ascend",
    text: "An uplifting brand language expressed through cleaner finishes, lighter textures and a calm sense of occasion."
  },
  {
    index: "03",
    title: "Sparkling Tea Reimagined",
    text: "Oriental tea notes meet fine bubbles and fruit clarity, creating a finish that feels refined rather than overly sweet."
  }
];

const teaCategories = [
  {
    title: "Sparkling Tea",
    text: "Fine bubbles, Oriental tea and bright fruit clarity."
  },
  {
    title: "Fruit Tea",
    text: "Fresh fruit character layered over carefully selected tea."
  },
  {
    title: "Fresh Milk Tea",
    text: "Tea-forward, smooth and composed without excessive sweetness."
  }
];

const benefits = ["Daily Member Drink (24–30% OFF)", "Points", "Referral Rewards"];

export default async function HomePage({ params }: { params: { locale: Locale } }) {
  const [homepagePromotions, store, featuredDrinks] = await Promise.all([getHomepagePromotions(), getPrimaryStore(), getMenuItems({ featuredOnly: true })]);
  const addressLines = store ? storeAddressLines(store) : [];
  const effectiveHours = store ? effectiveStoreHoursForDate(store) : null;
  const hoursDisplay = effectiveHours ? formatEffectiveStoreHours(effectiveHours) : "";

  return (
    <main className="bg-[#f8f5ed]">
      <StructuredData data={breadcrumbSchema(params.locale, [{ name: "Home" }])} />
      <section className="relative overflow-hidden bg-[#fff8ec] text-forest" aria-label={params.locale === "zh" ? "探索你的茶饮性格" : "Discover your tea personality"}>
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_80%_25%,#d7eee5_0%,transparent_55%),radial-gradient(ellipse_at_10%_80%,#ffe0cd_0%,transparent_50%)]" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-6 px-5 pb-12 pt-8 md:px-8 lg:grid-cols-[0.8fr_1.2fr] lg:gap-10 lg:py-16">
          <div className="text-center lg:text-left">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-forest/65">Sparkling Tea Reimagined</p>
            <h1 className="mt-4 font-sans text-4xl font-extrabold leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl">{params.locale === "zh" ? "找到属于你的茶饮性格。" : "Find your tea personality."}</h1>
            <p className="mt-5 text-lg leading-7 text-forest/75">{params.locale === "zh" ? "十一只 Pegasus，总有一只像你。" : "Eleven Pegasus. One that feels like you."}</p>
            <div className="mt-7 hidden lg:block">
              <ButtonLink className="rounded-full bg-forest px-8 text-white shadow-lg hover:-translate-y-1 hover:bg-ink" href={localizedPath(params.locale, "/ascend")}>{params.locale === "zh" ? "发现我的 Pegasus" : "Discover My Pegasus"} <span aria-hidden="true" className="ml-3">→</span></ButtonLink>
              <p className="mt-3 text-sm text-forest/65">{params.locale === "zh" ? "五道问题 · 你的专属茶饮分享卡" : "5 questions · Your personalised tea card"}</p>
              <ButtonLink className="mt-5 rounded-full border border-forest/30 px-8 hover:bg-white" href={localizedPath(params.locale, "/menu")}>{params.locale === "zh" ? "探索菜单" : "Explore the Menu"} →</ButtonLink>
            </div>
          </div>
          <div className="qyj-pegasus-float relative overflow-hidden rounded-[2rem] shadow-[0_18px_60px_rgba(67,115,88,0.12)]">
            <Image src="/assets/hero-pegasus-family-eleven-v1.webp" width={1672} height={941} priority sizes="(min-width: 1024px) 720px, 100vw" alt={params.locale === "zh" ? "青云间十一只彩色 Pegasus 小飞马，在花朵、气泡与云朵间相聚" : "The eleven colourful QingyunJian Pegasus characters together among clouds, flowers and sparkling bubbles"} className="h-auto w-full" />
          </div>
          <div className="flex flex-col items-center text-center lg:hidden">
            <ButtonLink className="w-full max-w-sm rounded-full bg-forest px-8 text-white shadow-lg hover:-translate-y-1 hover:bg-ink" href={localizedPath(params.locale, "/ascend")}>{params.locale === "zh" ? "发现我的 Pegasus" : "Discover My Pegasus"} <span aria-hidden="true" className="ml-3">→</span></ButtonLink>
            <p className="mt-3 text-sm text-forest/65">{params.locale === "zh" ? "五道问题 · 你的专属茶饮分享卡" : "5 questions · Your personalised tea card"}</p>
            <ButtonLink className="mt-5 rounded-full border border-forest/30 px-8 hover:bg-white" href={localizedPath(params.locale, "/menu")}>{params.locale === "zh" ? "探索菜单" : "Explore the Menu"} →</ButtonLink>
          </div>
        </div>
      </section>

      <section id="story" className="px-5 py-24 md:px-8 md:py-32">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-8 md:grid-cols-[0.9fr_1.1fr] md:items-end">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-gold">{params.locale === "zh" ? "我们的故事" : "OUR STORY"}</p>
              <h2 className="mt-5 font-serif text-5xl font-semibold leading-[0.98] text-forest md:text-7xl">
                A Lighter Kind of Luxury.
              </h2>
            </div>
            <p className="max-w-2xl text-lg leading-8 text-forest/60 md:justify-self-end">
              Inspired by Oriental tea culture and crafted in Singapore, Qing Yun Jian brings tea into a brighter, more contemporary expression.
            </p>
          </div>

          <ButtonLink href={localizedPath(params.locale, "/about")} className="mt-8">{params.locale === "zh" ? "阅读我们的故事" : "Explore Our Story"} →</ButtonLink>

          <div className="mt-14 grid gap-px bg-forest/10 lg:grid-cols-3">
            {storyCards.map((card) => (
              <article key={card.title} className="min-h-[19rem] bg-[#fbfaf6] p-7 md:p-9">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-gold">{card.index}</p>
                <p className="mt-12 font-serif text-4xl font-semibold leading-tight text-forest">{card.title}</p>
                <p className="mt-6 text-base leading-7 text-forest/60">{card.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden bg-[#e9f0ec] px-5 py-24 md:px-8 md:py-32">
        <div className="pointer-events-none absolute inset-0 opacity-50 [background-image:radial-gradient(circle_at_18%_22%,rgba(200,148,66,0.14),transparent_24rem),radial-gradient(circle_at_84%_70%,rgba(18,60,47,0.10),transparent_22rem),linear-gradient(90deg,rgba(18,60,47,0.035)_1px,transparent_1px),linear-gradient(rgba(18,60,47,0.025)_1px,transparent_1px)] [background-size:auto,auto,44px_44px,44px_44px]" />
        <div className="pointer-events-none absolute -right-20 top-16 h-64 w-64 rounded-full border border-forest/10" />
        <div className="pointer-events-none absolute -bottom-24 left-10 h-72 w-72 rounded-full border border-gold/20" />
        <div className="qyj-fade-up relative mx-auto max-w-7xl">
          <div className="max-w-4xl">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-gold">Tea Categories</p>
            <h2 className="mt-5 font-serif text-4xl font-semibold leading-[0.98] text-forest sm:text-5xl md:text-7xl">
              THREE EXPRESSIONS. ONE JOURNEY.
            </h2>
          </div>

          <div className="mt-14 grid gap-5 lg:grid-cols-3">
            {teaCategories.map((category) => (
              <article
                key={category.title}
                className="qyj-fade-up relative overflow-hidden border border-forest/10 bg-[#fbfaf6]/90 p-7 transition duration-300 hover:-translate-y-1 md:p-9"
              >
                <div className="absolute right-6 top-6 h-20 w-20 rounded-full border border-gold/15" />
                <p className="font-serif text-4xl font-semibold leading-tight text-forest">{category.title}</p>
                <p className="mt-6 text-base leading-7 text-forest/60">{category.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#f8f5ed] px-5 py-24 md:px-8 md:py-32">
        <div className="qyj-fade-up mx-auto max-w-7xl">
          <div className="grid gap-8 md:grid-cols-[1fr_auto] md:items-end">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-gold">Featured Collection</p>
              <h2 className="mt-5 max-w-4xl font-serif text-5xl font-semibold leading-[0.98] text-forest md:text-7xl">
                Signature sparkling tea, composed for lift.
              </h2>
            </div>
            <ButtonLink
              className="w-fit rounded-full border border-forest/20 bg-white px-7 text-forest shadow-[0_18px_45px_rgba(10,24,20,0.07)] hover:-translate-y-0.5"
              href={localizedPath(params.locale, "/menu")}
            >
              Explore Menu
            </ButtonLink>
          </div>

          <div className="mt-14 grid gap-5 lg:grid-cols-3">
            {featuredDrinks.map((drink) => (
              <article key={drink.id} className="qyj-fade-up group overflow-hidden bg-white shadow-[0_28px_75px_rgba(10,24,20,0.08)] transition duration-300 hover:-translate-y-1">
                <div className="relative aspect-[4/5] overflow-hidden bg-[linear-gradient(180deg,#fbfaf6,#edf3ef)] p-5">
                  {drink.image_url ? <Image
                    src={drink.image_url}
                    alt={`${drink.name_en} Qing Yun Jian product artwork`}
                    title={`${drink.name_en} sparkling tea by Qing Yun Jian`}
                    fill
                    sizes="(min-width: 768px) 33vw, 100vw"
                    className="p-3 object-contain transition duration-500 group-hover:scale-[1.015]"
                  /> : <div className="grid h-full place-items-center font-serif text-3xl text-forest">{drink.name_en}</div>}
                </div>
                <div className="p-7 md:p-8">
                  <div className="flex items-start justify-between gap-5">
                    <div>
                      <p className="font-serif text-3xl font-semibold text-forest">{drink.name_zh}</p>
                      <h3 className="mt-2 text-xs font-bold uppercase tracking-[0.22em] text-gold">{drink.name_en}</h3>
                    </div>
                    <span className="mt-1 h-px min-w-12 flex-1 bg-forest/10" />
                  </div>
                  <p className="mt-5 leading-7 text-forest/60">{drink.description_en}</p>
                  <ButtonLink
                    className="mt-7 rounded-full border border-forest/20 px-6 text-forest hover:-translate-y-0.5 hover:border-forest"
                    href={localizedPath(params.locale, "/menu")}
                  >
                    View Menu
                  </ButtonLink>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {homepagePromotions.length > 0 ? (
        <section className="overflow-hidden bg-white px-5 py-24 md:px-8 md:py-32">
          <div className="qyj-fade-up mx-auto max-w-7xl">
            <div className="grid gap-8 md:grid-cols-[1fr_auto] md:items-end">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.24em] text-gold">WHAT&apos;S ON</p>
                <h2 className="mt-5 max-w-4xl font-serif text-5xl font-semibold leading-[0.98] text-forest md:text-7xl">
                  Something New Is Rising.
                </h2>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row md:justify-self-end">
                <ButtonLink
                  className="rounded-full border border-forest/20 bg-white px-7 text-forest shadow-[0_18px_45px_rgba(10,24,20,0.07)] hover:-translate-y-0.5"
                  href={localizedPath(params.locale, "/promotions")}
                >
                  View All Promotions
                </ButtonLink>
                <ButtonLink
                  className="rounded-full bg-forest px-7 text-white shadow-[0_18px_45px_rgba(10,24,20,0.10)] hover:-translate-y-0.5 hover:bg-ink"
                  href={localizedPath(params.locale, "/ascend/leaderboard")}
                >
                  View Community Leaderboard
                </ButtonLink>
              </div>
            </div>

            <div className="mt-14 grid gap-6">
              {homepagePromotions.map((promotion) => {
                const coverImage = promotion.cover_image_url || promotion.image_url;
                const homepageCopy = promotion.subtitle && promotion.description ? `${promotion.subtitle} ${promotion.description}` : promotion.subtitle || promotion.description;
                const ctaHref = promotion.cta_url || localizedPath(params.locale, `/promotions/${promotion.slug}`);
                const ctaLabel = promotion.cta_label || "View Promotion";

                return (
                <article
                  key={promotion.id}
                  className="qyj-fade-up grid overflow-hidden bg-[#f8f5ed] shadow-[0_28px_75px_rgba(10,24,20,0.08)] lg:grid-cols-[minmax(0,45%)_minmax(0,55%)] lg:items-center"
                >
                  {coverImage ? (
                    <div className="lg:flex lg:justify-center">
                      <PromotionCardImage alt={`${promotion.title} campaign artwork`} mode={promotion.image_display_mode ?? "auto"} src={coverImage} variant="homepage" />
                    </div>
                  ) : null}
                  <div className="p-7 md:p-10 lg:flex lg:h-full lg:flex-col lg:justify-center lg:p-12">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="rounded-full border border-gold/35 px-3 py-1 text-[0.7rem] font-bold uppercase tracking-[0.16em] text-gold">
                        {promotionStatusLabel(promotion)}
                      </span>
                      <span className="text-sm font-semibold text-forest/55">
                        {formatPromotionDateRange(promotion.start_date, promotion.end_date)}
                      </span>
                    </div>
                    <h3 className="mt-6 font-serif text-4xl font-semibold leading-tight text-forest">{promotion.title}</h3>
                    {homepageCopy ? (
                      <p className="mt-5 max-h-24 max-w-2xl overflow-hidden text-lg leading-8 text-forest/65 [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:3]">
                        {homepageCopy}
                      </p>
                    ) : null}
                    <ButtonLink
                      className="mt-7 rounded-full border border-forest/20 px-6 text-forest hover:-translate-y-0.5 hover:border-forest"
                      href={ctaHref}
                    >
                      {ctaLabel}
                    </ButtonLink>
                  </div>
                </article>
                );
              })}
            </div>
          </div>
        </section>
      ) : null}

      <AscendCommunityCard />

      <section className="px-5 py-24 md:px-8 md:py-32">
        <div className="mx-auto grid max-w-7xl gap-12 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] xl:items-center">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-gold">Membership</p>
            <h2 className="mt-5 max-w-2xl font-serif text-5xl font-semibold leading-[0.98] text-forest md:text-7xl">
              Membership That Rewards Every Visit.
            </h2>
            <p className="mt-7 max-w-lg text-lg leading-8 text-forest/60">
              Join Qing Yun Jian for daily member drink privileges, points, and referral rewards across the soft launch period.
            </p>
          </div>

          <div className="min-w-0 bg-forest p-6 text-white shadow-[0_35px_110px_rgba(18,60,47,0.22)] md:p-10">
            <div className="grid gap-px bg-white/12 md:grid-cols-[1.25fr_0.75fr]">
              <div className="bg-forest p-6 md:p-8 md:pr-10">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/50">Membership</p>
                <p className="mt-5 whitespace-nowrap font-serif text-6xl font-semibold md:text-[4.3rem]">S$39.90</p>
              </div>
              <div className="bg-forest p-6 md:p-8 md:justify-self-end md:pl-10">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/50">Validity</p>
                <p className="mt-5 font-serif text-6xl font-semibold md:text-7xl">60</p>
                <p className="mt-2 text-lg font-semibold text-white/70">Days</p>
              </div>
            </div>

            <div className="mt-7 grid gap-1">
              {benefits.map((benefit) => (
                <div key={benefit} className="flex items-center justify-between gap-5 border-b border-white/12 py-4 text-base font-semibold md:text-lg">
                  <span>{benefit}</span>
                  <span className="text-sm font-bold uppercase tracking-[0.12em] text-gold">Included</span>
                </div>
              ))}
            </div>

            <ButtonLink className="mt-9 w-full rounded-full bg-gold text-ink hover:-translate-y-0.5 hover:bg-[#d4a559]" href={localizedPath(params.locale, "/register")}>
              Join Now
            </ButtonLink>
          </div>
        </div>
      </section>

      {store && <section className="bg-white px-5 py-24 md:px-8 md:py-32">
        <div className="qyj-fade-up mx-auto grid max-w-7xl gap-12 xl:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] xl:items-stretch">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-gold">VISIT US</p>
            <h2 className="mt-5 font-serif text-[2.4rem] font-semibold leading-[0.98] text-forest md:text-[3.6rem]">
              Visit Qing Yun Jian
              <br />
              at {store.name}
            </h2>
          </div>

          <div className="grid min-w-0 gap-8 overflow-hidden bg-[#f8f5ed] p-7 md:p-12">
            <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(10rem,0.72fr)]">
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-gold">Address</p>
                <p className="mt-4 font-serif text-4xl font-semibold leading-[1.22] text-forest md:text-[2.5rem]">
                  {addressLines.map((line, index) => <span className={index ? "block md:text-[2.125rem]" : "block"} key={line}>{line}</span>)}
                </p>
              </div>
              {hoursDisplay && <div className="min-w-0 text-sm font-semibold leading-7 text-forest/65 lg:justify-self-end lg:text-right">
                <p className="text-xs uppercase tracking-[0.18em] text-gold">Opening Hours</p>
                <p className="mt-4">Today: {hoursDisplay}</p>
              </div>}
            </div>
            <div className="relative aspect-[16/10] min-h-[18rem] w-full min-w-0 overflow-hidden">
              <iframe
                className="absolute inset-0 h-full w-full border-0"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                src={storeMapEmbedUrl(store)}
                title={`Google Map showing Qing Yun Jian at ${store.name}`}
              />
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <ButtonLink className="rounded-full bg-forest px-8 text-white hover:-translate-y-0.5 hover:bg-ink" href={storeDirectionsUrl(store)}>
                Plan Your Visit
              </ButtonLink>
            </div>
          </div>
        </div>
      </section>}
    </main>
  );
}

