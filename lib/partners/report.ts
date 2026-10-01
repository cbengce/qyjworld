import type { SupabaseClient } from "@supabase/supabase-js";
import { getAdminAuthorizationForUser } from "@/lib/data";
import { getActivePartnerForUser } from "@/lib/partners/access";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/admin";

export const REPORT_FLOOR = "2026-09-27";
export const REPORT_MAX_ORDERS = 10000;
export class PartnerReportError extends Error {
  constructor(message: string, public status: number, public code = "report_error") { super(message); }
}
export type ReportSearch = { from?: string; to?: string; partner?: string; store?: string };
export type ReportOrder = {
  id: string; provider_store_id: string; order_reference: string; partner_id: string;
  order_status: string; order_created_at: string; subtotal_minor: number;
  discount_minor: number; item_discount_minor: number; coupon_discount_minor: number;
  total_payable_minor: number; cup_quantity: number; currency_code: string;
  partners: { partner_name: string; partner_code: string } | null;
  stores: { name: string } | null;
};
export type ReportDetail = ReportOrder & { day: string; commissionMinor: number | null };
export type ReportTotals = { orders: number; cups: number; grossMinor: number; discountMinor: number; paidMinor: number; commissionMinor: number; missingCommission: number };
export type ReportDay = ReportTotals & { day: string; partnerName: string; partnerCode: string };
export type PartnerReport = {
  from: string; to: string; scopeName: string; storeName: string; generatedAt: string;
  daily: ReportDay[]; details: ReportDetail[]; totals: ReportTotals;
};
type Scope = { client: SupabaseClient; partnerId: string | null; name: string; code: string };
const sgDay = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Singapore" });
const emptyTotals = (): ReportTotals => ({ orders: 0, cups: 0, grossMinor: 0, discountMinor: 0, paidMinor: 0, commissionMinor: 0, missingCommission: 0 });

export function partnerReportDates(search: ReportSearch, now = new Date()) {
  const valid = (value?: string): value is string => {
    if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const date = new Date(`${value}T00:00:00Z`);
    return Number.isFinite(date.valueOf()) && date.toISOString().slice(0,10) === value;
  };
  if (!valid(search.from) || !valid(search.to)) throw new PartnerReportError("Choose a valid start date and end date.", 400);
  if (search.from < REPORT_FLOOR || search.to < search.from || search.to > sgDay.format(now)) throw new PartnerReportError("Choose dates from 27 September 2026 through today, with the end date on or after the start date.", 400);
  if (Date.parse(search.to) - Date.parse(search.from) > 365 * 86400000) throw new PartnerReportError("Choose a range of no more than 366 days.", 400);
  const next = new Date(`${search.to}T00:00:00Z`); next.setUTCDate(next.getUTCDate()+1);
  return { from: search.from, to: search.to, start: `${search.from}T00:00:00+08:00`, end: `${next.toISOString().slice(0,10)}T00:00:00+08:00` };
}

async function reportScope(search: ReportSearch): Promise<Scope> {
  const auth = createClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) throw new PartnerReportError("Sign in to download or print your report.", 401, "login_required");
  const admin = await getAdminAuthorizationForUser(user.id);
  if (admin?.role === "super_admin") {
    const client = createServiceClient();
    if (!search.partner) return { client, partnerId: null, name: "All partners", code: "ALL" };
    const { data, error } = await client.from("partners").select("id,partner_name,partner_code").eq("id",search.partner).maybeSingle();
    if (error) throw new PartnerReportError("Unable to load the selected partner.", 502);
    if (!data) throw new PartnerReportError("Partner not found.", 404);
    return { client, partnerId: data.id, name: data.partner_name, code: data.partner_code };
  }
  const access = await getActivePartnerForUser(auth,user.id);
  if (!access) throw new PartnerReportError("This account does not have active Partner access.",403);
  if (user.app_metadata?.partner_password_change_required) throw new PartnerReportError("Set your own password before opening a report.",403,"password_required");
  // A Partner-supplied partner parameter never selects another partner.
  return { client: auth, partnerId: access.partnerId, name: access.partner.partner_name, code: access.partner.partner_code };
}

