import type { Locale } from "@/lib/constants";
import { allContent } from "@/lib/content/catalog";
import type { Promotion } from "@/lib/promotions";

export type SearchRecord = { id: string; type: "Article" | "Guide" | "FAQ" | "Promotion"; title: string; description: string; href: string; keywords: string[] };

const faqRecords = [
  { id: "faq-membership-activation", title: "How is membership activated?", description: "Registration creates a pending membership. An administrator activates the 60-day membership after payment confirmation." },
  { id: "faq-membership-fee", title: "What is the membership fee?", description: "Qing Yun Jian membership is SGD 39.90 for 60 days from activation." },
  { id: "faq-member-points", title: "Can members edit their own points?", description: "No. Points are managed through a secure transaction ledger." }
];

export function buildSearchIndex(locale: Locale, promotions: Promotion[]): SearchRecord[] {
  const contentRecords: SearchRecord[] = allContent.map((entry) => ({ id: `${entry.kind}-${entry.slug}`, type: entry.kind === "guide" ? "Guide" : "Article", title: entry.title, description: entry.description, href: `/${locale}/${entry.kind === "guide" ? "guides" : "blog"}/${entry.slug}`, keywords: [entry.category, ...entry.keywords] }));
  const faq: SearchRecord[] = faqRecords.map((item) => ({ ...item, type: "FAQ", href: `/${locale}/faq`, keywords: ["membership", "help", "Qing Yun Jian"] }));
  const promotionRecords: SearchRecord[] = promotions.map((promotion) => ({ id: `promotion-${promotion.id}`, type: "Promotion", title: promotion.title, description: promotion.subtitle || promotion.description || "Qing Yun Jian promotion", href: `/${locale}/promotions/${promotion.slug}`, keywords: ["promotion", "campaign", "Qing Yun Jian"] }));
  return [...contentRecords, ...faq, ...promotionRecords];
}

export function searchRecords(records: SearchRecord[], query: string) {
  const terms = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  if (!terms.length) return [];
  return records.filter((record) => { const haystack = [record.title, record.description, record.type, ...record.keywords].join(" ").toLowerCase(); return terms.every((term) => haystack.includes(term)); });
}
