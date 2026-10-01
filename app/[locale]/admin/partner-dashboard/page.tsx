import { AppzposSyncStatus } from "@/components/partner/appzpos-sync-status";
import { PartnerOrderList, type PartnerOrder } from "@/components/partner/partner-order-list";
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
type Order = PartnerOrder;
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
        <AppzposSyncStatus client={client} />
        <Link className="mt-4 inline-block text-sm font-bold underline underline-offset-4" href={`/${params.locale}/admin/reconciliation`}>Sync & daily reconciliation →</Link>
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
        <PartnerOrderList rows={rows} commission={commission} />
      </div>
    </main>
  );
}
