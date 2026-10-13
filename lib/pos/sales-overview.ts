import type { SupabaseClient } from "@supabase/supabase-js";

export const SALES_HISTORY_START = "2026-09-27";
export type SalesOrder = { id: string; partner_id: string | null; store_id: string; order_status: string; order_created_at: string; total_payable_minor: number; cup_quantity: number; referral_match_status: string };
export type SalesTotals = { orders: number; cups: number; paidMinor: number };
export type SalesRange = { from: string; to: string; start: string; end: string };
const dayFormat = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Singapore" });
export const singaporeSalesDay = (date: Date) => dayFormat.format(date);
const validDay = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value + "T00:00:00Z")) && new Date(value + "T00:00:00Z").toISOString().slice(0, 10) === value;
export function salesDateRange(search: { from?: string; to?: string }, now = new Date()): SalesRange {
  const today = singaporeSalesDay(now);
  const from = search.from || [today.slice(0, 7) + "-01", SALES_HISTORY_START].sort().at(-1)!;
  const to = search.to || today;
  if (!validDay(from) || !validDay(to)) throw new Error("date");
  if (from < SALES_HISTORY_START || to > today || from > to) throw new Error("range");
  if ((Date.parse(to) - Date.parse(from)) / 86400000 >= 366) throw new Error("length");
  const end = new Date(to + "T00:00:00Z"); end.setUTCDate(end.getUTCDate() + 1);
  return { from, to, start: from + "T00:00:00+08:00", end: end.toISOString().slice(0, 10) + "T00:00:00+08:00" };
}
const empty = (): SalesTotals => ({ orders: 0, cups: 0, paidMinor: 0 });
const add = (total: SalesTotals, row: SalesOrder) => { total.orders++; total.cups += Number(row.cup_quantity); total.paidMinor += Number(row.total_payable_minor); };
export function summariseSales(rows: SalesOrder[], range: SalesRange) {
  const all = empty(), partner = empty(), nonPartner = empty();
  const daily = new Map<string, SalesTotals>();
  for (let date = new Date(range.from + "T00:00:00Z"); date.toISOString().slice(0, 10) <= range.to; date.setUTCDate(date.getUTCDate() + 1)) daily.set(date.toISOString().slice(0, 10), empty());
  let pending = 0, cancelled = 0, unmatchedPaid = 0;
  for (const row of rows) {
    const timestamp = Date.parse(row.order_created_at);
    if (timestamp < Date.parse(range.start) || timestamp >= Date.parse(range.end) || !Number.isFinite(timestamp)) continue;
    if (row.order_status === "PENDING") pending++;
    if (row.order_status === "CANCELLED") cancelled++;
    if (!["PAID", "COMPLETED"].includes(row.order_status)) continue;
    add(all, row); add(row.partner_id ? partner : nonPartner, row);
    add(daily.get(singaporeSalesDay(new Date(row.order_created_at)))!, row);
    if (!row.partner_id && ["unknown", "inactive"].includes(row.referral_match_status)) unmatchedPaid++;
  }
  return { all, partner, nonPartner, daily: [...daily].map(([date, totals]) => ({ date, ...totals })), pending, cancelled, unmatchedPaid };
}

/** Read-only, called only after the page's Super Admin gate. Do not silently cap totals. */
export async function loadSalesOrders(client: SupabaseClient, range: SalesRange, store?: string): Promise<SalesOrder[]> {
  const rows: SalesOrder[] = [];
  for (let offset = 0; offset <= 10000; offset += 1000) {
    let query = client.from("pos_provider_orders").select("id,partner_id,store_id,order_status,order_created_at,total_payable_minor,cup_quantity,referral_match_status")
      .eq("provider", "appzpos").gte("order_created_at", range.start).lt("order_created_at", range.end)
      .order("order_created_at", { ascending: true }).order("id", { ascending: true }).range(offset, offset + 999);
    if (store) query = query.eq("store_id", store);
    const { data, error } = await query;
    if (error) throw new Error("load");
    rows.push(...(data ?? []) as SalesOrder[]);
    if (rows.length > 10000) throw new Error("limit");
    if ((data?.length ?? 0) < 1000) return rows;
  }
  return rows;
}
