import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminNavigation } from "@/components/admin/admin-navigation";
import { requireAdmin } from "@/lib/data";
import { createServiceClient } from "@/lib/supabase/admin";
import { getMenuItems } from "@/lib/menu";
import { getPrimaryStore } from "@/lib/stores";
import { allContent } from "@/lib/content/catalog";
import { GROUP_ORDER_PROVIDER, orderStatuses } from "@/lib/group-orders";
import { discoveryReadiness } from "@/lib/discovery-readiness";
import { BRAND } from "@/lib/constants";

export const dynamic = "force-dynamic";
export default async function DiscoveryAdmin({ params }: { params: { locale: string } }) {
  const { role } = await requireAdmin(params.locale);
  if (role !== "super_admin" && role !== "manager") redirect(`/${params.locale}/admin`);
  const locale = params.locale === "zh" ? "zh" : "en"; const zh = locale === "zh";
  const client = createServiceClient();
  const since = new Date(Date.now() - 30 * 86400000).toISOString();
  const counts = await Promise.all(orderStatuses.map(status => client.from("webhook_events")
    .select("id", { count: "exact", head: true }).eq("provider", GROUP_ORDER_PROVIDER)
    .gte("received_at", since).eq("payload_json->>status", status)));
  const [menu, store] = await Promise.all([getMenuItems(), getPrimaryStore()]);
  const report = discoveryReadiness(allContent, menu);
  const groupError = counts.some(result => result.error);
  const groupCount = groupError ? null : counts.reduce((sum, result) => sum + (result.count || 0), 0);
  return <main className="min-h-screen bg-paper px-5 py-12 text-forest"><div className="mx-auto max-w-6xl">
    <AdminNavigation locale={locale} />
    <h1 className="mt-10 font-serif text-4xl">{zh ? "搜索曝光与内容检查" : "Search visibility & content checks"}</h1>
    <p className="mt-4 max-w-3xl leading-7">{zh ? "网站资料与实际团单来自当前系统。Google 收录、搜索点击与 AI 引用须从对应平台核实；以下技术检查不代表搜索成效。" : "Website facts and group requests come from the current system. Google indexing, search clicks and AI citations require platform data; technical checks are not performance results."}</p>
    <div className="mt-8 grid gap-4 sm:grid-cols-3">{[
      [zh ? "中英文内容" : "Bilingual content", `${report.bilingual}/${allContent.length}`],
      [zh ? "当前目录茶品" : "Current catalogue products", String(menu.length)],
      [zh ? "最近30天团单申请" : "Group requests in last 30 days", groupCount === null ? (zh ? "资料暂不可读取" : "Data unavailable") : String(groupCount)]
    ].map(([label,value]) => <section key={label} className="rounded-2xl bg-white p-6"><h2 className="text-sm font-bold">{label}</h2><p className="mt-3 text-3xl">{value}</p></section>)}</div>
    <section className="mt-8 rounded-2xl bg-white p-6"><h2 className="font-serif text-2xl">{zh ? "团单进展" : "Group request progress"}</h2><p className="mt-3 text-sm">{zh ? "按最近30天收到的申请，显示其当前状态。申请不等于成交；这些数字尚未归因到 SEO、GEO 或任何渠道。" : "Current status of requests received in the last 30 days. Requests are not sales; these counts are not attributed to SEO, GEO or any channel."}</p><ul className="mt-4 flex flex-wrap gap-6">{orderStatuses.map((status,index) => <li key={status}>{zh ? ["待处理", "已报价", "已确认", "已完成", "已取消"][index] : status}: {groupError ? "—" : counts[index].count || 0}</li>)}</ul><Link className="mt-4 inline-block underline" href={`/${locale}/admin/group-orders`}>{zh ? "进入团单管理" : "Manage group requests"}</Link></section>
    <section className="mt-8 rounded-2xl bg-white p-6"><h2 className="font-serif text-2xl">{zh ? "产品资料待补项" : "Product information gaps"}</h2><p className="mt-3 text-sm">{zh ? "请在菜单后台填入经过确认的资料。未记录的价格不猜测；原料、杯型及过敏原问题应由产品记录确认。" : "Enter verified information in Menu CMS. Missing prices are not estimated; ingredient, serving and allergen questions require approved product records."}</p>{!menu.length && <p className="mt-4">{zh ? "当前未读取到公开菜单，请核对菜单后台；这不表示目录已完成检查。" : "No public menu was returned; check Menu CMS before treating the catalogue as reviewed."}</p>}{store && <Link className="mt-4 inline-block underline" href={`/${locale}/admin/menu/outlets/${store.id}`}>{zh ? "核对门店价格与供应状态" : "Review outlet prices & availability"}</Link>}<ul className="mt-4 grid gap-3">{report.products.filter(item => item.missing.length).map(item => <li key={item.id}><Link className="font-bold underline" href={item.productId ? `/${locale}/admin/menu/products/${item.productId}` : `/${locale}/admin/menu`}>{item.name}</Link>: {item.missing.join("、")}</li>)}</ul></section>
    <section className="mt-8 rounded-2xl bg-white p-6"><h2 className="font-serif text-2xl">{zh ? "收录与外部资料" : "Indexing & external records"}</h2><p className="mt-3">{zh ? "Search Console 数据：尚未连接。搜索曝光、点击、排名与 AI 实际引用：尚未核实。" : "Search Console data: not connected. Search impressions, clicks, rankings and actual AI citations: not verified."}</p><p className="mt-3 text-sm">{zh ? "Google 验证标签配置：" : "Google verification tag configured: "}{process.env.GOOGLE_SITE_VERIFICATION ? (zh ? "是（仍须在 Google 完成验证）" : "Yes (verification still required in Google)") : (zh ? "未配置（若使用 DNS 验证，则无需标签）" : "No (a tag is not needed when using DNS verification)")}</p><div className="mt-4 flex flex-wrap gap-5 underline"><a href={`${BRAND.domain}/sitemap.xml`}>{zh ? "查看网站地图" : "View sitemap"}</a><a href={`${BRAND.domain}/robots.txt`}>robots.txt</a><a href={`https://search.google.com/search-console?resource_id=${encodeURIComponent(BRAND.domain + "/")}`}>Google Search Console</a><a href="https://business.google.com/">Google Business Profile</a></div><p className="mt-4 text-sm">{zh ? "商家资料应与后台门店地址、电话、营业时间及最新照片一致。未连接商家账号前，本页不表示资料已更新。" : "Business Profile should match managed store address, phone, hours and current photos. This page does not claim an external profile has been updated."}</p><Link className="mt-3 inline-block underline" href={`/${locale}/admin/stores`}>{zh ? "核对门店后台资料" : "Review managed store data"}</Link><p className="mt-4 text-sm">{store ? (zh ? "当前主门店：" : "Current primary store: ") + store.name : zh ? "主门店资料暂不可读取。" : "Primary store data unavailable."}</p></section>
  </div></main>;
}
