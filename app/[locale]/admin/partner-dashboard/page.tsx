import { CopyPartnerLink } from "@/components/partner/copy-partner-link";
import { PartnerReferralQr } from "@/components/partner/partner-referral-qr";
import type { Locale } from "@/lib/constants";
import { getPartnerReferralUrl } from "@/lib/partners/referral-url";
import { appzposTransactionId } from "@/lib/pos/appzpos/identity";
import { requireAdmin } from "@/lib/data";
import { createServiceClient } from "@/lib/supabase/admin";
import Link from "next/link";

export const dynamic = "force-dynamic";
type Search = { from?: string; to?: string; store?: string; partner?: string; status?: string; order?: string };
type Order = { id: string; provider_store_id: string; store_id: string; order_reference: string; referral_code: string | null; partner_id: string | null; order_status: string; order_created_at: string; subtotal_minor: number; discount_minor: number; item_discount_minor: number; coupon_discount_minor: number; total_payable_minor: number; cup_quantity: number; item_list: Array<{ itemName?: string; quantity?: number }>; partners?: { partner_name?: string; partner_code?: string } | null; stores?: { name?: string } | null };
const money = (minor: number) => `S$${(Number(minor) / 100).toFixed(2)}`;
const validDate = (value?: string) => value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : undefined;

