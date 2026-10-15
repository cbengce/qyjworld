import Link from "next/link";
import { AdminNavigation } from "@/components/admin/admin-navigation";
import { requireAdmin } from "@/lib/data";
import { createServiceClient } from "@/lib/supabase/admin";
import { TRAFFIC_PROVIDER, summariseTraffic, type TrafficEvent } from "@/lib/site-traffic";
export const dynamic = "force-dynamic";
export default async function TrafficPage({ params, searchParams }: { params: { locale: "en" | "zh" }; searchParams: { days?: string } }) {
  const { role } = await requireAdmin(params.locale);
  const zh = params.locale === "zh", text = (en: string, cn: string) => zh ? cn : en;
  if (role !== "super_admin") return <main className="p-8">{text("Access unavailable", "无权访问")}</main>;
  const days = ["7", "28", "90"].includes(searchParams.days || "") ? Number(searchParams.days) : 28;
  const since = new Date(Date.now() - days * 86400000).toISOString();
  const client = createServiceClient();
  const rows: Array<{ received_at: string; payload_json: TrafficEvent }> = [];
  let failed = false, truncated = false;
  for (let offset = 0; offset <= 10000; offset += 1000) {
    const result = await client.from("webhook_events").select("received_at,payload_json").eq("provider", TRAFFIC_PROVIDER).gte("received_at", since).order("received_at", { ascending: false }).order("id").range(offset, offset + 999);
    if (result.error) { failed = true; break; }
    if (offset === 10000) { truncated = Boolean(result.data?.length); break; }
    rows.push(...(result.data ?? []) as typeof rows);
    if ((result.data?.length ?? 0) < 1000) break;
  }
  const first = await client.from("webhook_events").select("received_at").eq("provider", TRAFFIC_PROVIDER).order("received_at").limit(1);
  const stats = failed ? null : summariseTraffic(rows);
  const labels: Record<string, string> = { direct: text("Direct / no referrer", "直接访问／来源未提供"), internal: text("Internal navigation", "站内跳转"), google: "Google", bing: "Bing", chatgpt: "ChatGPT", perplexity: "Perplexity", copilot: "Copilot", gemini: "Gemini", instagram: "Instagram", facebook: "Facebook", tiktok: "TikTok", xiaohongshu: "小红书", other: text("Other", "其他") };
  const table = (title: string, records: Array<[string, number]>) => <section className="min-w-0 rounded-2xl bg-white p-5"><h2 className="font-bold">{title}</h2><div className="mt-4 overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr><th className="py-2">{text("Page / source / day", "页面／来源／日期")}</th><th className="py-2 text-right">{text("Views", "浏览量")}</th></tr></thead><tbody>{records.map(([name,count]) => <tr key={name} className="border-t border-forest/10"><td className="break-all py-3 pr-3">{name}</td><td className="py-3 text-right font-bold tabular-nums">{count}</td></tr>)}</tbody></table>{!records.length && <p className="mt-4 text-sm text-ink/60">{text("No recorded views yet.", "暂未记录到浏览。")}</p>}</div></section>;
  return <main className="min-h-screen bg-paper px-4 py-8 text-forest md:px-8"><div className="mx-auto max-w-7xl"><AdminNavigation locale={params.locale}/><h1 className="mt-8 font-serif text-3xl font-semibold md:text-5xl">{text("Website traffic", "网站访问统计")}</h1><p className="mt-3 text-sm leading-6 text-ink/70">{text("Anonymous recorded page views and link clicks. Independent of GSC Wizard. These are counts of browser events, not unique people or verified customers.", "匿名记录页面浏览和入口点击，不依赖 GSC Wizard。以下是浏览器事件次数，不是独立人数，也不是已核实的顾客人数。")}</p><nav className="mt-5 flex flex-wrap gap-3" aria-label={text("Traffic period", "统计期间")}>{[7,28,90].map(value => <Link key={value} className={`focus-ring rounded-full border border-forest/20 px-5 py-2 text-sm ${days === value ? "bg-forest text-white" : "bg-white"}`} href={`/${params.locale}/admin/traffic?days=${value}`}>{text(`Last ${value} days`, `近 ${value} 天`)}</Link>)}</nav>
    {first.data?.[0]?.received_at ? <p className="mt-4 text-xs text-ink/60">{text("First recorded event: ", "首次记录：")}{new Date(first.data[0].received_at).toLocaleString("en-SG", { timeZone: "Asia/Singapore" })} SGT</p> : null}
    {failed ? <p role="alert" className="mt-5 rounded-xl bg-amber-50 p-4">{text("Traffic records are unavailable. This does not mean there were zero views.", "访问记录暂不可读取；这不表示浏览量为零。")}</p> : null}
    {truncated ? <p role="status" className="mt-4 rounded-xl bg-amber-50 p-4 text-sm">{text("Partial report: latest 10,000 events only. Select a shorter period.", "部分统计：仅最近 10,000 条事件，请选择更短期间。")}</p> : null}
    {stats ? <><div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{[[text("Recorded page views","已记录浏览量"),stats.page_view],[text("AI-source views","AI 来源浏览量"),stats.aiViews],[text("Online-order link clicks","在线点单入口点击"),stats.order_click],[text("Group-order link clicks","团购入口点击"),stats.group_click]].map(([label,count]) => <section key={label} className="rounded-2xl bg-white p-5"><h2 className="text-sm text-ink/65">{label}</h2><p className="mt-3 text-3xl font-bold tabular-nums">{count}</p></section>)}</div><div className="mt-5 grid items-start gap-4 lg:grid-cols-2">{table(text("Popular pages", "热门页面"),stats.pages)}{table(text("Sources of recorded views", "浏览来源"),stats.sources.map(([source,count])=>[labels[source] || source,count]))}</div><div className="mt-5">{table(text("Daily recorded views · Singapore time", "每日浏览量 · 新加坡时间"),stats.days)}</div><p className="mt-4 text-xs text-ink/60">{text("Mobile views", "手机浏览量")}: {stats.mobile}</p></> : null}
    <p className="mt-5 text-xs leading-6 text-ink/65">{text("Recording begins after this feature goes live; past visits cannot be reconstructed. Referrers may be omitted by browsers or apps, so direct/no-referrer does not prove a visitor typed the URL. AI-source traffic indicates a supplied referrer or recognised campaign tag, not proof of AI citation or a sale. Repeated visits and staff visits count. Known bots, privacy opt-outs, account pages and admin pages are excluded; some automated traffic may still appear. Link clicks are not completed orders. Only visible page views observed by this recorder are counted.", "从此功能上线后开始记录，无法还原过去的访问。浏览器或 App 可能不提供来源，因此「直接访问／来源未提供」不等于手动输入网址。AI 来源仅表示来源域名或已识别标签，不证明 AI 引用或成交。重复访问及员工访问会计入。已识别机器人、隐私退出、账号页和后台页不记录，但仍可能有未识别的自动访问。入口点击不代表完成订单，仅统计记录器观测到的可见页面浏览。")}</p>
  </div></main>;
}
