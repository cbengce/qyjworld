"use client";

import { useMemo, useState } from "react";
import { Locale } from "@/lib/constants";
import { finalMenuItems } from "@/lib/final-menu-items";
import type { MenuItem } from "@/lib/menu-types";

const signatureNames = ["Luna Tide", "Night Nectar", "Evenfall"] as const;

function displayPrimaryName(item: MenuItem, locale: Locale) {
  return locale === "zh" ? item.name_zh || item.name_en : item.name_en;
}

function displaySecondaryName(item: MenuItem, locale: Locale) {
  return locale === "zh" ? item.name_en : item.name_zh;
}

function displayDescription(item: MenuItem, locale: Locale) {
  return locale === "zh" ? item.description_zh || item.description_en : item.description_en;
}

function displayCategory(item: MenuItem, locale: Locale) {
  return locale === "zh"
    ? item.menu_categories?.name_zh || item.menu_categories?.name_en || "青云间系列"
    : item.menu_categories?.name_en || "Qing Yun Jian Collection";
}

function isComingSoon(item: MenuItem) {
  return item.name_en.toLowerCase() === "golden tide";
}

function formatPrice(price: number | null, item: MenuItem, locale: Locale) {
  if (price === null) {
    if (isComingSoon(item)) return locale === "zh" ? "即将推出" : "Coming Soon";
    return locale === "zh" ? "店内公布" : "In Store";
  }

  return new Intl.NumberFormat("en-SG", {
    style: "currency",
    currency: "SGD",
    minimumFractionDigits: 2
  }).format(price);
}

function isSignature(name: string) {
  return signatureNames.some((signature) => name.toLowerCase().includes(signature.toLowerCase()));
}

function ProductArtwork({ item }: { item: MenuItem }) {
  if (item.image_url) {
    return (
      <div
        aria-label={`${item.name_en} product image`}
        className="h-full min-h-[15rem] w-full bg-[#f8f5ed]"
        role="img"
        style={{
          backgroundImage: `url("${item.image_url}")`,
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          backgroundSize: "contain"
        }}
      />
    );
  }

  return (
    <div className="grid h-full min-h-[15rem] place-items-center bg-[linear-gradient(135deg,#f8f5ed,#e8f0ec_52%,#d8c7a8)] px-8 text-center">
      <div>
        <p className="font-serif text-4xl font-semibold text-forest">{item.name_en}</p>
        <p className="mt-3 text-sm font-bold uppercase tracking-[0.18em] text-gold">{item.name_zh}</p>
      </div>
    </div>
  );
}

function SignatureSpotlight({ locale }: { locale: Locale }) {
  const zh = locale === "zh";
  const signatureItems = finalMenuItems.filter((item) => isSignature(item.name_en));

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {signatureItems.map((item) => (
        <article key={item.id} className="group overflow-hidden bg-white shadow-[0_30px_80px_rgba(10,24,20,0.12)] transition duration-500 hover:-translate-y-1">
          <div className="aspect-[3/2] overflow-hidden bg-[#f8f5ed]">
            <ProductArtwork item={item} />
          </div>
          <div className="p-6">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-gold">{zh ? "招牌" : "Signature"}</p>
            <h2 className="mt-4 font-serif text-4xl font-semibold leading-none text-forest">{item.name_en}</h2>
            <p className="mt-2 text-sm font-bold uppercase tracking-[0.16em] text-forest/45">{item.name_zh}</p>
            <p className="mt-4 text-sm leading-6 text-forest/60">{displayDescription(item, locale)}</p>
          </div>
        </article>
      ))}
    </div>
  );
}

