import { createHash, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import type { NormalizedPosEvent, PosAdapter, PosEventType } from "@/lib/pos/types";

const eventTypes = ["payment_succeeded", "payment_failed", "order_cancelled", "order_voided", "unknown"] as const;
const mockPayloadSchema = z.object({
  eventId: z.string().min(1).optional(),
  eventType: z.enum(eventTypes),
  referralReference: z.string().min(1).optional(),
  partnerCode: z.string().min(1).optional(),
  posOrderId: z.string().min(1).optional(),
  posTransactionId: z.string().min(1),
  grossAmount: z.number().nonnegative().optional(),
  discountAmount: z.number().nonnegative().optional(),
  paidAmount: z.number().nonnegative().optional(),
  currency: z.string().length(3).optional(),
  cupQuantity: z.number().int().nonnegative().optional(),
  paymentMethod: z.string().optional(),
  occurredAt: z.string().datetime().optional()
});

function safeEqual(left: string, right: string) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

class MockPosAdapter implements PosAdapter {
  provider = "mock";

  async buildOrderingUrl({ partnerCode, referralReference }: { partnerCode: string; referralReference: string }) {
    const base = process.env.POS_ORDER_BASE_URL;
    if (!base) throw new Error("POS_ORDER_BASE_URL is not configured.");
    const url = new URL(base);
    url.searchParams.set(process.env.POS_PARTNER_PARAM_NAME || "partner", partnerCode);
    url.searchParams.set(process.env.POS_REFERENCE_PARAM_NAME || "reference", referralReference);
    return url.toString();
  }

  async verifyWebhook(headers: Headers) {
    const expected = process.env.POS_WEBHOOK_SECRET;
    const supplied = headers.get("x-qyj-mock-secret");
    return Boolean(expected && supplied && safeEqual(expected, supplied));
  }

  async parseWebhook(payload: unknown): Promise<NormalizedPosEvent> {
    const parsed = mockPayloadSchema.parse(payload);
    return { provider: this.provider, ...parsed, eventType: parsed.eventType as PosEventType, rawPayload: payload };
  }
}

class UnconfiguredPosAdapter implements PosAdapter {
  provider = process.env.POS_PROVIDER || "unconfigured";
  private unavailable(): never {
    throw new Error("The production POS adapter is unavailable pending supplier documentation.");
  }
  async buildOrderingUrl(): Promise<string> { return this.unavailable(); }
  async verifyWebhook(): Promise<boolean> { return false; }
  async parseWebhook(): Promise<NormalizedPosEvent> { return this.unavailable(); }
}

export function getPosAdapter(): PosAdapter {
  const mockAllowed = process.env.NODE_ENV !== "production" || process.env.ALLOW_MOCK_POS === "true";
  return process.env.POS_PROVIDER === "mock" && mockAllowed ? new MockPosAdapter() : new UnconfiguredPosAdapter();
}

export function posPayloadHash(rawBody: string) {
  return createHash("sha256").update(rawBody).digest("hex");
}
