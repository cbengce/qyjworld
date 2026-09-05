import type { Metadata } from "next";
import { Locale } from "@/lib/constants";
import { ButtonLink, Section } from "@/components/ui";
import { breadcrumbSchema, createPageMetadata } from "@/lib/seo";
import { StructuredData } from "@/components/structured-data";
import { getPrimaryStore } from "@/lib/stores";
import { effectiveStoreHoursForDate, formatEffectiveStoreHours, storeAddressLines, storeDirectionsUrl } from "@/lib/store-types";

export function generateMetadata({ params }: { params: { locale: Locale } }): Metadata {
  return createPageMetadata({
    locale: params.locale,
    path: "/contact",
    title: "Contact Qing Yun Jian Singapore",
    description: "Visit Qing Yun Jian at MacPherson Mall Singapore.",
    keywords: ["Qing Yun Jian contact", "MacPherson Mall tea", "tea shop MacPherson Road", "Qing Yun Jian opening hours"]
  });
}

export default async function ContactPage({ params }: { params: { locale: Locale } }) {
  const zh = params.locale === "zh";
  const store = await getPrimaryStore();
  const effectiveHours = store ? effectiveStoreHoursForDate(store) : null;
  const hoursDisplay = effectiveHours ? formatEffectiveStoreHours(effectiveHours) : "";
  const whatsappUrl =
    "https://wa.me/?text=Hello%20Qing%20Yun%20Jian%2C%20I%20would%20like%20to%20ask%20about%20your%20tea%20and%20membership.";

  return (
    <main>
      <StructuredData data={breadcrumbSchema(params.locale, [{ name: "Home" }, { name: "Contact", path: "/contact" }])} />
      <Section>
        <div className="mx-auto grid max-w-7xl gap-8 md:grid-cols-2">
          <div>
            <p className="text-sm font-bold text-gold">{zh ? "门店信息" : "Store Information"}</p>
            <h1 className="mt-3 font-serif text-6xl font-semibold">{zh ? "联系青云间" : "Contact Qing Yun Jian"}</h1>
          </div>
          <div className="bg-white p-8 shadow-soft">
            {store && <p className="text-lg font-bold">{storeAddressLines(store).map((line) => <span className="block" key={line}>{line}</span>)}</p>}
            <p className="mt-6 text-forest/70">
              {zh
                ? "欢迎来到青云间，新加坡现代东方气泡茶品牌。到店品尝清爽茶饮，了解会员礼遇，或与我们联系安排您的到访。"
                : "Welcome to Qing Yun Jian, Singapore's modern Oriental sparkling tea brand. Visit us for a refined tea experience, explore membership benefits, or reach out before your visit."}
            </p>
            <div className="mt-8 grid gap-5 text-sm font-semibold text-forest md:grid-cols-2">
              {hoursDisplay && <div>
                <p className="text-xs uppercase tracking-[0.18em] text-gold">{zh ? "营业时间" : "Opening Hours"}</p>
                <p className="mt-2">{zh ? "今日" : "Today"}: {hoursDisplay}</p>
              </div>}
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-gold">{zh ? "网站" : "Website"}</p>
                <p className="mt-2">www.qyjworld.com</p>
              </div>
            </div>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              {store && <ButtonLink className="rounded-full bg-forest px-8 text-white hover:-translate-y-0.5 hover:bg-ink" href={storeDirectionsUrl(store)}>
                Get Directions
              </ButtonLink>}
              <ButtonLink className="rounded-full border border-forest/20 px-8 text-forest hover:-translate-y-0.5 hover:border-forest hover:bg-forest hover:text-white" href={whatsappUrl}>
                WhatsApp Us
              </ButtonLink>
            </div>
          </div>
        </div>
      </Section>
    </main>
  );
}
