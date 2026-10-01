import Link from "next/link";
import type { Locale } from "@/lib/constants";
import { requireAdmin } from "@/lib/data";
import { createServiceClient } from "@/lib/supabase/admin";
import { AppzposSyncStatus } from "@/components/partner/appzpos-sync-status";
import { APPZPOS_REPORT_FLOOR, reportDate, reportEnd, reconcileOrders, type ReconciliationOrder, type ReconciliationTransaction } from "@/lib/pos/appzpos/monitoring";

export const dynamic = "force-dynamic";
type Order = ReconciliationOrder & { id: string; referral_code: string | null; stores: { name: string } | null };
const money = (minor: number) => `S$${(minor / 100).toFixed(2)}`;
const inputClass = "mt-2 min-h-12 w-full min-w-0 rounded-xl border border-forest/15 bg-paper px-3 text-base";
export default async function ReconciliationPage({ params, searchParams }: { params: { locale: Locale }; searchParams: { from?: string; to?: string } }) {
  const { role } = await requireAdmin(params.locale);
  if (role !== "super_admin") return <main className="p-8">Access unavailable</main>;
  const client = createServiceClient();
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Singapore" }).format(new Date());
  const from = reportDate(searchParams.from, APPZPOS_REPORT_FLOOR);
  const to = reportDate(searchParams.to, today);
  const rangeValid = from <= to;
  const result = rangeValid ? await client.from("pos_provider_orders")
    .select("id,provider_store_id,order_reference,partner_id,referral_code,referral_match_status,order_status,order_created_at,subtotal_minor,discount_minor,item_discount_minor,coupon_discount_minor,total_payable_minor,cup_quantity,stores(name)")
    .eq("provider", "appzpos").gte("order_created_at", from + "T00:00:00+08:00").lt("order_created_at", reportEnd(to))
    .order("order_created_at", { ascending: false }).limit(1001) : { data: [], error: null };
  if (result.error) throw new Error("Unable to load imported POS orders for reconciliation.");
  const truncated = (result.data?.length ?? 0) > 1000;
  const orders = (result.data ?? []).slice(0,1000) as unknown as Order[];
  const ids = orders.filter(row => row.partner_id && ["PAID", "COMPLETED"].includes(row.order_status)).map(row => row.provider_store_id + ":" + row.order_reference);
  // Chunk identities to keep request URLs bounded, and never query unrelated providers.
  const transactions: ReconciliationTransaction[] = [];
  for (let start = 0; start < ids.length; start += 100) {
    const tx = await client.from("pos_transactions")
      .select("pos_transaction_id,partner_id,gross_amount,discount_amount,paid_amount,cup_quantity,partner_commission_ledger(partner_id,reward_amount)")
      .eq("provider", "appzpos").in("pos_transaction_id", ids.slice(start,start+100));
    if (tx.error) throw new Error("Unable to load paid transactions for reconciliation.");
    transactions.push(...(tx.data ?? []) as unknown as ReconciliationTransaction[]);
  }
  const report = reconcileOrders(orders, transactions);
  const unmatched = orders.filter(row => ["unknown","inactive"].includes(row.referral_match_status));
  return <main className="min-h-screen bg-paper px-4 py-8 text-forest md:px-8"><div className="mx-auto max-w-7xl">
    <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-widest text-gold">Super Admin · APPZPOS</p><h1 className="mt-3 font-serif text-3xl md:text-5xl">Sync & Daily Reconciliation</h1></div><Link className="rounded-full border border-forest/20 px-5 py-3 text-sm font-bold" href={`/${params.locale}/admin/partner-dashboard`}>Partner Overview</Link></div>
    <AppzposSyncStatus client={client} />
    <form className="mt-6 rounded-2xl bg-white p-5"><div className="grid gap-4 sm:grid-cols-2"><label className="text-sm font-bold">Start date<input className={inputClass} type="date" name="from" min={APPZPOS_REPORT_FLOOR} defaultValue={from}/></label><label className="text-sm font-bold">End date<input className={inputClass} type="date" name="to" min={APPZPOS_REPORT_FLOOR} defaultValue={to}/></label></div><button className="mt-4 min-h-12 rounded-full bg-forest px-6 text-sm font-bold text-white">Apply dates</button></form>
    {!rangeValid ? <p className="mt-4 text-red-700">End date must be on or after start date.</p> : null}
    <p className="mt-5 text-sm leading-6 text-ink/60">Imported APPZPOS orders, grouped by order date in Singapore time. Paid sales include all paid/completed orders; commission checks apply to orders linked to a partner. Backfilled commission is attributed to the order date. This checks imported records against QYJ transactions, and cannot prove that the supplier returned every order.</p>
    {truncated ? <p className="mt-4 rounded-xl bg-amber-50 p-4 text-sm font-bold">Partial report: latest 1,000 orders only. Narrow the date range before using these totals.</p> : null}
    <div className="mt-5 grid gap-3 lg:hidden">{report.days.map(([date,row]) => <article key={date} className="rounded-2xl bg-white p-5"><h2 className="font-bold">{date}</h2><dl className="mt-3 grid grid-cols-2 gap-3">{[["Paid orders",row.orders],["Cups",row.cups],["Paid sales",money(row.paidMinor)],["Partner commission",money(row.commissionMinor)],["Unmatched codes",row.unmatched],["Cancelled",row.cancelled],["Records to check",row.issues]].map(([label,value])=><div key={label}><dt className="text-xs text-ink/60">{label}</dt><dd className="mt-1 font-bold">{value}</dd></div>)}</dl></article>)}</div>
    <div className="mt-5 hidden overflow-x-auto rounded-2xl bg-white lg:block"><table className="w-full text-left text-sm"><thead><tr>{["Day (SGT)","Paid orders","Cups","Paid sales","Partner commission","Unmatched codes","Cancelled","Records to check"].map(label=><th className="p-3" key={label}>{label}</th>)}</tr></thead><tbody>{report.days.map(([date,row])=><tr className="border-t border-forest/10" key={date}><td className="p-3">{date}</td>{[row.orders,row.cups,money(row.paidMinor),money(row.commissionMinor),row.unmatched,row.cancelled,row.issues].map((value,i)=><td className="p-3" key={i}>{value}</td>)}</tr>)}</tbody></table></div>
    {rangeValid && !orders.length ? <p className="mt-5 rounded-2xl bg-white p-5">No imported orders in this date range.</p> : null}
    <section className="mt-6 rounded-2xl bg-white p-5"><h2 className="font-bold">Unknown or inactive Partner Codes · {unmatched.length}</h2><p className="mt-2 text-sm text-ink/60">These codes need review before partner attribution. Orders without a Partner Code are not listed.</p><div className="mt-3 grid gap-2">{unmatched.map(row=><div key={row.id} className="rounded-xl bg-paper p-3 text-sm"><strong>{row.order_reference}</strong> · {row.referral_code} · {row.referral_match_status} · {row.stores?.name ?? "Store"}</div>)}</div></section>
    <section className="mt-6 rounded-2xl bg-white p-5"><h2 className="font-bold">Transaction & commission checks · {report.issues.length}</h2><p className="mt-2 text-sm text-ink/60">{report.issues.length ? "Review these imported records; this page does not change financial data." : "No differences found in the imported paid partner orders shown."}</p><ul className="mt-3 space-y-2">{report.issues.map((issue,i)=><li className="rounded-xl bg-paper p-3 text-sm" key={i}><strong>{issue.order}</strong> · {issue.reason}</li>)}</ul></section>
  </div></main>;
}
