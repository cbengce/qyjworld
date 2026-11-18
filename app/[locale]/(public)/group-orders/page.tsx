import { GroupPlanningGuide } from "@/components/group-orders/planning-guide";
import { PegasusPortrait } from "@/components/pegasus-portrait";
import Link from "next/link";
import { getCurrentUser } from "@/lib/data";
import type { Metadata } from "next";
import { GroupOrderForm } from "@/components/group-orders/order-form";
import { getMenuItems } from "@/lib/menu";
import { getPrimaryStore } from "@/lib/stores";
import { createPageMetadata } from "@/lib/seo";
import type { Locale } from "@/lib/constants";
export const dynamic = "force-dynamic";
export function generateMetadata({ params }: { params: { locale: Locale } }): Metadata {
  return createPageMetadata({ locale: params.locale, path: "/group-orders", title: params.locale === "zh" ? "新加坡办公室与活动团体订茶 | 青云间" : "Office & Event Tea Group Orders Singapore | QING YUN JIAN", description: params.locale === "zh" ? "为办公室茶歇、会议或聚会选择青云间茶饮。提交数量、时间与自取或配送申请，由团队确认报价及安排。" : "Choose QING YUN JIAN tea for an office break, meeting or gathering in Singapore. Submit quantities and a collection or delivery request for quotation and confirmation." });
}

const foodLineTiers = [
  { cups: 10, discount: 12 },
  { cups: 15, discount: 15 },
  { cups: 20, discount: 18 },
  { cups: 30, discount: 20 },
  { cups: 40, discount: 22 }
] as const;

function FoodLineGroupSales({ locale }: { locale: Locale }) {
  const zh = locale === "zh";
  // Offer remains visible through 4 January 2027 in Singapore.
  if (Date.now() >= new Date("2027-01-05T00:00:00+08:00").getTime()) return null;
  return (
    <section id="foodline-group-sales" aria-labelledby="foodline-group-sales-heading" className="mx-auto max-w-6xl px-5 pt-12 md:px-8">
      <div className="overflow-hidden rounded-3xl bg-[#063e2e] text-[#f9f1d8] shadow-[0_26px_70px_rgba(8,47,35,0.20)]">
        <div className="grid gap-8 p-7 md:grid-cols-[210px_1fr] md:gap-10 md:p-12">
          <div className="flex items-start justify-center md:justify-start">
            <img src="/assets/qing-yun-jian-logo-official.png" alt="Official Qing Yun Jian gold Pegasus logo" className="h-auto w-36 rounded-lg md:w-48" loading="lazy" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.23em] text-[#eec98c]">FoodLine · Christmas & New Year</p>
            <h2 id="foodline-group-sales-heading" className="mt-3 font-serif text-3xl font-semibold leading-tight md:text-5xl">
              {zh ? "FoodLine 节庆团购优惠" : "FoodLine Festive Group Sales"}
            </h2>
            <p className="mt-4 max-w-2xl text-base leading-7 text-white/85">
              {zh ? "办公室茶歇、圣诞聚会、元旦庆祝与企业活动。多杯订购，享有阶梯优惠。" : "Office tea breaks, Christmas gatherings, New Year celebrations and corporate events. Enjoy tiered savings on group orders."}
            </p>
            <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {foodLineTiers.map((tier) => (
                <div key={tier.cups} className="rounded-2xl border border-[#dfbe77]/50 bg-[#fff8e7] px-3 py-5 text-center text-[#164b35]">
                  <p className="text-sm font-bold">{tier.cups}+ {zh ? "杯" : "cups"}</p>
                  <p className="mt-1 text-3xl font-black text-[#9c2424]">{tier.discount}%</p>
                  <p className="text-xs font-bold uppercase tracking-wider">OFF</p>
                </div>
              ))}
            </div>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <a href="https://www.foodline.sg/catering/Qing-Yun-Jian/" target="_blank" rel="noopener noreferrer" className="inline-flex min-h-12 items-center justify-center rounded-full bg-[#c92c2a] px-7 py-3 text-sm font-bold text-white transition hover:bg-[#af2624]">
                {zh ? "前往 FoodLine 订购" : "Order on FoodLine"}
              </a>
              <span className="rounded-full border border-[#e9c887]/50 px-4 py-3 text-sm font-semibold text-[#f6d79b]">
                {zh ? "优惠至 2027年1月4日" : "Valid until 4 January 2027"}
              </span>
            </div>
            <p className="mt-5 text-xs leading-6 text-white/70">
              {zh ? "仅适用于 FoodLine 平台指定饮品及符合条件的团购订单。优惠是否已启用及最终价格以 FoodLine 结账页面为准；不可与其他优惠叠加。" : "For eligible selected drinks ordered through FoodLine only. Availability and final discounted price are subject to the FoodLine checkout. Offers cannot be combined with other promotions."}
            </p>
            <p className="mt-3 text-sm italic text-[#f4dca7]">Sparkling Tea Reimagined</p>
          </div>
        </div>
      </div>
    </section>
  );
}

