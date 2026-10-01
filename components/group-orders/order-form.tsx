"use client";
import Image from "next/image";
import { useRef, useState } from "react";
import type { MenuItem } from "@/lib/menu-types";
export function GroupOrderForm({ menu, locale, storeName, contact }: { menu: MenuItem[]; locale: string; storeName: string; contact?: { name: string; email: string; phone: string } }) {
  const zh = locale === "zh";
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [delivery, setDelivery] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [receipt, setReceipt] = useState<{ reference: string; totalCups: number } | null>(null);
  const requestId = useRef<string>("");
  const submittedBody = useRef<string>("");
  const total = Object.values(quantities).reduce((sum, q) => sum + q, 0);
  const text = (en: string, cn: string) => zh ? cn : en;
  const field = "mt-2 min-h-12 w-full rounded-xl border border-forest/20 bg-[#fffdf8] px-4 py-3 text-base text-forest focus:border-forest focus:outline-none focus:ring-2 focus:ring-forest/20";
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError("");
    if (!total) { setError(text("Choose at least one drink.", "请先选择饮品和杯数。")); return; }
    const data = new FormData(event.currentTarget);
    const details = { locale, ...Object.fromEntries(data.entries()), items: menu.filter(m => quantities[m.id] > 0).map(m => ({ id: m.id, quantity: quantities[m.id] })) };
    const fingerprint = JSON.stringify(details);
    if (!requestId.current || submittedBody.current !== fingerprint) requestId.current = crypto.randomUUID();
    submittedBody.current = fingerprint;
    setBusy(true);
    try {
      const response = await fetch("/api/group-orders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...details, requestId: requestId.current }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setReceipt(result);
    } catch (e) { setError(e instanceof Error ? e.message : text("Please try again.", "请稍后重试。")); }
    finally { setBusy(false); }
  }
  if (receipt) return <section role="status" className="rounded-[2rem] border border-forest/10 bg-white p-7 shadow-soft md:p-12"><p className="text-sm font-bold uppercase tracking-[.2em] text-gold">{text("Request received", "已收到您的需求")}</p><h2 className="mt-4 font-serif text-4xl">{text("A little tea, a lot to look forward to.", "让这一场相聚，多一点茶香。")}</h2><p className="mt-6 text-lg">{receipt.totalCups} {text("cups · awaiting quotation and confirmation", "杯 · 等待报价及确认")}</p><p className="mt-4 break-all rounded-xl bg-paper p-4 font-mono text-sm">{receipt.reference}</p><p className="mt-6 leading-7 text-forest/70">{text("Your request has been saved. Our team will contact you mainly through WhatsApp, or by email, using the details you provided to discuss availability, pricing and collection or delivery. No payment has been taken and your time slot is not yet reserved. Keep this reference for follow-up.", "您的需求已保存。我们会主要通过 WhatsApp，或以电子邮件，与您确认供应情况、价格及自取或配送安排。目前尚未收款，也尚未预留时段。请保存编号，方便后续查询。")}</p><a className="mt-7 inline-flex rounded-full bg-forest px-7 py-4 font-bold text-white" href={`/${locale}`}>{text("Back to home", "返回首页")}</a></section>;
  return <form onSubmit={submit} className="space-y-10">
    <section id="choose-drinks"><div className="mb-6 flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[.2em] text-gold">01 / {text("The tea menu", "挑选茶饮")}</p><h2 className="mt-3 font-serif text-3xl md:text-4xl">{text("Something for everyone.", "每个人，都有喜欢的那一杯。")}</h2></div><span aria-live="polite" className="rounded-full bg-forest px-5 py-3 font-bold text-white">{total} {text("cups selected", "杯已选")}</span></div>
      <p className="mb-6 text-sm leading-6 text-forest/65">{text("Select your quantities. Group-order prices and any delivery charge will be quoted separately; prices printed in catalogue artwork are not a group-order quote.", "选择您需要的杯数。团单价格和配送费将另行报价；菜单图片中的历史价格不作为本次团单报价。")}</p>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{menu.map((item, index) => <article key={item.id} className="overflow-hidden rounded-[1.5rem] border border-forest/10 bg-white shadow-[0_8px_30px_rgba(18,60,47,.05)]"><div className={`relative h-48 ${index % 3 === 0 ? "bg-[#f4e5d3]" : index % 3 === 1 ? "bg-[#e7ede2]" : "bg-[#f1e4e6]"}`}>{item.image_url && <Image src={item.image_url} alt={zh ? item.name_zh : item.name_en} fill sizes="(max-width:640px) 90vw, 33vw" className="object-contain p-3" />}</div><div className="p-5"><h3 className="font-serif text-2xl">{zh ? item.name_zh : item.name_en}</h3><p className="mt-2 min-h-12 text-sm leading-6 text-forest/65">{zh ? item.description_zh : item.description_en}</p><label className="mt-4 flex items-center justify-between gap-3 text-sm font-bold">{text("Cups", "杯数")}<input aria-label={`${zh ? item.name_zh : item.name_en} ${text("quantity", "杯数")}`} type="number" min="0" max="300" step="1" value={quantities[item.id] || 0} onChange={e => setQuantities(old => ({ ...old, [item.id]: Number(e.target.value) || 0 }))} className="min-h-12 w-24 rounded-xl border border-forest/20 bg-paper px-3 text-center text-lg" /></label></div></article>)}</div>
    </section>
    <section className="rounded-[2rem] bg-white p-6 shadow-soft md:p-9"><p className="text-xs font-bold uppercase tracking-[.2em] text-gold">02 / {text("The occasion", "安排这次相聚")}</p><h2 className="mt-3 font-serif text-3xl">{text("Tell us your plans.", "告诉我们您的安排。")}</h2><div className="mt-7 grid gap-5 md:grid-cols-2">
      <label className="font-semibold">{text("Contact name", "联系人")}<input className={field} name="name" defaultValue={contact?.name} autoComplete="name" required minLength={2} maxLength={100} /></label>
      <label className="font-semibold">{text("Company / occasion (optional)", "公司／活动（选填）")}<input className={field} name="organisation" maxLength={150} /></label>
      <label className="font-semibold">{text("Email", "电子邮箱")}<input className={field} name="email" defaultValue={contact?.email} type="email" autoComplete="email" required maxLength={200} /></label>
      <label className="font-semibold">{text("WhatsApp contact number", "WhatsApp 联系号码")}<input className={field} name="phone" defaultValue={contact?.phone} type="tel" autoComplete="tel" placeholder="+65 9123 4567" required minLength={7} maxLength={30} /></label>
      <label className="font-semibold">{text("Preferred date", "希望日期")}<input className={field} name="date" type="date" required /><span className="mt-2 block text-xs font-normal text-forest/60">{text("From tomorrow onwards, subject to availability.", "请选择明日起的日期，实际供应需确认。")}</span></label>
      <label className="font-semibold">{text("Preferred time (Singapore)", "希望时间（新加坡时间）")}<input className={field} name="time" type="time" required /></label>
      <label className="font-semibold">{text("Collection or delivery", "自取或配送")}<select className={field} name="fulfilment" value={delivery ? "delivery" : "collection"} onChange={e => setDelivery(e.target.value === "delivery")}><option value="collection">{text(`Collect at ${storeName}`, `${storeName} 自取`)}</option><option value="delivery">{text("Request delivery · quoted separately", "申请配送 · 另行报价")}</option></select></label>
      <label className="font-semibold">{text("What would you like to do?", "您希望如何安排？")}<select className={field} name="intent"><option value="order">{text("Submit a group order request", "提交团单需求")}</option><option value="quote">{text("Ask for a quotation first", "先询价")}</option></select></label>
      <label className="font-semibold md:col-span-2">{text("Delivery address and postal code", "配送地址及邮编")}{!delivery && <span className="text-sm font-normal"> {text("(optional for collection)", "（自取可不填）")}</span>}<input className={field} name="address" required={delivery} minLength={delivery ? 10 : undefined} maxLength={500} autoComplete="street-address" /></label>
      <label className="font-semibold md:col-span-2">{text("Anything we should know? (optional)", "其他需求（选填）")}<textarea className={field} rows={3} name="notes" maxLength={1500} placeholder={text("Event details, access instructions or questions for our team", "活动安排、配送说明或您想询问的问题")} /></label>
    </div><div aria-hidden="true" className="hidden"><label>Website<input name="website" tabIndex={-1} autoComplete="off" /></label></div>
    <div className="mt-7 rounded-2xl bg-[#edf2e9] p-5"><p className="font-bold">{total} {text("cups · quotation required", "杯 · 价格待报价")}</p><p className="mt-2 text-sm leading-6 text-forest/70">{text("Submitting saves your request for our team. We will contact you to agree pricing and fulfilment. No payment is collected here, and the order is confirmed only after our team confirms it with you. Your details are used to handle this request.", "提交后，需求会保存至后台。我们会联系您确认价格及供应安排。此页面不收款，订单须经双方确认后方可成立。您的资料用于处理本次需求。")}</p><a href={`/${locale}/privacy`} className="mt-2 inline-block text-sm underline">{text("Privacy policy", "隐私政策")}</a></div>
    {error && <p role="alert" className="mt-5 rounded-xl bg-red-50 p-4 text-red-800">{error}</p>}
    <button type="submit" disabled={busy || !menu.length} className="mt-6 min-h-14 w-full rounded-full bg-forest px-7 py-4 text-lg font-bold text-white transition hover:bg-ink disabled:opacity-50">{busy ? text("Saving your request…", "正在保存…") : text("Submit request →", "提交需求 →")}</button>
    </section>
  </form>;
}
