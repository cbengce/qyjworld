import type { Locale } from "@/lib/constants";
import { requireAdmin } from "@/lib/data";
import { createServiceClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function PartnerTransactionsPage({ params, searchParams }: { params: { locale: Locale }; searchParams: Record<string, string | undefined> }) {
  const { role } = await requireAdmin(params.locale);
  if (role === "super_admin") {
    const filters = new URLSearchParams();
    for (const key of ["partner", "store", "order", "status", "from", "to"]) if (searchParams[key]) filters.set(key, searchParams[key]!);
    redirect(`/${params.locale}/admin/partner-dashboard${filters.size ? `?${filters.toString()}` : ""}`);
  }
  const service = createServiceClient();
  let query = service.from("pos_provider_orders").select("*,partners(partner_name,partner_code),stores(name,store_code)").not("partner_id", "is", null).order("order_created_at", { ascending: false }).limit(1000);
  if (searchParams.partner) query = query.eq("partner_id", searchParams.partner);
  if (searchParams.store) query = query.eq("store_id", searchParams.store);
  if (searchParams.order) query = query.ilike("order_reference", `%${searchParams.order}%`);
  if (searchParams.status) query = query.eq("order_status", searchParams.status);
  if (searchParams.from) query = query.gte("order_created_at", `${searchParams.from}T00:00:00+08:00`);
  if (searchParams.to) query = query.lt("order_created_at", `${searchParams.to}T00:00:00+08:00`);
  const { data: rows, error } = await query;
  return <main className="min-h-screen bg-paper px-5 py-12 text-forest md:px-8"><div className="mx-auto max-w-7xl"><h1 className="font-serif text-5xl">Partner Transactions</h1>
    <form className="mt-8 grid gap-3 bg-white p-5 md:grid-cols-4"><input className="border p-3" name="partner" placeholder="Partner UUID" defaultValue={searchParams.partner}/><input className="border p-3" name="store" placeholder="Store UUID" defaultValue={searchParams.store}/><input className="border p-3" name="order" placeholder="POS order ID" defaultValue={searchParams.order}/><select className="border p-3" name="status" defaultValue={searchParams.status||""}><option value="">Any status</option>{["PENDING","PAID","COMPLETED","CANCELLED"].map(status=><option key={status}>{status}</option>)}</select><input className="border p-3" name="from" type="date" defaultValue={searchParams.from}/><input className="border p-3" name="to" type="date" defaultValue={searchParams.to}/><button className="bg-forest p-3 font-bold text-white">Search</button></form>
    {error ? <p className="mt-6 text-red-700">Unable to load transactions.</p> : <div className="mt-8 overflow-x-auto"><table className="w-full min-w-[1250px] bg-white text-left"><thead><tr><th className="p-4">Occurred at</th><th>Partner</th><th>Store</th><th>Order</th><th>Status</th><th>Cups</th><th>Gross</th><th>Item discount</th><th>Order discount</th><th>Coupon</th><th>Paid</th></tr></thead><tbody>{(rows??[]).map(row=><tr className="border-t" key={row.id}><td className="p-4">{new Date(row.order_created_at).toLocaleString("en-SG", { timeZone: "Asia/Singapore" })}</td><td>{row.partners?.partner_name ?? row.referral_code ?? "-"}</td><td>{row.stores?.name ?? row.provider_store_id}</td><td>{row.order_reference}</td><td>{row.order_status}</td><td>{row.cup_quantity}</td><td>S${(Number(row.subtotal_minor)/100).toFixed(2)}</td><td>S${(Number(row.item_discount_minor)/100).toFixed(2)}</td><td>S${(Number(row.discount_minor)/100).toFixed(2)}</td><td>S${(Number(row.coupon_discount_minor)/100).toFixed(2)}</td><td>S${(Number(row.total_payable_minor)/100).toFixed(2)}</td></tr>)}</tbody></table></div>}
  </div></main>;
}
