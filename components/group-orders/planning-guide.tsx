import Link from "next/link";
import type { Locale } from "@/lib/constants";
import { FAQSection } from "@/components/content/faq-section";
import { StructuredData } from "@/components/structured-data";
import { BRAND } from "@/lib/constants";
import { breadcrumbSchema } from "@/lib/seo";

export function GroupPlanningGuide({ locale }: { locale: Locale }) {
  const zh = locale === "zh";
  const faq = zh ? [
    { question: "团体订购需要付费会员吗？", answer: "不需要。填写联系方式即可提交，免费访客账号为可选。" },
    { question: "填表后订单就确认了吗？", answer: "不是。申请表不会收取付款或自动预留订单，茶品、报价、时间与执行安排仍须团队确认。" },
    { question: "可以申请配送吗？", answer: "可以在表格中提出配送申请，并填写地址。是否能安排、时间及适用配送费须另行确认。" },
    { question: "需要准备什么资料？", answer: "准备负责人姓名、电话、邮箱、各款茶品数量、申请日期与新加坡时间，以及自取或配送申请。活动或场地的额外说明可以填写备注。" }
  ] : [
    { question: "Do group orders require paid membership?", answer: "No. Submit with your contact details. A free guest account is optional." },
    { question: "Is the order confirmed when I submit the form?", answer: "No. The form does not collect payment or reserve the order automatically. Drinks, quotation, timing and fulfilment must be confirmed by the team." },
    { question: "Can I request delivery?", answer: "Yes. Select a delivery request and provide the address. Availability, timing and any applicable delivery fee require separate confirmation." },
    { question: "What should I prepare?", answer: "Prepare the organiser's name, phone, email, drink quantities, requested date and Singapore time, and a collection or delivery request. Use the notes for additional event or access details." }
  ];
  return <section className="mx-auto max-w-6xl px-5 pt-12 md:px-8" aria-labelledby="group-planning-title">
    <StructuredData data={[
      breadcrumbSchema(locale, [{ name: zh ? "首页" : "Home" }, { name: zh ? "团体订购" : "Group orders", path: "/group-orders" }]),
      { "@context": "https://schema.org", "@type": "Service", "@id": `${BRAND.domain}/${locale}/group-orders#service`, name: zh ? "青云间办公室与活动团体订茶申请" : "QING YUN JIAN office & event tea group-order requests", url: `${BRAND.domain}/${locale}/group-orders`, provider: { "@id": `${BRAND.domain}/#organization` }, description: zh ? "提交办公室、会议或聚会茶饮申请，等待团队确认报价、时间及领取或配送安排。" : "Submit a tea request for an office, meeting or gathering. The team confirms the quotation, timing and collection or delivery arrangements." }
    ]} />
    <h2 id="group-planning-title" className="font-serif text-4xl">{zh ? "从办公室茶歇，到活动相聚" : "Tea for office breaks, meetings and gatherings"}</h2>
    <p className="mt-5 max-w-3xl text-lg leading-8 text-forest/70">{zh ? "在新加坡安排一群人的茶饮，先整理大家的选择，再把数量与活动资料放进一份申请。我们会与您确认报价及安排，收到确认之后再落实订单。" : "Planning tea for a group in Singapore? Collect everyone's choices, then put the quantities and occasion details into one request. We will confirm the quotation and arrangements with you before the order is settled."}</p>
    <ol className="mt-8 grid gap-5 md:grid-cols-3">{(zh ? [
      ["1 · 选择茶饮", "查看现行菜单，按茶品统计数量；涉及原料的问题先提出。"],
      ["2 · 填写安排", "填写负责人联系方式、日期与时间，选择自取或提出配送申请。"],
      ["3 · 确认报价", "通过 WhatsApp 或备用邮箱沟通，核对茶品、金额与执行细节。"]
    ] : [
      ["1 · Choose the drinks", "Use the current menu and total quantities by drink. Raise ingredient questions before agreement."],
      ["2 · Share the arrangements", "Add the organiser's contact details, requested date and time, and collection or delivery request."],
      ["3 · Confirm the quotation", "Discuss through WhatsApp or the alternative email channel, then agree the drinks, amount and fulfilment."]
    ]).map(([title, text]) => <li key={title} className="rounded-2xl border border-forest/10 bg-white p-6"><h3 className="text-xl font-bold">{title}</h3><p className="mt-3 leading-7 text-forest/65">{text}</p></li>)}</ol>
    <p className="mt-6 text-sm leading-6 text-forest/65">{zh ? "申请不是已确认或已付款的订单。配送及费用须确认；此页面没有承诺固定折扣、套餐或执行时限。" : "A request is not a confirmed or paid order. Delivery and any fee require confirmation; this page does not promise a fixed discount, package or lead time."}</p>
    <div className="mt-6 flex flex-wrap gap-6 font-bold underline"><Link href={`/${locale}/guides/office-tea-group-orders-singapore`}>{zh ? "办公室订茶指南" : "Office tea planning guide"}</Link><Link href={`/${locale}/guides/event-tea-order-checklist`}>{zh ? "活动订购清单" : "Event order checklist"}</Link><Link href={`/${locale}/menu`}>{zh ? "查看现行菜单" : "Explore the current menu"}</Link></div>
    <FAQSection faq={faq} locale={locale} />
  </section>;
}
