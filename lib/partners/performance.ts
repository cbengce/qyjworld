import { appzposTransactionId } from "../pos/appzpos/identity";

type PerformanceOrder = { partner_id: string | null; provider_store_id: string; order_reference: string; order_status: string; cup_quantity: number; total_payable_minor: number; partners?: { partner_name?: string; partner_code?: string } | null };
export type PerformancePartner = { id: string; partner_name: string; partner_code: string };
export type PartnerPerformance = PerformancePartner & { orders: number; cups: number; paidMinor: number; commission: number };

/** Uses the dashboard's already-filtered rows and its existing commission ledger. */
export function summarisePartnerPerformance(rows: PerformanceOrder[], partners: PerformancePartner[], commission: Map<string, number>): PartnerPerformance[] {
  const totals = new Map<string, PartnerPerformance>(partners.map(partner => [partner.id, { ...partner, orders: 0, cups: 0, paidMinor: 0, commission: 0 }]));
  for (const row of rows) {
    if (!row.partner_id || !["PAID", "COMPLETED"].includes(row.order_status)) continue;
    const total = totals.get(row.partner_id) ?? { id: row.partner_id, partner_name: row.partners?.partner_name || row.partners?.partner_code || "Unknown partner", partner_code: row.partners?.partner_code || "", orders: 0, cups: 0, paidMinor: 0, commission: 0 };
    total.orders += 1;
    total.cups += Number(row.cup_quantity ?? 0);
    total.paidMinor += Number(row.total_payable_minor ?? 0);
    total.commission += commission.get(appzposTransactionId(row.provider_store_id, row.order_reference)) ?? 0;
    totals.set(row.partner_id, total);
  }
  return [...totals.values()].sort((a, b) => b.orders - a.orders || a.partner_name.localeCompare(b.partner_name) || a.id.localeCompare(b.id));
}
