import type { PartnerPerformance } from "@/lib/partners/performance";

const palette = [
  { bar: "#15803d", background: "#f0fdf4", track: "#bbf7d0" },
  { bar: "#7e22ce", background: "#faf5ff", track: "#e9d5ff" },
  { bar: "#c2410c", background: "#fff7ed", track: "#fed7aa" },
  { bar: "#0369a1", background: "#f0f9ff", track: "#bae6fd" },
  { bar: "#be185d", background: "#fdf2f8", track: "#fbcfe8" },
  { bar: "#0f766e", background: "#f0fdfa", track: "#99f6e4" }
];
function partnerColour(partner: PartnerPerformance) {
  const name = `${partner.partner_name} ${partner.partner_code}`.toLowerCase();
  if (name.includes("ibis")) return palette[0];
  if (name.includes("anytime")) return palette[1];
  if (name.includes("tefuda") || name.includes("defuda")) return palette[2];
  // Stable identity keeps the colour when filtering changes the ranking.
  const hash = Array.from(partner.id).reduce((value, character) => (value * 31 + character.charCodeAt(0)) >>> 0, 0);
  return palette[hash % palette.length];
}

export function PartnerPerformanceSummary({ partners, from, to, locale, truncated = false }: { partners: PartnerPerformance[]; from?: string; to?: string; locale: string; truncated?: boolean }) {
  const zh = locale === "zh";
  const orders = partners.reduce((sum, partner) => sum + partner.orders, 0);
  const maxOrders = Math.max(1, ...partners.map(partner => partner.orders));
  const percentage = (count: number) => orders ? (100 * count / orders).toFixed(1) : "0.0";
  const labels = zh ? ["合作伙伴", "订单", "杯数", "销售额", "佣金"] : ["Partner", "Orders", "Cups", "Paid sales", "Commission"];
  const period = from && to ? `${from} – ${to}` : from ? `${zh ? "自" : "From"} ${from}` : to ? `${zh ? "截至" : "Through"} ${to}` : zh ? "所有日期" : "All dates";
  return <section className="min-w-0 rounded-2xl border border-forest/10 bg-[#f5faf7] p-5" aria-labelledby="partner-performance-title">
    <div className="flex flex-wrap items-baseline justify-between gap-2"><h2 id="partner-performance-title" className="font-bold">{zh ? "合作伙伴业绩汇总" : "Partner performance"}</h2><p className="text-xs text-ink/60">{period} · SGT</p></div>
    <p className="mt-2 text-sm leading-6 text-ink/70">{zh ? <>当前筛选范围内共 <strong>{orders}</strong> 单已付款／已完成订单。下方显示各合作伙伴的订单分布。</> : <><strong>{orders}</strong> paid / completed orders across the current filters. See each partner’s share below.</>}</p>
    <p className="mt-1 text-xs leading-5 text-ink/60">{zh ? "跟随日期、门店、合作伙伴、订单号及状态筛选。" : "Follows the date, store, partner, order number and status filters."}</p>
    {truncated ? <p role="status" className="mt-3 rounded-lg bg-amber-50 p-3 text-xs text-amber-900">{zh ? "仅汇总最近 1,000 条匹配记录，请缩小日期范围以查看完整业绩。" : "Totals cover the latest 1,000 matching records only. Narrow the date range for a complete period."}</p> : null}
    {partners.length ? <>
      <ul className="mt-4 space-y-3" aria-label={zh ? "按合作伙伴划分的已付款订单条形图" : "Paid orders by partner bar chart"}>{partners.map(partner => <li key={partner.id} className="rounded-xl border p-3" style={{ backgroundColor: partnerColour(partner).background, borderColor: partnerColour(partner).track }}>
        <div className="flex items-start justify-between gap-3 text-sm"><span className="min-w-0 break-words font-semibold">{partner.partner_name}</span><span className="shrink-0 tabular-nums">{partner.orders} {zh ? "单" : "orders"} · {percentage(partner.orders)}%</span></div>
        <div aria-hidden="true" className="mt-1.5 h-2.5 overflow-hidden rounded-full" style={{ backgroundColor: partnerColour(partner).track }}><div className="h-full rounded-full" style={{ width: `${100 * partner.orders / maxOrders}%`, backgroundColor: partnerColour(partner).bar }} /></div>
      </li>)}</ul>
      <div className="mt-5 overflow-x-auto"><table className="w-full text-left text-xs"><caption className="sr-only">{zh ? "当前筛选范围内各合作伙伴的业绩" : "Partner totals for the current filters"}</caption><thead><tr>{labels.map(label => <th scope="col" key={label} className="whitespace-nowrap border-b border-forest/10 px-2 py-2 first:pl-0">{label}</th>)}</tr></thead><tbody>{partners.map(partner => <tr key={partner.id} className="border-b border-forest/5 last:border-0"><th scope="row" className="py-3 pr-2 text-left font-medium">{partner.partner_name}</th><td className="px-2 py-3 tabular-nums">{partner.orders}</td><td className="px-2 py-3 tabular-nums">{partner.cups}</td><td className="whitespace-nowrap px-2 py-3 tabular-nums">S${(partner.paidMinor / 100).toFixed(2)}</td><td className="whitespace-nowrap px-2 py-3 tabular-nums">S${partner.commission.toFixed(2)}</td></tr>)}</tbody></table></div>
    </> : <p className="mt-4 text-sm text-ink/60">{zh ? "暂无合作伙伴。" : "No partners available."}</p>}
  </section>;
}
