import { logoutPartner } from "@/app/actions";
import { PartnerOrderList, type PartnerOrder } from "@/components/partner/partner-order-list";
import { getActivePartnerForUser } from "@/lib/partners/access";
import { CopyPartnerLink } from "@/components/partner/copy-partner-link";
import { PartnerReferralQr } from "@/components/partner/partner-referral-qr";
import type { Locale } from "@/lib/constants";
import { getPartnerReferralUrl } from "@/lib/partners/referral-url";
import { appzposTransactionId } from "@/lib/pos/appzpos/identity";
import { createClient } from "@/lib/supabase/server";
import { getAdminAuthorizationForUser } from "@/lib/data";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";
type Search = { from?: string; to?: string; store?: string; partner?: string; status?: string };
type Order = PartnerOrder;
const money = (minor: number) => `S$${(Number(minor) / 100).toFixed(2)}`;
const validDate = (value?: string) => value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : undefined;

export default async function PartnerDashboard({ params, searchParams }: { params: { locale: Locale }; searchParams: Search }) {
  const authClient = createClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) redirect(`/${params.locale}/partner/login`);
  const admin = await getAdminAuthorizationForUser(user.id);
  if (admin?.role === "super_admin") redirect(`/${params.locale}/admin/partner-dashboard`);
  const access = await getActivePartnerForUser(authClient, user.id);
  if (!access) return <main className="min-h-screen bg-paper px-5 py-16"><div className="mx-auto max-w-3xl"><h1 className="font-serif text-3xl text-forest">Partner access unavailable</h1><p className="mt-5 text-ink/65">This account is not linked to exactly one active partner. Contact QING YUN JIAN for access.</p></div></main>;
  if (user.app_metadata?.partner_password_change_required) redirect(`/${params.locale}/partner/reset-password`);
  const mapping = { partner_id: access.partnerId };
  const partner = access.partner;

  const client = authClient;
  const { data: storeRows, error: storeError } = await client.from("pos_provider_orders")
    .select("store_id,stores(name)").eq("partner_id", access.partnerId).limit(1000);
  if (storeError) throw new Error("Unable to load partner stores.");
  const stores = new Map<string, string>();
  for (const row of storeRows ?? []) {
    const store = row.stores as unknown as { name?: string } | null;
    if (row.store_id && store?.name) stores.set(row.store_id, store.name);
  }
  let query = client.from("pos_provider_orders").select("id,provider_store_id,store_id,order_reference,referral_code,partner_id,order_status,order_created_at,subtotal_minor,discount_minor,item_discount_minor,coupon_discount_minor,total_payable_minor,cup_quantity,item_list,partners(partner_name,partner_code),stores(name)").order("order_created_at", { ascending: false }).limit(1000);
  query = query.eq("partner_id", mapping.partner_id);
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
    .eq("provider", "appzpos").eq("partner_id", access.partnerId)
    .in("pos_transaction_id", completed.length ? completed.map((row) => appzposTransactionId(row.provider_store_id, row.order_reference)) : ["__none__"]);
  if (transactionsError) throw new Error("Unable to load APPZPOS partner commissions.");
  const commission = new Map<string, number>();
  for (const transaction of transactions ?? []) commission.set(transaction.pos_transaction_id ?? "", (transaction.partner_commission_ledger ?? []).reduce((sum: number, entry: { reward_amount: number }) => sum + Number(entry.reward_amount), 0));
  const total = (key: keyof Pick<Order, "cup_quantity" | "subtotal_minor" | "discount_minor" | "item_discount_minor" | "coupon_discount_minor" | "total_payable_minor">) => completed.reduce((sum, row) => sum + Number(row[key]), 0);
  const commissionTotal = completed.reduce((sum, row) => sum + (commission.get(appzposTransactionId(row.provider_store_id, row.order_reference)) ?? 0), 0);
  const referralUrl = getPartnerReferralUrl(partner?.partner_code ?? "");

  return <main className="min-h-screen bg-paper px-5 py-12 text-forest md:px-8"><div className="mx-auto max-w-7xl">
    <div className="flex flex-wrap items-start justify-between gap-5"><div><p className="text-xs font-bold uppercase tracking-[0.2em] text-gold">Partner Dashboard</p><h1 className="mt-3 font-serif text-3xl md:text-5xl">{partner?.partner_name}</h1><p className="mt-2 text-ink/55">Partner Code: {partner?.partner_code}</p></div><form action={logoutPartner}><input name="locale" type="hidden" value={params.locale} /><button className="focus-ring min-h-12 rounded-full border border-forest/25 px-6 text-sm font-bold">Logout</button></form></div>
    <details className="mt-6 rounded-2xl bg-white p-5"><summary className="cursor-pointer text-sm font-bold">Your referral link & QR</summary><div className="mt-4"><CopyPartnerLink url={referralUrl} /><PartnerReferralQr partnerCode={partner?.partner_code ?? ""} url={referralUrl} /></div></details>
    <form className="mt-8 grid gap-4 rounded-2xl bg-white p-5 sm:grid-cols-2 lg:grid-cols-5"><label>From<input className="mt-1 min-h-12 w-full min-w-0 rounded-xl border p-2 text-base" defaultValue={from} name="from" type="date" /></label><label>End date<input className="mt-1 min-h-12 w-full min-w-0 rounded-xl border p-2 text-base" defaultValue={to} name="to" type="date" /></label><label>Store<select className="mt-1 min-h-12 w-full rounded-xl border p-2" defaultValue={searchParams.store ?? ""} name="store"><option value="">All stores</option>{Array.from(stores).map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label><label>Status<select className="mt-1 min-h-12 w-full min-w-0 rounded-xl border p-2 text-base" defaultValue={searchParams.status ?? ""} name="status"><option value="">All</option>{["PENDING","PAID","COMPLETED","CANCELLED"].map((status) => <option key={status}>{status}</option>)}</select></label><button className="self-end bg-forest p-2 text-white">Apply filters</button></form>
    <p className="mt-3 text-sm text-ink/55">Use the date filter for Today, This Week, This Month or Lifetime reporting.</p>
    <section className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">{[["Order count", completed.length], ["Cups purchased", total("cup_quantity")], ["Gross eligible sales", money(total("subtotal_minor"))], ["Item discount", money(total("item_discount_minor"))], ["Order discount / Customer discounts", money(total("discount_minor"))], ["Coupon discount", money(total("coupon_discount_minor"))], ["Paid sales", money(total("total_payable_minor"))], ["Partner commission earned", `S$${commissionTotal.toFixed(2)}`]].map(([label,value]) => <div className="rounded-2xl bg-white p-4 shadow-soft" key={label}><div className="text-xs font-bold uppercase tracking-wider text-ink/45">{label}</div><div className="mt-2 text-2xl">{value}</div></div>)}</section>
    <div className="mt-8 flex items-baseline justify-between gap-3"><h2 className="font-serif text-2xl font-semibold">Your orders</h2><p className="text-sm text-ink/55">{rows.length} orders</p></div>
    {rows.length === 1000 ? <p className="mt-3 rounded-xl bg-white p-4 text-sm">Showing the latest 1,000 matching orders. Narrow the date range for a complete period.</p> : null}
    <p className="mt-2 text-xs text-ink/55">Singapore time. Paid and completed orders count towards the summary.</p>
    <PartnerOrderList rows={rows} commission={commission} />
  </div></main>;
}
