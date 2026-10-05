import type { Locale } from "@/lib/constants";
import { localizeContent } from "./discovery";
import { allContent } from "@/lib/content/catalog";
import type { Promotion } from "@/lib/promotions";

export type SearchRecord = { id: string; type: "Article" | "Guide" | "FAQ" | "Promotion"; title: string; description: string; href: string; keywords: string[] };

const faqRecords = [
  { id: "faq-membership-activation", title: "How is membership activated?", description: "Registration creates a pending membership. An administrator activates the 60-day membership after payment confirmation." },
  { id: "faq-membership-fee", title: "What is the membership fee?", description: "Qing Yun Jian membership is SGD 39.90 for 60 days from activation." },
  { id: "faq-member-points", title: "Can members edit their own points?", description: "No. Points are managed through a secure transaction ledger." }
];

export function buildSearchIndex(locale: Locale, promotions: Promotion[]): SearchRecord[] {
  const contentRecords: SearchRecord[] = allContent.map(entry => localizeContent(entry, locale)).map((entry) => ({ id: `${entry.kind}-${entry.slug}`, type: entry.kind === "guide" ? "Guide" : "Article", title: entry.title, description: entry.description, href: `/${locale}/${entry.kind === "guide" ? "guides" : "blog"}/${entry.slug}`, keywords: [entry.title, entry.description, entry.category, ...entry.keywords] }));
  const faq: SearchRecord[] = faqRecords.map((item, index) => ({ ...item, ...(locale === "zh" ? [{ title: "会员如何激活？", description: "确认付款后由管理员激活会员。" }, { title: "会员费是多少？", description: "会员费 S$39.90，自激活起 60 天。" }, { title: "积分可以自行修改吗？", description: "积分由后台交易记录管理。" }][index] : {}), type: "FAQ", href: `/${locale}/faq`, keywords: ["membership", "会员", "积分", "帮助", "help", "Qing Yun Jian"] }));
  const promotionRecords: SearchRecord[] = promotions.map((promotion) => ({ id: `promotion-${promotion.id}`, type: "Promotion", title: promotion.title, description: promotion.subtitle || promotion.description || "Qing Yun Jian promotion", href: `/${locale}/promotions/${promotion.slug}`, keywords: ["promotion", "campaign", "Qing Yun Jian"] }));
  return [...contentRecords, ...faq, ...promotionRecords];
}

export function searchRecords(records: SearchRecord[], query: string) {
  const terms = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  if (!terms.length) return [];
  return records.filter((record) => { const haystack = [record.title, record.description, record.type, ...record.keywords].join(" ").toLowerCase(); return terms.every((term) => haystack.includes(term)); });
}
