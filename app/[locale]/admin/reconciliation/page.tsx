import type { Locale } from "@/lib/constants";
import { requireAdmin } from "@/lib/data";
import { createServiceClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export default async function ReconciliationPage({ params }: { params: { locale: Locale } }) {
  await requireAdmin(params.locale);
  const service = createServiceClient();
  const since = new Date(Date.now() - 31 * 86400000).toISOString();
  const [{ data: tx }, { data: ledger }, { data: events }] = await Promise.all([
    service
      .from("pos_transactions")
      .select("id,cup_quantity,gross_amount,discount_amount,paid_amount,payment_status,paid_at")
      .eq("payment_status", "paid")
      .gte("paid_at", since),
    service.from("partner_commission_ledger").select("reward_amount,created_at").gte("created_at", since),
    service.from("webhook_events").select("id,processing_status,received_at").gte("received_at", since)
  ]);
  const days = new Map<string, { orders: number; cups: number; gross: number; discounts: number; paid: number; commission: number; errors: number; events: number }>();
  const day = (value: string) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Singapore" }).format(new Date(value));
  const get = (key: string) => {
    if (!days.has(key)) days.set(key, { orders: 0, cups: 0, gross: 0, discounts: 0, paid: 0, commission: 0, errors: 0, events: 0 });
    return days.get(key)!;
  };
  for (const row of tx ?? []) {
    const record = get(day(row.paid_at));
    record.orders++;
    record.cups += Number(row.cup_quantity);
    record.gross += Number(row.gross_amount);
    record.discounts += Number(row.discount_amount);
    record.paid += Number(row.paid_amount);
  }
  for (const row of ledger ?? []) get(day(row.created_at)).commission += Number(row.reward_amount);
  for (const row of events ?? []) {
    const record = get(day(row.received_at));
    record.events++;
    if (row.processing_status === "failed") record.errors++;
  }
  return <main className="min-h-screen bg-paper px-5 py-12 text-forest md:px-8"><div className="mx-auto max-w-6xl"><h1 className="font-serif text-5xl">Daily Reconciliation</h1><p className="mt-3 text-ink/60">QYJ records only. POS comparison remains pending supplier query/report capability.</p><div className="mt-8 overflow-x-auto"><table className="w-full min-w-[1050px] bg-white text-left"><thead><tr><th className="p-4">Day</th><th>Paid orders</th><th>Cups</th><th>Webhook events</th><th>Gross</th><th>Discount</th><th>Paid</th><th>Partner commission</th><th>Errors</th></tr></thead><tbody>{[...days.entries()].sort((a, b) => b[0].localeCompare(a[0])).map(([date, row]) => <tr className={`border-t ${row.errors ? "bg-red-50" : ""}`} key={date}><td className="p-4">{date}</td><td>{row.orders}</td><td>{row.cups}</td><td>{row.events}</td><td>S${row.gross.toFixed(2)}</td><td>S${row.discounts.toFixed(2)}</td><td>S${row.paid.toFixed(2)}</td><td>S${row.commission.toFixed(2)}</td><td>{row.errors}</td></tr>)}</tbody></table></div></div></main>;
}