export default async function GroupOrdersPage({ params }: { params: { locale: Locale } }) {
  const [menu, store, user] = await Promise.all([getMenuItems(), getPrimaryStore(), getCurrentUser()]);
  const zh = params.locale === "zh";
  const available = menu.filter(m => m.availability_status === "available");
  return <main className="qyj-playful-orders bg-[#f8f5ed] pb-20 text-forest"><section className="relative overflow-hidden bg-[#eaf0e3] px-5 py-14 md:px-8 md:py-20"><div aria-hidden="true" className="absolute -right-12 -top-16 h-80 w-80 rounded-full bg-[#f9d6c0]/60 blur-2xl" /><div className="relative mx-auto max-w-6xl lg:pr-[380px]"><p className="text-xs font-bold uppercase tracking-[.25em] text-forest/70">{zh ? "青云间 · 团体订购" : "QING YUN JIAN · Tea, together"}</p><h1 className="mt-5 max-w-3xl font-serif text-5xl leading-[1.08] md:text-7xl">{zh ? <>办公室与活动，<br />一起分享好茶。</> : <>Office & event tea.<br />Better together.</>}</h1><p className="mt-6 max-w-xl text-lg leading-8 text-forest/70">{zh ? "办公室的午后、朋友的聚会、值得庆祝的一天。挑选大家喜欢的茶饮，把您的安排交给我们一起确认。" : "An office afternoon, a gathering with friends, a day worth celebrating. Choose your teas and let us help plan the details."}</p><a href="#choose-drinks" className="mt-7 inline-flex rounded-full bg-forest px-7 py-4 font-bold text-white">{zh ? "开始挑选茶饮 ↓" : "Build your tea order ↓"}</a><div className="mt-9 flex flex-wrap gap-3 text-sm">{(zh ? ["办公室茶歇", "聚会与活动", "自取或申请配送"] : ["Office tea breaks", "Gatherings & events", "Collection or delivery request"]).map(label => <span key={label} className="rounded-full border border-forest/15 bg-white/50 px-4 py-2">{label}</span>)}</div><div className="mt-8 flex justify-center gap-3 lg:absolute lg:right-0 lg:top-8 lg:mt-0"><PegasusPortrait name="Luna Tide" className="h-52 w-40 -rotate-6 lg:h-72 lg:w-44" /><PegasusPortrait name="Night Nectar" className="mt-10 h-52 w-36 rotate-6 lg:h-72 lg:w-40" /></div></div></section><div className="mx-auto max-w-6xl px-5 pt-12 md:px-8">{store && available.length ? <><div className="mb-8 rounded-2xl border border-forest/10 bg-white p-5"><p className="font-bold">{zh ? "免费访客团单 · 不需要付费会员" : "Guest group orders · no paid membership required"}</p><p className="mt-2 text-sm leading-6 text-forest/65">{zh ? "填写联系方式即可提交。WhatsApp 是主要报价及沟通方式，电子邮件为备用。" : "Submit with your contact details. WhatsApp is our main quotation and contact option; email is the alternative."}</p><div className="mt-3 flex flex-wrap gap-5 text-sm font-bold underline">{user ? <Link href={`/${params.locale}/guest`}>{zh ? "查看我的团单及报价" : "My group orders & quotations"}</Link> : <><Link href={`/${params.locale}/guest/register`}>{zh ? "创建免费访客账号（可选）" : "Create a free guest account (optional)"}</Link><Link href={`/${params.locale}/login?returnTo=/${params.locale}/group-orders`}>{zh ? "已有账号？登录" : "Already have an account? Sign in"}</Link></>}</div></div><GroupOrderForm menu={available} locale={params.locale} storeName={store.name} contact={user ? { name: user.user_metadata?.full_name || "", email: user.email || "", phone: user.user_metadata?.mobile || "" } : undefined} /></> : <p className="rounded-2xl bg-white p-8">{zh ? "目前暂无可提交的饮品，请稍后重试。" : "The group-order menu is currently unavailable. Please try again later."}</p>}</div><FoodLineGroupSales locale={params.locale} /><GroupPlanningGuide locale={params.locale} /></main>;
}