export default async function PartnerDashboard({ params, searchParams }: { params: { locale: Locale }; searchParams: Search }) {
  const { role } = await requireAdmin(params.locale);
  if (role !== "super_admin") return <main className="min-h-screen bg-paper px-5 py-16"><div className="mx-auto max-w-3xl"><h1 className="font-serif text-5xl text-forest">Access unavailable</h1></div></main>;
  const client = createServiceClient();
  const { data: partners, error: partnersError } = await client.from("partners")
    .select("id,partner_name,partner_code,status,archived_at")
    .order("partner_name");
  if (partnersError) throw new Error("Unable to load partners.");
  const { data: stores, error: storesError } = await client.from("stores").select("id,name,store_code").order("name");
  if (storesError) throw new Error("Unable to load stores.");
  const selected = searchParams.partner ? partners?.find((item) => item.id === searchParams.partner) : null;
  if (searchParams.partner && !selected) return <main className="min-h-screen bg-paper px-5 py-16"><div className="mx-auto max-w-3xl"><h1 className="font-serif text-5xl text-forest">Partner not found</h1></div></main>;
  const partner = selected ?? null;

  let query = client.from("pos_provider_orders").select("id,provider_store_id,store_id,order_reference,referral_code,partner_id,order_status,order_created_at,subtotal_minor,discount_minor,item_discount_minor,coupon_discount_minor,total_payable_minor,cup_quantity,item_list,partners(partner_name,partner_code),stores(name)").not("partner_id", "is", null).order("order_created_at", { ascending: false }).limit(1000);
  if (selected) query = query.eq("partner_id", selected.id);
  if (searchParams.order?.trim()) query = query.ilike("order_reference", `%${searchParams.order.trim()}%`);
  if (searchParams.store) query = query.eq("store_id", searchParams.store);
  if (["PENDING", "PAID", "COMPLETED", "CANCELLED"].includes(searchParams.status ?? "")) query = query.eq("order_status", searchParams.status!);
  const from = validDate(searchParams.from); const to = validDate(searchParams.to);
  if (from) query = query.gte("order_created_at", `${from}T00:00:00+08:00`);
  if (to) {
    const nextDay = new Date(`${to}T00:00:00Z`);
    nextDay.setUTCDate(nextDay.getUTCDate() + 1);
    query = query.lt("order_created_at", `${nextDay.toISOString().slice(0, 10)}T00:00:00+08:00`);
  }
  const { data, error } = await query;
  if (error) throw new Error("Unable to load APPZPOS partner transactions.");
  const rows = (data ?? []) as unknown as Order[];
  const completed = rows.filter((row) => row.order_status === "PAID" || row.order_status === "COMPLETED");

  const { data: transactions, error: transactionsError } = await client.from("pos_transactions")
    .select("pos_transaction_id,partner_commission_ledger(reward_amount)")
    .eq("provider", "appzpos")
    .in("pos_transaction_id", completed.length ? completed.map((row) => appzposTransactionId(row.provider_store_id, row.order_reference)) : ["__none__"]);
  if (transactionsError) throw new Error("Unable to load APPZPOS partner commissions.");
  const commission = new Map<string, number>();
  for (const transaction of transactions ?? []) commission.set(transaction.pos_transaction_id ?? "", (transaction.partner_commission_ledger ?? []).reduce((sum: number, entry: { reward_amount: number }) => sum + Number(entry.reward_amount), 0));
  const total = (key: keyof Pick<Order, "cup_quantity" | "subtotal_minor" | "discount_minor" | "item_discount_minor" | "coupon_discount_minor" | "total_payable_minor">) => completed.reduce((sum, row) => sum + Number(row[key]), 0);
  const commissionTotal = completed.reduce((sum, row) => sum + (commission.get(appzposTransactionId(row.provider_store_id, row.order_reference)) ?? 0), 0);
  const referralUrl = partner ? getPartnerReferralUrl(partner.partner_code) : null;

  const inputClass = "focus-ring mt-2 min-h-12 w-full rounded-xl border border-forest/15 bg-paper/40 px-3 py-2 text-base font-normal text-forest";
  const commissionFor = (row: Order) => `S$${(commission.get(appzposTransactionId(row.provider_store_id, row.order_reference)) ?? 0).toFixed(2)}`;
  const summary = [
    ["Paid orders", completed.length], ["Cups purchased", total("cup_quantity")],
    ["Paid sales", money(total("total_payable_minor"))], ["Partner commission", `S$${commissionTotal.toFixed(2)}`]
  ] as const;
  return (
    <main className="min-h-screen bg-paper px-4 py-8 text-forest md:px-8 md:py-12">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-gold">Super Admin · Partner Overview</p>
            <h1 className="mt-3 font-serif text-3xl font-semibold md:text-5xl">{partner?.partner_name ?? "All Partners"}</h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-ink/60">{partner ? `Partner Code: ${partner.partner_code}` : "Sales and commissions across your partners. Only orders linked to a partner appear here."}</p>
          </div>
          <Link className="focus-ring rounded-full border border-forest/20 px-5 py-3 text-sm font-bold" href={`/${params.locale}/admin`}>Admin Portal</Link>
        </div>
        <section className="mt-7 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {summary.map(([label, value]) => <div className="rounded-2xl border border-forest/5 bg-white p-4 shadow-soft md:p-6" key={label}><p className="text-xs font-semibold text-ink/55">{label}</p><p className="mt-3 text-2xl font-semibold md:text-3xl">{value}</p></div>)}
        </section>
        <form className="mt-7 rounded-2xl border border-forest/5 bg-white p-5 shadow-soft">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <label className="text-sm font-bold">Partner<select className={inputClass} defaultValue={selected?.id ?? ""} name="partner"><option value="">All partners</option>{(partners ?? []).map((item) => <option key={item.id} value={item.id}>{item.partner_name} ({item.partner_code}){item.archived_at ? " · Archived" : item.status !== "active" ? " · Inactive" : ""}</option>)}</select></label>
            <label className="text-sm font-bold">Store<select className={inputClass} defaultValue={searchParams.store ?? ""} name="store"><option value="">All stores</option>{(stores ?? []).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
            <label className="text-sm font-bold">Order number<input className={inputClass} defaultValue={searchParams.order} name="order" placeholder="e.g. OR827" /></label>
            <label className="text-sm font-bold">Start date<input className={inputClass} defaultValue={from} name="from" type="date" /></label>
            <label className="text-sm font-bold">End date<input className={inputClass} defaultValue={to} name="to" type="date" /></label>
            <label className="text-sm font-bold">Order status<select className={inputClass} defaultValue={searchParams.status ?? ""} name="status"><option value="">All statuses</option>{["PENDING","PAID","COMPLETED","CANCELLED"].map((status) => <option key={status}>{status}</option>)}</select></label>
          </div>
          <div className="mt-5 flex items-center gap-4"><button className="focus-ring min-h-12 rounded-full bg-forest px-7 text-sm font-bold text-white">Apply filters</button><Link className="text-sm font-semibold underline underline-offset-4" href={`/${params.locale}/admin/partner-dashboard`}>Reset</Link></div>
        </form>
        {partner && referralUrl ? <details className="mt-5 rounded-2xl border border-forest/10 bg-white p-5"><summary className="cursor-pointer text-sm font-bold">Partner referral link & QR</summary><div className="mt-4"><CopyPartnerLink url={referralUrl} /><PartnerReferralQr partnerCode={partner.partner_code} url={referralUrl} /></div></details> : null}
        <div className="mt-8 flex items-baseline justify-between gap-3"><h2 className="font-serif text-2xl font-semibold">Partner orders</h2><p className="text-sm text-ink/55">{rows.length} orders</p></div>
        {rows.length === 1000 ? <p className="mt-3 rounded-xl bg-white p-4 text-sm text-ink/65">Showing the latest 1,000 matching orders. Narrow the date range to see a complete period.</p> : null}
        <p className="mt-2 text-xs text-ink/55">Times shown in Singapore time. Summary includes paid and completed orders.</p>
        <div className="mt-4 grid gap-3 xl:hidden">{rows.map((row) => (
          <article className="rounded-2xl border border-forest/10 bg-white p-5 shadow-soft" key={row.id}>
            <div className="flex items-start justify-between gap-3"><div><p className="text-lg font-bold">{row.order_reference}</p><p className="mt-1 text-sm text-ink/60">{row.partners?.partner_name ?? row.referral_code}</p></div><span className="rounded-full bg-paper px-3 py-1 text-xs font-bold">{row.order_status}</span></div>
            <p className="mt-3 text-xs leading-5 text-ink/55">{new Date(row.order_created_at).toLocaleString("en-SG", { timeZone: "Asia/Singapore" })} · {row.stores?.name ?? row.provider_store_id}</p>
            <p className="mt-3 border-t border-forest/10 pt-3 text-sm leading-6">{(row.item_list ?? []).map((item) => `${item.quantity ?? 0}× ${item.itemName ?? "Item"}`).join(", ") || "No product details"}</p>
            <dl className="mt-4 grid grid-cols-3 gap-3"><div><dt className="text-xs text-ink/55">Cups</dt><dd className="mt-1 font-bold">{row.cup_quantity}</dd></div><div><dt className="text-xs text-ink/55">Paid</dt><dd className="mt-1 font-bold">{money(row.total_payable_minor)}</dd></div><div><dt className="text-xs text-ink/55">Commission</dt><dd className="mt-1 font-bold">{commissionFor(row)}</dd></div></dl>
            <details className="mt-4 text-sm"><summary className="cursor-pointer text-ink/55">Sales & discounts</summary><dl className="mt-3 grid grid-cols-2 gap-2"><dt>Gross sales</dt><dd>{money(row.subtotal_minor)}</dd><dt>Item discount</dt><dd>{money(row.item_discount_minor)}</dd><dt>Order discount</dt><dd>{money(row.discount_minor)}</dd><dt>Coupon discount</dt><dd>{money(row.coupon_discount_minor)}</dd></dl></details>
          </article>
        ))}</div>
        <div className="mt-4 hidden overflow-x-auto rounded-2xl border border-forest/10 bg-white xl:block">
          <table className="w-full min-w-[1200px] text-left text-sm"><thead className="bg-forest/5 text-xs text-ink/60"><tr>{["Order", "Date / time (SGT)", "Partner", "Store", "Status", "Cups", "Gross", "Item discount", "Order discount", "Coupon", "Paid", "Commission"].map((label) => <th className="px-3 py-4" key={label}>{label}</th>)}</tr></thead><tbody>{rows.map((row) => <tr className="border-t border-forest/10" key={row.id}><td className="px-3 py-4 font-bold">{row.order_reference}</td><td className="px-3 py-4">{new Date(row.order_created_at).toLocaleString("en-SG", { timeZone: "Asia/Singapore" })}</td><td className="px-3 py-4">{row.partners?.partner_name ?? row.referral_code}</td><td className="px-3 py-4">{row.stores?.name ?? row.provider_store_id}</td><td className="px-3 py-4">{row.order_status}</td><td className="px-3 py-4">{row.cup_quantity}</td><td className="px-3 py-4">{money(row.subtotal_minor)}</td><td className="px-3 py-4">{money(row.item_discount_minor)}</td><td className="px-3 py-4">{money(row.discount_minor)}</td><td className="px-3 py-4">{money(row.coupon_discount_minor)}</td><td className="px-3 py-4">{money(row.total_payable_minor)}</td><td className="px-3 py-4 font-bold">{commissionFor(row)}</td></tr>)}</tbody></table>
        </div>
        {!rows.length ? <div className="mt-4 rounded-2xl bg-white p-8 text-center text-ink/55">No partner orders match these filters.</div> : null}
      </div>
    </main>
  );
}
