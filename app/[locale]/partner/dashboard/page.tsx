import { logoutPartner } from "@/app/actions";
import { CopyPartnerLink } from "@/components/partner/copy-partner-link";
import type { Locale } from "@/lib/constants";
import { getPartnerReferralUrl } from "@/lib/partners/referral-url";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

type Transaction = {
  id: string;
  pos_order_id: string | null;
  referral_reference: string | null;
  cup_quantity: number;
  gross_amount: number;
  discount_amount: number;
  paid_amount: number;
  payment_status: string;
  paid_at: string | null;
  updated_at: string;
};

function since<T extends { paid_at: string | null }>(rows: T[], date: Date): T[] {
  return rows.filter((row) => row.paid_at && new Date(row.paid_at) >= date);
}

function rateLabel(value: number) {
  return `${(Number(value) * 100).toFixed(2).replace(/\.00$/, "")}%`;
}

export default async function PartnerDashboard({ params }: { params: { locale: Locale } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/${params.locale}/partner/login`);
  const { data: mappings, error: mappingError } = await supabase
    .from("partner_users")
    .select("partner_id,partners(partner_name,partner_code,status,archived_at,customer_discount_rate,partner_reward_rate)")
    .eq("status", "active")
    .limit(2);

  if (mappingError || mappings?.length !== 1) {
    return <main className="min-h-screen bg-paper px-5 py-16"><div className="mx-auto max-w-3xl"><h1 className="font-serif text-5xl text-forest">Partner access unavailable</h1><p className="mt-5 text-ink/65">Your signed-in account must be linked to exactly one active corporate partner. Please contact QING YUN JIAN support.</p></div></main>;
  }

  const mapping = mappings[0];
  const partner = mapping.partners as unknown as { partner_name: string; partner_code: string; status: string; archived_at: string | null; customer_discount_rate: number; partner_reward_rate: number } | null;
  if (!partner || partner.status !== "active" || partner.archived_at) {
    return <main className="min-h-screen bg-paper px-5 py-16"><div className="mx-auto max-w-3xl"><h1 className="font-serif text-5xl text-forest">Partner access unavailable</h1><p className="mt-5 text-ink/65">This corporate partner account is not active.</p></div></main>;
  }
  const [{ data: transactions, error: transactionError }, { data: ledger, error: ledgerError }] = await Promise.all([
    supabase.from("pos_transactions").select("id,pos_order_id,referral_reference,cup_quantity,gross_amount,discount_amount,paid_amount,payment_status,paid_at,updated_at").eq("partner_id", mapping.partner_id).order("paid_at", { ascending: false }).limit(1000),
    supabase.from("partner_commission_ledger").select("transaction_id,reward_amount,status,created_at").eq("partner_id", mapping.partner_id)
  ]);
  if (transactionError || ledgerError) throw new Error("Unable to load partner dashboard data.");

  const rows = (transactions ?? []) as Transaction[];
  const eligible = rows.filter((row) => row.payment_status === "paid");
  const now = new Date();
  const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
  const weekStart = new Date(todayStart); weekStart.setDate(todayStart.getDate() - ((todayStart.getDay() + 6) % 7));
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const rewards = new Map<string, number>();
  for (const row of ledger ?? []) rewards.set(row.transaction_id, (rewards.get(row.transaction_id) ?? 0) + Number(row.reward_amount));
  const summary = (summaryRows: Transaction[]) => ({
    orders: summaryRows.length,
    cups: summaryRows.reduce((sum, row) => sum + row.cup_quantity, 0),
    gross: summaryRows.reduce((sum, row) => sum + Number(row.gross_amount), 0),
    discounts: summaryRows.reduce((sum, row) => sum + Number(row.discount_amount), 0),
    paid: summaryRows.reduce((sum, row) => sum + Number(row.paid_amount), 0),
    reward: summaryRows.reduce((sum, row) => sum + (rewards.get(row.id) ?? 0), 0)
  });
  const cards = [["Today", summary(since(eligible, todayStart))], ["This Week", summary(since(eligible, weekStart))], ["This Month", summary(since(eligible, monthStart))], ["Lifetime", summary(eligible)]] as const;
  const referralUrl = getPartnerReferralUrl(partner.partner_code);

  return <main className="min-h-screen bg-paper px-5 py-12 text-forest md:px-8"><div className="mx-auto max-w-6xl">
    <div className="flex flex-wrap items-start justify-between gap-5"><div><p className="text-xs font-bold uppercase tracking-[0.2em] text-gold">Partner Dashboard</p><h1 className="mt-3 font-serif text-5xl">{partner.partner_name}</h1><p className="mt-2 text-ink/55">Partner Code: {partner.partner_code}</p></div><form action={logoutPartner}><button className="focus-ring min-h-12 rounded-full border border-forest/25 px-6 text-sm font-bold" type="submit">Logout</button></form></div>
    <section className="mt-10 bg-white p-6 md:p-8"><h2 className="font-serif text-3xl">Partner Profile</h2><dl className="mt-6 grid gap-4 sm:grid-cols-2"><div><dt className="text-xs font-bold uppercase tracking-[0.14em] text-ink/45">Status</dt><dd className="mt-1 capitalize">{partner.status}</dd></div><div><dt className="text-xs font-bold uppercase tracking-[0.14em] text-ink/45">Partner Code</dt><dd className="mt-1">{partner.partner_code}</dd></div><div><dt className="text-xs font-bold uppercase tracking-[0.14em] text-ink/45">Customer Benefit</dt><dd className="mt-1">{rateLabel(partner.customer_discount_rate)}</dd></div><div><dt className="text-xs font-bold uppercase tracking-[0.14em] text-ink/45">Partner Commission</dt><dd className="mt-1">{rateLabel(partner.partner_reward_rate)}</dd></div></dl><div className="mt-6"><p className="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-ink/45">Referral URL</p><CopyPartnerLink url={referralUrl} /></div></section>
    <div className="mt-6 grid gap-4 md:grid-cols-2">{cards.map(([label, value]) => <section className="bg-white p-6" key={label}><h2 className="font-bold uppercase tracking-[0.12em]">{label}</h2><dl className="mt-5 grid gap-2"><div>Order count: {value.orders}</div><div>Cups purchased: {value.cups}</div><div>Gross eligible sales: S${value.gross.toFixed(2)}</div><div>Customer discounts: S${value.discounts.toFixed(2)}</div><div>Paid sales: S${value.paid.toFixed(2)}</div><div>Partner commission earned: S${value.reward.toFixed(2)}</div></dl></section>)}</div>
    <div className="mt-10 overflow-x-auto"><h2 className="mb-4 font-serif text-3xl">Recent Transactions</h2><table className="w-full min-w-[980px] bg-white text-left"><thead><tr><th className="p-4">Date/time</th><th>Order reference</th><th>Referral reference</th><th>Cups</th><th>Gross sales</th><th>Discount</th><th>Amount paid</th><th>Commission</th><th>Status</th></tr></thead><tbody>{rows.slice(0, 25).map((row) => <tr className="border-t" key={row.id}><td className="p-4">{row.paid_at ? new Date(row.paid_at).toLocaleString("en-SG") : "-"}</td><td>{row.pos_order_id || "-"}</td><td>{row.referral_reference || "-"}</td><td>{row.cup_quantity}</td><td>S${Number(row.gross_amount).toFixed(2)}</td><td>S${Number(row.discount_amount).toFixed(2)}</td><td>S${Number(row.paid_amount).toFixed(2)}</td><td>S${(rewards.get(row.id) ?? 0).toFixed(2)}</td><td className="capitalize">{row.payment_status}</td></tr>)}{!rows.length ? <tr><td className="p-6 text-ink/55" colSpan={9}>No transactions yet.</td></tr> : null}</tbody></table></div>
  </div></main>;
}
