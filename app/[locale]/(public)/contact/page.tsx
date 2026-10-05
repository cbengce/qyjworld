import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { Locale } from "@/lib/constants";
import { ButtonLink, Section } from "@/components/ui";
import { breadcrumbSchema, createPageMetadata } from "@/lib/seo";
import { StructuredData } from "@/components/structured-data";
import { getPrimaryStore } from "@/lib/stores";
import { effectiveStoreHoursForDate, formatEffectiveStoreHours, storeAddressLines, storeDirectionsUrl, storeWhatsAppUrl, publicWeeklyHours } from "@/lib/store-types";

export function generateMetadata({ params }: { params: { locale: Locale } }): Metadata {
  return createPageMetadata({
    locale: params.locale,
    path: "/contact",
    title: params.locale === "zh" ? "到青云间 | MacPherson Mall 门店资料" : "Contact Qing Yun Jian Singapore",
    description: params.locale === "zh" ? "查看青云间 MacPherson Mall 门店的现行地址、营业资料与联系入口。" : "Visit Qing Yun Jian at MacPherson Mall Singapore.",
    keywords: ["Qing Yun Jian contact", "MacPherson Mall tea", "tea shop MacPherson Road", "Qing Yun Jian opening hours"]
  });
}

export default async function ContactPage({ params }: { params: { locale: Locale } }) {
  const zh = params.locale === "zh";
  const store = await getPrimaryStore();
  const effectiveHours = store ? effectiveStoreHoursForDate(store) : null;
  const hoursDisplay = effectiveHours ? formatEffectiveStoreHours(effectiveHours) : "";
  const whatsappUrl = storeWhatsAppUrl(store);

  return (
    <main>
      <StructuredData data={breadcrumbSchema(params.locale, [{ name: params.locale === "zh" ? "首页" : "Home" }, { name: params.locale === "zh" ? "到店指南" : "Contact", path: "/contact" }])} />
      <Section>
        <div className="mx-auto grid max-w-7xl gap-8 md:grid-cols-2">
          <div>
            <p className="text-sm font-bold text-gold">{zh ? "门店信息" : "Store Information"}</p>
            <h1 className="mt-3 font-serif text-5xl font-semibold md:text-6xl">{zh ? "联系青云间" : "Contact Qing Yun Jian"}</h1>
            <figure className="mt-8"><Image src="/assets/story/store-welcome-v5.webp" width={1536} height={864} sizes="(min-width: 768px) 50vw, 100vw" alt={zh ? "青云间门店实拍" : "QING YUN JIAN store photograph"} className="w-full rounded-2xl" /><figcaption className="mt-3 text-sm text-forest/60">{zh ? "门店实拍；照片中的海报不代表现行优惠。" : "Store photograph; posters in the image do not establish current offers."}</figcaption></figure>
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
            {store && <dl className="mt-6 grid gap-3 text-sm">
              {store.phone && <div><dt className="font-bold">{zh ? "电话" : "Phone"}</dt><dd><a className="underline" href={`tel:${store.phone}`}>{store.phone}</a></dd></div>}
              {store.public_email && <div><dt className="font-bold">{zh ? "电子邮件" : "Email"}</dt><dd><a className="break-all underline" href={`mailto:${store.public_email}`}>{store.public_email}</a></dd></div>}
            </dl>}
            {store && <section className="mt-8"><h2 className="font-serif text-2xl">{zh ? "每周营业资料" : "Weekly opening information"}</h2><ul className="mt-4 grid gap-2 text-sm">{publicWeeklyHours(store).map(hour => <li key={hour.id} className="flex justify-between gap-4"><span>{zh ? ["周日", "周一", "周二", "周三", "周四", "周五", "周六"][hour.day_of_week] : hour.dayName}</span><span>{hour.is_closed && zh ? "休息" : hour.display}</span></li>)}</ul><p className="mt-3 text-xs text-forest/65">{zh ? "特别日期安排可能覆盖每周时间，请以今日资料为准。" : "Date-specific exceptions may override the weekly schedule; check today's information."}</p></section>}
            <div className="mt-6 flex flex-wrap gap-5 font-bold underline"><Link href={`/${params.locale}/menu`}>{zh ? "查看菜单" : "Explore the menu"}</Link><Link href={`/${params.locale}/group-orders`}>{zh ? "办公室与活动团体订茶" : "Office & event group orders"}</Link></div>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              {store && <ButtonLink className="rounded-full bg-forest px-8 text-white hover:-translate-y-0.5 hover:bg-ink" href={storeDirectionsUrl(store)}>
                {zh ? "查看路线" : "Get Directions"}
              </ButtonLink>}
              <ButtonLink className="rounded-full border border-forest/20 px-8 text-forest hover:-translate-y-0.5 hover:border-forest hover:bg-forest hover:text-white" href={whatsappUrl || `mailto:${store?.public_email || "hello@qyjworld.com"}`}>
                {whatsappUrl ? (zh ? "WhatsApp 联系我们" : "WhatsApp Us") : (zh ? "邮件联系我们" : "Email Us")}
              </ButtonLink>
            </div>
          </div>
        </div>
      </Section>
    </main>
  );
}
