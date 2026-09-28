import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/admin";
import { getAppzposAccessToken, getAppzposOrders, withAppzposRetry } from "./client";
import { pollAppzposOrders } from "./poller";
import { formatAppzposSingaporeDateTime, splitAppzposWindows } from "./time";

const credentialSchema = z.array(z.object({
  storeID: z.string().trim().min(1),
  clientID: z.string().trim().min(1),
  clientSecret: z.string().trim().min(1)
})).min(1);

type Credential = z.infer<typeof credentialSchema>[number];
type CachedToken = { value: string; expiresAt: number };
const tokenCache = new Map<string, CachedToken>();

function configuredCredentials() {
  const raw = process.env.APPZPOS_STORES_JSON;
  if (!raw) throw new Error("APPZPOS_STORES_JSON is not configured.");
  try { return credentialSchema.parse(JSON.parse(raw)); }
  catch { throw new Error("APPZPOS_STORES_JSON is invalid."); }
}

async function tokenFor(credential: Credential) {
  const cached = tokenCache.get(credential.storeID);
  if (cached && cached.expiresAt > Date.now() + 60_000) return cached.value;
  const token = await withAppzposRetry(() => getAppzposAccessToken({
    store_id: credential.storeID,
    client_id: credential.clientID,
    client_secret: credential.clientSecret
  }));
  tokenCache.set(credential.storeID, { value: token.access_token, expiresAt: Date.now() + token.expires_in * 1000 });
  return token.access_token;
}

function safeError(error: unknown) {
  const message = error instanceof Error ? error.message : "APPZPOS polling failed.";
  return message.replace(/Bearer\s+\S+/gi, "Bearer [redacted]").slice(0, 1000);
}

export async function runAppzposPolling(input: { from?: Date; to?: Date } = {}) {
  const service = createServiceClient();
  const credentials = configuredCredentials();
  const results: Array<{ storeID: string; windows: number; processed: number }> = [];

  for (const credential of credentials) {
    const { data: mapping, error: mappingError } = await service.from("pos_provider_store_mappings")
      .select("id,pos_poll_state(last_successful_to)")
      .eq("provider", "appzpos").eq("external_store_id", credential.storeID).eq("enabled", true).maybeSingle();
    if (mappingError || !mapping) throw new Error(`Active APPZPOS store mapping is missing for ${credential.storeID}.`);
    const state = Array.isArray(mapping.pos_poll_state) ? mapping.pos_poll_state[0] : mapping.pos_poll_state;
    const to = input.to ?? new Date();
    const checkpoint = state?.last_successful_to ? new Date(state.last_successful_to) : new Date(to.getTime() - 6 * 60 * 60 * 1000);
    const from = input.from ?? new Date(checkpoint.getTime() - 15 * 60 * 1000);
    let processed = 0;
    const windows = splitAppzposWindows(from, to);

    for (const window of windows) {
      const { data: requestId, error: reserveError } = await service.rpc("reserve_pos_poll_request", {
        p_store_mapping_id: mapping.id, p_requested_from: window.from.toISOString(), p_requested_to: window.to.toISOString(), p_lease_seconds: 300
      });
      if (reserveError || !requestId) throw new Error(reserveError?.message ?? "Unable to reserve APPZPOS poll.");
      try {
        const token = await tokenFor(credential);
        const request = { storeID: credential.storeID, fromDateTime: formatAppzposSingaporeDateTime(window.from), toDateTime: formatAppzposSingaporeDateTime(window.to) };
        const result = await pollAppzposOrders(request, {
          fetchOrders: (range) => withAppzposRetry(() => getAppzposOrders(token, range)),
          upsertOrder: async (order) => {
            const { error } = await service.rpc("upsert_appzpos_order", {
              p_provider_store_id: order.providerStoreId, p_order_reference: order.orderReference,
              p_referral_code: order.referralCode, p_order_status: order.orderStatus,
              p_order_created_at: order.orderCreatedAt, p_order_created_raw: order.orderCreatedRaw,
              p_subtotal_minor: order.subtotalMinor, p_discount_minor: order.discountMinor,
              p_item_discount_minor: order.itemDiscountMinor, p_coupon_discount_minor: order.couponDiscountMinor,
              p_total_payable_minor: order.totalPayableMinor, p_cup_quantity: order.cupQuantity,
              p_payment_info: order.paymentInfo, p_item_list: order.itemList, p_payload_hash: order.payloadHash
            });
            if (error) throw new Error(error.message);
          }
        });
        processed += result.processed;
        await service.rpc("complete_pos_poll_request", { p_request_id: requestId, p_succeeded: true, p_response_status: 200, p_error_message: null });
      } catch (error) {
        await service.rpc("complete_pos_poll_request", { p_request_id: requestId, p_succeeded: false, p_response_status: null, p_error_message: safeError(error) });
        throw error;
      }
    }
    results.push({ storeID: credential.storeID, windows: windows.length, processed });
  }
  return results;
}

