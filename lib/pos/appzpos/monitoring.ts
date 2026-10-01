export const APPZPOS_REPORT_FLOOR = "2026-09-27";
export type PollState = { last_success_at: string | null; last_successful_to: string | null; last_attempt_at: string | null; last_error: string | null; lease_expires_at: string | null };
const timestamp = (value: string | null) => value ? Date.parse(value) : NaN;
export function syncHealth(enabled: boolean, state: PollState | null, now = Date.now()) {
  if (!enabled) return "Disabled";
  if (state && timestamp(state.lease_expires_at) > now) return "Syncing";
  if (state?.last_error) return "Failed";
  if (state?.lease_expires_at && timestamp(state.lease_expires_at) <= now) return "Interrupted";
  if (!state?.last_success_at || !state.last_successful_to) return "Not yet synced";
  const success = timestamp(state.last_success_at), coverage = timestamp(state.last_successful_to);
  if (![success, coverage].every(Number.isFinite) || success > now + 60000 || coverage > now + 60000) return "Unknown";
  return now - Math.min(success, coverage) > 30 * 60000 ? "Delayed" : "Up to date";
}
export function reportDate(value: string | undefined, fallback: string) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return fallback;
  const date = new Date(value + "T00:00:00Z");
  return Number.isFinite(date.valueOf()) && date.toISOString().slice(0, 10) === value && value >= APPZPOS_REPORT_FLOOR ? value : fallback;
}
export function reportEnd(value: string) {
  const date = new Date(value + "T00:00:00Z");
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10) + "T00:00:00+08:00";
}
export type ReconciliationOrder = {
  provider_store_id: string; order_reference: string; partner_id: string | null;
  order_status: string; referral_match_status: string; order_created_at: string;
  subtotal_minor: number; discount_minor: number; item_discount_minor: number;
  coupon_discount_minor: number; total_payable_minor: number; cup_quantity: number;
};
export type ReconciliationTransaction = {
  pos_transaction_id: string; partner_id: string | null; gross_amount: number;
  discount_amount: number; paid_amount: number; cup_quantity: number;
  partner_commission_ledger: Array<{ partner_id: string; reward_amount: number }>;
};
const minor = (value: number) => Math.round(Number(value) * 100);
export function reconcileOrders(orders: ReconciliationOrder[], transactions: ReconciliationTransaction[]) {
  const byId = new Map(transactions.map(row => [row.pos_transaction_id, row]));
  const days = new Map<string, { orders: number; cups: number; paidMinor: number; commissionMinor: number; unmatched: number; cancelled: number; issues: number }>();
  const issues: Array<{ order: string; reason: string }> = [];
  const dayFormat = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Singapore" });
  for (const order of orders) {
    const day = dayFormat.format(new Date(order.order_created_at));
    if (!days.has(day)) days.set(day, { orders: 0, cups: 0, paidMinor: 0, commissionMinor: 0, unmatched: 0, cancelled: 0, issues: 0 });
    const record = days.get(day)!;
    if (["unknown", "inactive"].includes(order.referral_match_status)) record.unmatched++;
    if (order.order_status === "CANCELLED") record.cancelled++;
    if (!["PAID", "COMPLETED"].includes(order.order_status)) continue;
    record.orders++; record.cups += Number(order.cup_quantity); record.paidMinor += Number(order.total_payable_minor);
    if (!order.partner_id) continue;
    const tx = byId.get(order.provider_store_id + ":" + order.order_reference);
    let reason: string | null = null;
    if (!tx) reason = "Missing paid transaction";
    else {
      const ledger = tx.partner_commission_ledger ?? [];
      record.commissionMinor += ledger.reduce((sum, entry) => sum + minor(entry.reward_amount), 0);
      if (tx.partner_id !== order.partner_id ||
          minor(tx.gross_amount) !== Number(order.subtotal_minor) ||
          minor(tx.discount_amount) !== Number(order.discount_minor) + Number(order.item_discount_minor) + Number(order.coupon_discount_minor) ||
          minor(tx.paid_amount) !== Number(order.total_payable_minor) ||
          Number(tx.cup_quantity) !== Number(order.cup_quantity)) reason = "Transaction differs from imported order";
      else if (ledger.length !== 1 || ledger[0].partner_id !== order.partner_id) reason = "Commission record needs checking";
    }
    if (reason) { record.issues++; issues.push({ order: order.order_reference, reason }); }
  }
  return { days: [...days.entries()].sort((a,b) => b[0].localeCompare(a[0])), issues };
}
