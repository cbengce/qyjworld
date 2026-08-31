export type PosEventType =
  | "payment_succeeded"
  | "payment_failed"
  | "order_cancelled"
  | "order_voided"
  | "unknown";

export type NormalizedPosEvent = {
  provider: string;
  eventId?: string;
  eventType: PosEventType;
  referralReference?: string;
  partnerCode?: string;
  posOrderId?: string;
  posTransactionId?: string;
  grossAmount?: number;
  discountAmount?: number;
  paidAmount?: number;
  currency?: string;
  cupQuantity?: number;
  paymentMethod?: string;
  occurredAt?: string;
  rawPayload: unknown;
};

export interface PosAdapter {
  provider: string;
  buildOrderingUrl(input: { partnerCode: string; referralReference: string }): Promise<string>;
  verifyWebhook(headers: Headers, rawBody: string): Promise<boolean>;
  parseWebhook(payload: unknown): Promise<NormalizedPosEvent>;
  queryTransactionStatus?(transactionReference: string): Promise<NormalizedPosEvent | null>;
}