export function MenuCatalogue({ items, locale }: { items: MenuItem[]; locale: Locale }) {
  const zh = locale === "zh";
  const [activeCategory, setActiveCategory] = useState("All");
  const categories = useMemo(() => {
    const names = items.map((item) => displayCategory(item, locale));
    return ["All", ...Array.from(new Set(names))];
  }, [items, locale]);
  const filteredItems = useMemo(() => {
    if (activeCategory === "All") return items;
    return items.filter((item) => displayCategory(item, locale) === activeCategory);
  }, [activeCategory, items, locale]);

  return (
    <div>
      <section className="relative overflow-hidden bg-[#071713] px-5 pb-20 pt-24 text-white md:px-8 md:pb-28 md:pt-32">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_78%_22%,rgba(200,148,66,0.16),transparent_34%),linear-gradient(115deg,rgba(7,23,19,1),rgba(18,60,47,0.92)_48%,rgba(18,60,47,0.62))]" />
        <div className="qyj-grain absolute inset-0 opacity-[0.10]" />
        <div className="relative mx-auto max-w-7xl">
          <p className="text-xs font-bold uppercase tracking-[0.32em] text-gold">{zh ? "产品目录" : "Product Catalogue"}</p>
          <div className="mt-7 grid gap-8 md:grid-cols-[0.95fr_1.05fr] md:items-end">
            <h1 className="font-serif text-6xl font-semibold leading-[0.92] md:text-8xl">
              {zh ? "青云间精选茶饮。" : "A quieter kind of sparkle."}
            </h1>
            <p className="max-w-2xl text-lg leading-8 text-white/70 md:justify-self-end">
              {zh
                ? "以产品目录的方式探索青云间气泡茶，清晰区分原价与会员价。"
                : "Explore Qing Yun Jian as a curated product catalogue, with signature drinks, member privileges, and clear pricing at a glance."}
            </p>
          </div>
        </div>
      </section>

      <section className="bg-[#f8f5ed] px-5 py-16 md:px-8 md:py-24">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-7 md:grid-cols-[0.7fr_1.3fr] md:items-end">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-gold">{zh ? "招牌系列" : "Signature Collection"}</p>
              <h2 className="mt-4 font-serif text-5xl font-semibold leading-none text-forest md:text-6xl">
                Luna Tide, Night Nectar, Evenfall.
              </h2>
            </div>
            <p className="max-w-2xl leading-7 text-forest/60 md:justify-self-end">
              {zh
                ? "三款核心风味作为品牌入口，呈现更轻盈、更精致的东方茶饮体验。"
                : "The three hero drinks anchor the collection: lighter textures, layered tea notes, and a polished finish."}
            </p>
          </div>
          <div className="mt-12">
            <SignatureSpotlight locale={locale} />
          </div>
        </div>
      </section>

      <section className="bg-white px-5 py-16 md:px-8 md:py-24">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-gold">{zh ? "完整目录" : "Full Catalogue"}</p>
              <h2 className="mt-4 font-serif text-5xl font-semibold leading-none text-forest md:text-6xl">
                {zh ? "按系列浏览。" : "Browse by collection."}
              </h2>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1 md:justify-end">
              {categories.map((category) => {
                const active = category === activeCategory;
                return (
                  <button
                    key={category}
                    aria-pressed={active}
                    type="button"
                    onClick={() => setActiveCategory(category)}
                    className={`focus-ring shrink-0 rounded-full border px-5 py-3 text-sm font-bold transition duration-300 ${
                      active
                        ? "border-forest bg-forest text-white shadow-[0_16px_40px_rgba(18,60,47,0.16)]"
                        : "border-forest/10 bg-[#f8f5ed] text-forest/70 hover:-translate-y-0.5 hover:border-forest/25 hover:text-forest"
                    }`}
                  >
                    {category === "All" && zh ? "全部" : category}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {filteredItems.map((item) => {
              const primaryName = displayPrimaryName(item, locale);
              const secondaryName = displaySecondaryName(item, locale);
              const description = displayDescription(item, locale);
              const memberHasBenefit = item.regular_price !== null && item.member_price !== null && item.member_price < item.regular_price;
              const signature = isSignature(item.name_en);
              const comingSoon = isComingSoon(item);

              return (
                <article key={item.id} className="group overflow-hidden bg-[#fbfaf6] shadow-[0_26px_70px_rgba(10,24,20,0.08)] transition duration-500 hover:-translate-y-1 hover:shadow-[0_34px_90px_rgba(10,24,20,0.13)]">
                  <div className="relative aspect-[3/2] overflow-hidden bg-[#f8f5ed]">
                    <ProductArtwork item={item} />
                    <div className="absolute left-5 top-5 flex flex-wrap gap-2">
                      <span className="bg-white/90 px-3 py-2 text-[11px] font-bold uppercase tracking-[0.14em] text-forest shadow-[0_10px_28px_rgba(5,18,15,0.12)] backdrop-blur">
                        {displayCategory(item, locale)}
                      </span>
                      {(signature || item.is_featured) && (
                        <span className="bg-gold px-3 py-2 text-[11px] font-bold uppercase tracking-[0.14em] text-ink shadow-[0_10px_28px_rgba(200,148,66,0.20)]">
                          {zh ? "推荐" : "Featured"}
                        </span>
                      )}
                      {comingSoon && (
                        <span className="bg-ink px-3 py-2 text-[11px] font-bold uppercase tracking-[0.14em] text-white shadow-[0_10px_28px_rgba(16,32,27,0.22)]">
                          {zh ? "即将推出" : "Coming Soon"}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="p-6 md:p-7">
                    <h3 className="font-serif text-4xl font-semibold leading-none text-forest">{primaryName}</h3>
                    <p className="mt-2 text-sm font-bold uppercase tracking-[0.18em] text-gold">{secondaryName}</p>
                    <p className="mt-4 min-h-14 text-sm leading-7 text-forest/60">{description || (zh ? "青云间精选茶饮。" : "Qing Yun Jian curated tea expression.")}</p>

                    <div className="mt-7 grid grid-cols-2 gap-px bg-forest/10">
                      <div className="bg-white p-4">
                        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-forest/45">{zh ? "原价" : "Regular"}</p>
                        <p className="mt-2 text-xl font-bold text-forest">{formatPrice(item.regular_price, item, locale)}</p>
                      </div>
                      <div className="bg-forest p-4 text-white">
                        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-white/50">{zh ? "会员价" : "Member"}</p>
                        <p className="mt-2 text-xl font-bold text-gold">{formatPrice(item.member_price, item, locale)}</p>
                      </div>
                    </div>

                    <div className="mt-5 flex items-center justify-between gap-4 text-xs font-bold uppercase tracking-[0.14em]">
                      <span className="text-forest/45">{comingSoon ? (zh ? "季节预告" : "Seasonal preview") : item.is_featured ? (zh ? "精选饮品" : "Curated selection") : (zh ? "青云间产品" : "QYJ catalogue")}</span>
                      {memberHasBenefit && <span className="text-gold">{zh ? "会员优惠" : "Member value"}</span>}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          {!filteredItems.length && (
            <div className="mt-10 border border-forest/10 bg-[#f8f5ed] p-10 text-center">
              <p className="font-serif text-3xl font-semibold text-forest">{zh ? "此系列暂无产品。" : "No products in this collection yet."}</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
