import type { Locale } from "@/lib/constants";
import { requireAdmin } from "@/lib/data";
import { createServiceClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export default async function PartnerTransactionsPage({ params, searchParams }: { params: { locale: Locale }; searchParams: Record<string, string | undefined> }) {
  await requireAdmin(params.locale);
  const service = createServiceClient();
  let query = service.from("pos_transactions").select("*,partners(partner_name)").order("created_at", { ascending: false }).limit(200);
  if (searchParams.partner) query = query.eq("partner_code", searchParams.partner.trim().toUpperCase());
  if (searchParams.order) query = query.ilike("pos_order_id", `%${searchParams.order}%`);
  if (searchParams.transaction) query = query.ilike("pos_transaction_id", `%${searchParams.transaction}%`);
  if (searchParams.reference) query = query.ilike("referral_reference", `%${searchParams.reference}%`);
  if (searchParams.status) query = query.eq("payment_status", searchParams.status);
  if (searchParams.from) query = query.gte("created_at", `${searchParams.from}T00:00:00+08:00`);
  if (searchParams.to) query = query.lte("created_at", `${searchParams.to}T23:59:59+08:00`);
  const { data: rows, error } = await query;
  return <main className="min-h-screen bg-paper px-5 py-12 text-forest md:px-8"><div className="mx-auto max-w-7xl"><h1 className="font-serif text-5xl">Partner Transactions</h1>
    <form className="mt-8 grid gap-3 bg-white p-5 md:grid-cols-4"><input className="border p-3" name="partner" placeholder="Partner code" defaultValue={searchParams.partner}/><input className="border p-3" name="order" placeholder="POS order ID" defaultValue={searchParams.order}/><input className="border p-3" name="transaction" placeholder="POS transaction ID" defaultValue={searchParams.transaction}/><input className="border p-3" name="reference" placeholder="Referral reference" defaultValue={searchParams.reference}/><select className="border p-3" name="status" defaultValue={searchParams.status||""}><option value="">Any status</option><option value="paid">Paid</option></select><input className="border p-3" name="from" type="date" defaultValue={searchParams.from}/><input className="border p-3" name="to" type="date" defaultValue={searchParams.to}/><button className="bg-forest p-3 font-bold text-white">Search</button></form>
    {error ? <p className="mt-6 text-red-700">Unable to load transactions.</p> : <div className="mt-8 overflow-x-auto"><table className="w-full min-w-[1100px] bg-white text-left"><thead><tr><th className="p-4">Paid at</th><th>Partner</th><th>Order</th><th>Transaction</th><th>Referral reference</th><th>Gross</th><th>Discount</th><th>Paid</th><th>Status</th></tr></thead><tbody>{(rows??[]).map(row=><tr className="border-t" key={row.id}><td className="p-4">{new Date(row.paid_at).toLocaleString("en-SG")}</td><td>{row.partner_code}</td><td>{row.pos_order_id||"-"}</td><td>{row.pos_transaction_id}</td><td>{row.referral_reference||"-"}</td><td>S${Number(row.gross_amount).toFixed(2)}</td><td>S${Number(row.discount_amount).toFixed(2)}</td><td>S${Number(row.paid_amount).toFixed(2)}</td><td>{row.payment_status}</td></tr>)}</tbody></table></div>}
  </div></main>;
}