export function summarisePartnerReport(orders: ReportOrder[], commission: Map<string, number>, range: { from: string; to: string }, scope: { name: string; code: string; partnerId: string | null }) {
  const days = new Map<string, ReportDay>();
  const totals = emptyTotals();
  if (scope.partnerId) {
    for (let day = new Date(`${range.from}T00:00:00Z`); day <= new Date(`${range.to}T00:00:00Z`); day.setUTCDate(day.getUTCDate()+1)) {
      const date = day.toISOString().slice(0,10);
      days.set(`${date}:${scope.partnerId}`, { ...emptyTotals(), day: date, partnerName: scope.name, partnerCode: scope.code });
    }
  }
  const details: ReportDetail[] = [];
  for (const order of orders) {
    if (!["PAID","COMPLETED"].includes(order.order_status)) continue;
    const day = sgDay.format(new Date(order.order_created_at));
    if (day < range.from || day > range.to || (scope.partnerId && order.partner_id !== scope.partnerId)) throw new PartnerReportError("Report records changed or fall outside the selected scope. Refresh and try again.", 409);
    if (order.currency_code !== "SGD") throw new PartnerReportError("This report supports SGD orders only. Select an SGD store.",400);
    const key = `${day}:${order.partner_id}`;
    if (!days.has(key)) days.set(key, { ...emptyTotals(), day, partnerName: order.partners?.partner_name ?? "Partner", partnerCode: order.partners?.partner_code ?? "" });
    const amount = commission.get(`${order.provider_store_id}:${order.order_reference}`) ?? null;
    details.push({ ...order, day, commissionMinor: amount });
    for (const target of [days.get(key)!,totals]) {
      target.orders++; target.cups += Number(order.cup_quantity);
      target.grossMinor += Number(order.subtotal_minor);
      target.discountMinor += Number(order.discount_minor)+Number(order.item_discount_minor)+Number(order.coupon_discount_minor);
      target.paidMinor += Number(order.total_payable_minor);
      if (amount === null) target.missingCommission++; else target.commissionMinor += amount;
    }
  }
  return { daily: [...days.values()].sort((a,b)=>a.day.localeCompare(b.day)||a.partnerName.localeCompare(b.partnerName)), details, totals };
}

export async function getPartnerReport(search: ReportSearch): Promise<PartnerReport> {
  const scope = await reportScope(search);
  const range = partnerReportDates(search);
  const orders: ReportOrder[] = []; const seen = new Set<string>();
  for (let offset = 0; ; offset += 1000) {
    let query = scope.client.from("pos_provider_orders").select("id,provider_store_id,order_reference,partner_id,order_status,order_created_at,subtotal_minor,discount_minor,item_discount_minor,coupon_discount_minor,total_payable_minor,cup_quantity,currency_code,partners(partner_name,partner_code),stores(name)")
      .eq("provider","appzpos").not("partner_id","is",null).in("order_status",["PAID","COMPLETED"])
      .gte("order_created_at",range.start).lt("order_created_at",range.end)
      .order("order_created_at").order("id").range(offset,offset+999);
    if (scope.partnerId) query = query.eq("partner_id",scope.partnerId);
    if (search.store) query = query.eq("store_id",search.store);
    const { data, error } = await query;
    if (error) throw new PartnerReportError("Unable to load report orders. Please try again.",502);
    const page = (data ?? []) as unknown as ReportOrder[];
    for (const row of page) {
      if (seen.has(row.id)) throw new PartnerReportError("Report records changed during loading. Refresh and try again.",409);
      seen.add(row.id); orders.push(row);
    }
    if (orders.length > REPORT_MAX_ORDERS) throw new PartnerReportError("This range contains more than 10,000 paid orders. Choose a shorter date range.",413);
    if (page.length < 1000) break;
  }
  const commission = new Map<string,number>();
  for (let offset=0;offset<orders.length;offset+=100) {
    const batch = orders.slice(offset,offset+100);
    let query = scope.client.from("pos_transactions").select("pos_transaction_id,partner_id,partner_commission_ledger(partner_id,reward_amount)")
      .eq("provider","appzpos").in("pos_transaction_id",batch.map(row=>`${row.provider_store_id}:${row.order_reference}`));
    if (scope.partnerId) query = query.eq("partner_id",scope.partnerId);
    const { data,error } = await query;
    if (error) throw new PartnerReportError("Unable to load report commissions. Please try again.",502);
    for (const tx of data ?? []) {
      const order = batch.find(row=>`${row.provider_store_id}:${row.order_reference}`===tx.pos_transaction_id);
      const ledger = tx.partner_commission_ledger ?? [];
      if (order && tx.partner_id === order.partner_id && ledger.length===1 && ledger[0].partner_id===order.partner_id) commission.set(tx.pos_transaction_id,Math.round(Number(ledger[0].reward_amount)*100));
    }
  }
  return { ...summarisePartnerReport(orders,commission,range,scope), from:range.from,to:range.to,scopeName:scope.name,storeName:search.store ? orders[0]?.stores?.name ?? "Selected store" : "All stores",generatedAt:new Date().toISOString() };
}
