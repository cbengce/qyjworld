import { logoutPartner } from "@/app/actions";
import { CopyPartnerLink } from "@/components/partner/copy-partner-link";
import { PartnerReferralQr } from "@/components/partner/partner-referral-qr";
import type { Locale } from "@/lib/constants";
import { getPartnerReferralUrl } from "@/lib/partners/referral-url";
import { appzposTransactionId } from "@/lib/pos/appzpos/identity";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";
type Search = { from?: string; to?: string; store?: string; partner?: string; status?: string };
type Order = { id: string; provider_store_id: string; store_id: string; order_reference: string; referral_code: string | null; partner_id: string | null; order_status: string; order_created_at: string; subtotal_minor: number; discount_minor: number; item_discount_minor: number; coupon_discount_minor: number; total_payable_minor: number; cup_quantity: number; item_list: Array<{ itemName?: string; quantity?: number }>; partners?: { partner_name?: string; partner_code?: string } | null; stores?: { name?: string } | null };
const money = (minor: number) => `S$${(Number(minor) / 100).toFixed(2)}`;
const validDate = (value?: string) => value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : undefined;

export default async function PartnerDashboard({ params, searchParams }: { params: { locale: Locale }; searchParams: Search }) {
  const authClient = createClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) redirect(`/${params.locale}/partner/login`);
  const { data: mappings } = await authClient.from("partner_users").select("partner_id,partners(partner_name,partner_code,status,archived_at)").eq("status", "active").limit(2);
  const mapping = mappings?.length === 1 ? mappings[0] : null;
  if (!mapping) return <main className="min-h-screen bg-paper px-5 py-16"><div className="mx-auto max-w-3xl"><h1 className="font-serif text-5xl text-forest">Partner access unavailable</h1><p className="mt-5 text-ink/65">This account is not linked to one active partner.</p></div></main>;
  const partner = mapping.partners as unknown as { partner_name?: string; partner_code?: string; status?: string; archived_at?: string | null } | null;
  if (!partner || partner.status !== "active" || partner.archived_at) return <main className="min-h-screen bg-paper px-5 py-16"><div className="mx-auto max-w-3xl"><h1 className="font-serif text-5xl text-forest">Partner access unavailable</h1><p className="mt-5 text-ink/65">This partner account is not active.</p></div></main>;

  const client = authClient;
  let query = client.from("pos_provider_orders").select("id,provider_store_id,store_id,order_reference,referral_code,partner_id,order_status,order_created_at,subtotal_minor,discount_minor,item_discount_minor,coupon_discount_minor,total_payable_minor,cup_quantity,item_list,partners(partner_name,partner_code),stores(name)").order("order_created_at", { ascending: false }).limit(1000);
  query = query.eq("partner_id", mapping.partner_id);
  if (searchParams.store) query = query.eq("store_id", searchParams.store);
  if (["PENDING", "PAID", "COMPLETED", "CANCELLED"].includes(searchParams.status ?? "")) query = query.eq("order_status", searchParams.status!);
  const from = validDate(searchParams.from); const to = validDate(searchParams.to);
  if (from) query = query.gte("order_created_at", `${from}T00:00:00+08:00`);
  if (to) query = query.lt("order_created_at", `${to}T00:00:00+08:00`);
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
  const referralUrl = getPartnerReferralUrl(partner?.partner_code ?? "");

  return <main className="min-h-screen bg-paper px-5 py-12 text-forest md:px-8"><div className="mx-auto max-w-7xl">
    <div className="flex flex-wrap items-start justify-between gap-5"><div><p className="text-xs font-bold uppercase tracking-[0.2em] text-gold">Partner Dashboard</p><h1 className="mt-3 font-serif text-5xl">{partner?.partner_name}</h1><p className="mt-2 text-ink/55">Partner Code: {partner?.partner_code}</p></div><form action={logoutPartner}><button className="focus-ring min-h-12 rounded-full border border-forest/25 px-6 text-sm font-bold">Logout</button></form></div>
    <section className="mt-8 bg-white p-5"><p className="mb-2 text-xs font-bold uppercase tracking-wider text-ink/45">Referral URL</p><CopyPartnerLink url={referralUrl} /><PartnerReferralQr partnerCode={partner?.partner_code ?? ""} url={referralUrl} /></section>
    <form className="mt-8 grid gap-4 bg-white p-5 md:grid-cols-5"><label>From<input className="mt-1 w-full border p-2" defaultValue={from} name="from" type="date" /></label><label>To (exclusive)<input className="mt-1 w-full border p-2" defaultValue={to} name="to" type="date" /></label><label>Store<input className="mt-1 w-full border p-2" defaultValue={searchParams.store} name="store" placeholder="Store UUID" /></label><label>Status<select className="mt-1 w-full border p-2" defaultValue={searchParams.status ?? ""} name="status"><option value="">All</option>{["PENDING","PAID","COMPLETED","CANCELLED"].map((status) => <option key={status}>{status}</option>)}</select></label><button className="self-end bg-forest p-2 text-white">Apply filters</button></form>
    <p className="mt-3 text-sm text-ink/55">Use the date filter for Today, This Week, This Month or Lifetime reporting.</p>
    <section className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{[["Order count", completed.length], ["Cups purchased", total("cup_quantity")], ["Gross eligible sales", money(total("subtotal_minor"))], ["Item discount", money(total("item_discount_minor"))], ["Order discount / Customer discounts", money(total("discount_minor"))], ["Coupon discount", money(total("coupon_discount_minor"))], ["Paid sales", money(total("total_payable_minor"))], ["Partner commission earned", `S$${commissionTotal.toFixed(2)}`]].map(([label,value]) => <div className="bg-white p-5" key={label}><div className="text-xs font-bold uppercase tracking-wider text-ink/45">{label}</div><div className="mt-2 text-2xl">{value}</div></div>)}</section>
    <div className="mt-10 overflow-x-auto"><table className="w-full min-w-[1200px] bg-white text-left"><thead><tr><th className="p-4">Order</th><th>Date/time (SGT)</th><th>Partner</th><th>Store</th><th>Status</th><th>Products</th><th>Cups</th><th>Item discount</th><th>Order discount</th><th>Coupon</th><th>Paid</th><th>Commission</th></tr></thead><tbody>{rows.map((row) => <tr className="border-t align-top" key={row.id}><td className="p-4">{row.order_reference}</td><td>{new Date(row.order_created_at).toLocaleString("en-SG", { timeZone: "Asia/Singapore" })}</td><td>{row.partners?.partner_name ?? row.referral_code ?? "-"}</td><td>{row.stores?.name ?? row.provider_store_id}</td><td>{row.order_status}</td><td>{row.item_list.map((item) => `${item.quantity ?? 0}× ${item.itemName ?? "Item"}`).join(", ") || "-"}</td><td>{row.cup_quantity}</td><td>{money(row.item_discount_minor)}</td><td>{money(row.discount_minor)}</td><td>{money(row.coupon_discount_minor)}</td><td>{money(row.total_payable_minor)}</td><td>S${(commission.get(appzposTransactionId(row.provider_store_id, row.order_reference)) ?? 0).toFixed(2)}</td></tr>)}{!rows.length ? <tr><td className="p-6 text-ink/55" colSpan={12}>No transactions match these filters.</td></tr> : null}</tbody></table></div>
  </div></main>;
}

