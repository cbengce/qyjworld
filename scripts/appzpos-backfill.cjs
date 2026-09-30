#!/usr/bin/env node
"use strict";

const EXPECTED_STORE_ID = "8C002BBD-4352-49D8-969E-7B649C1849A6";
const DAY = 86400000;

function dateAtSingaporeMidnight(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || "")) throw new Error("Date must be YYYY-MM-DD.");
  const utc = new Date(`${value}T00:00:00Z`);
  if (!Number.isFinite(utc.getTime()) || utc.toISOString().slice(0, 10) !== value) throw new Error("Invalid calendar date.");
  return new Date(utc.getTime() - 8 * 3600000);
}

function buildWindows(from, to) {
  if (!Number.isFinite(from.getTime()) || !Number.isFinite(to.getTime()) || to <= from) throw new Error("Invalid backfill range.");
  const result = [];
  for (let cursor = from.getTime(); cursor < to.getTime(); cursor += 5 * DAY) {
    result.push({ from: new Date(cursor), to: new Date(Math.min(cursor + 5 * DAY, to.getTime())) });
  }
  if (result.length > 12) throw new Error("Backfill exceeds 12 request windows. Use a shorter range.");
  return result;
}

function validateBatch(orders, window, parseTimestamp) {
  for (const order of orders) {
    if (order.orderDetails.storeID !== EXPECTED_STORE_ID) throw new Error("APPZPOS returned an order for another store. Batch not imported.");
    const created = parseTimestamp(order.orderDetails.createdDateTime);
    // The API may include the endpoint timestamp in two adjacent batches.
    // Existing upsert keys make that boundary order safe to receive twice.
    if (created < window.from || created > window.to) throw new Error("APPZPOS returned an order outside the requested range. Batch not imported.");
  }
}

function required(name) {
  const value = process.env[name];
  if (!value?.trim()) throw new Error(`${name} is required.`);
  return value;
}

function credentialFromEnvironment() {
  let values;
  try { values = JSON.parse(required("APPZPOS_STORES_JSON")); } catch { throw new Error("Invalid APPZPOS_STORES_JSON."); }
  if (!Array.isArray(values) || values.length !== 1 || values[0].storeID !== EXPECTED_STORE_ID) throw new Error("Expected the MacPherson Mall APPZPOS store only.");
  const value = values[0];
  if (![value.clientID, value.clientSecret].every((item) => typeof item === "string" && item.trim())) throw new Error("APPZPOS credentials are missing.");
  return { storeID: value.storeID, clientID: value.clientID.trim(), clientSecret: value.clientSecret.trim() };
}

async function main() {
  const args = process.argv.slice(2);
  if (!args.includes("--commit")) throw new Error("Use --commit to authorise the backfill.");
  const fromIndex = args.indexOf("--from");
  const toIndex = args.indexOf("--to");
  const from = dateAtSingaporeMidnight(fromIndex >= 0 ? args[fromIndex + 1] : "");
  const to = toIndex >= 0 ? dateAtSingaporeMidnight(args[toIndex + 1]) : new Date();
  if (to > new Date()) throw new Error("End time cannot be in the future.");
  const windows = buildWindows(from, to);
  const credential = credentialFromEnvironment();
  const { resolve } = require("node:path");
  const { readFileSync } = require("node:fs");
  const Module = require("node:module");
  const ts = require("typescript");
  Module._extensions[".ts"] = function compile(module, filePath) {
    module._compile(ts.transpileModule(readFileSync(filePath, "utf8"), {
      compilerOptions: { esModuleInterop: true, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }, fileName: filePath
    }).outputText, filePath);
  };
  const { createClient } = require("@supabase/supabase-js");
  const { getAppzposAccessToken, getAppzposOrders } = require(resolve("lib/pos/appzpos/client.ts"));
  const { pollAppzposOrders } = require(resolve("lib/pos/appzpos/poller.ts"));
  const { formatAppzposSingaporeDateTime, parseAppzposSingaporeTimestamp } = require(resolve("lib/pos/appzpos/time.ts"));
  const supabase = createClient(required("SUPABASE_URL"), required("SUPABASE_SERVICE_ROLE_KEY"), { auth: { autoRefreshToken: false, persistSession: false } });
  const rpc = async (name, values) => {
    const { data, error } = await supabase.rpc(name, values);
    if (error) throw new Error(error.message);
    return data;
  };
  const { data: mapping, error: mappingError } = await supabase.from("pos_provider_store_mappings")
    .select("id").eq("provider", "appzpos").eq("external_store_id", EXPECTED_STORE_ID).eq("enabled", true).maybeSingle();
  if (mappingError || !mapping) throw new Error("Active MacPherson Mall store mapping is unavailable.");
  process.stdout.write(`Backfill ${from.toISOString()} to ${to.toISOString()}: ${windows.length} batches, max 5 days each.\n`);
  let processed = 0;
  const references = new Set();
  for (let index = 0; index < windows.length; index += 1) {
    const window = windows[index];
    const request = { storeID: EXPECTED_STORE_ID, fromDateTime: formatAppzposSingaporeDateTime(window.from), toDateTime: formatAppzposSingaporeDateTime(window.to) };
    const requestId = await rpc("reserve_pos_poll_request", { p_store_mapping_id: mapping.id, p_requested_from: window.from.toISOString(), p_requested_to: window.to.toISOString(), p_lease_seconds: 600 });
    let fetchedSuccessfully = false;
    try {
      const token = await getAppzposAccessToken({ store_id: credential.storeID, client_id: credential.clientID, client_secret: credential.clientSecret });
      // One GetOrders request per reservation; stop on failure rather than consuming unreserved retries.
      const orders = await getAppzposOrders(token.access_token, request);
      fetchedSuccessfully = true;
      validateBatch(orders, window, parseAppzposSingaporeTimestamp);
      const result = await pollAppzposOrders(request, {
        fetchOrders: async () => orders,
        upsertOrder: async (order) => rpc("upsert_appzpos_order", {
          p_provider_store_id: order.providerStoreId, p_order_reference: order.orderReference,
          p_referral_code: order.referralCode, p_order_status: order.orderStatus,
          p_order_created_at: order.orderCreatedAt, p_order_created_raw: order.orderCreatedRaw,
          p_subtotal_minor: order.subtotalMinor, p_discount_minor: order.discountMinor,
          p_item_discount_minor: order.itemDiscountMinor, p_coupon_discount_minor: order.couponDiscountMinor,
          p_total_payable_minor: order.totalPayableMinor, p_cup_quantity: order.cupQuantity,
          p_payment_info: order.paymentInfo, p_item_list: order.itemList, p_payload_hash: order.payloadHash
        })
      });
      await rpc("complete_pos_poll_request", { p_request_id: requestId, p_succeeded: true, p_response_status: 200, p_error_message: null });
      processed += result.processed;
      for (const order of orders) references.add(order.orderDetails.orderReference);
      process.stdout.write(`${JSON.stringify({ batch: index + 1, from: request.fromDateTime, to: request.toDateTime, received: orders.length, processed: result.processed })}\n`);
    } catch (error) {
      // Store a generic failure message so credentials/API payloads never enter the audit record.
      try { await rpc("complete_pos_poll_request", { p_request_id: requestId, p_succeeded: false, p_response_status: fetchedSuccessfully ? 200 : null, p_error_message: "Backfill batch failed; see terminal summary." }); } catch {}
      throw new Error(`Batch ${index + 1} failed. Earlier completed batches remain saved. Rerunning this range is idempotent. ${error instanceof Error ? error.message : "Import error."}`);
    }
  }
  process.stdout.write(`${JSON.stringify({ status: "completed", batches: windows.length, uniqueOrdersReceived: references.size, processed, from: from.toISOString(), to: to.toISOString() })}\n`);
}

if (require.main === module) main().catch((error) => {
  let message = error instanceof Error ? error.message : "Backfill failed.";
  for (const name of ["SUPABASE_SERVICE_ROLE_KEY", "APPZPOS_STORES_JSON"]) if (process.env[name]) message = message.split(process.env[name]).join("[redacted]");
  try { for (const value of JSON.parse(process.env.APPZPOS_STORES_JSON || "[]")) for (const secret of [value.clientID, value.clientSecret]) if (secret) message = message.split(secret).join("[redacted]"); } catch {}
  process.stderr.write(`APPZPOS backfill failed: ${message.replace(/Bearer\s+\S+/gi, "Bearer [redacted]").slice(0, 1000)}\n`);
  process.exitCode = 1;
});

module.exports = { dateAtSingaporeMidnight, buildWindows, validateBatch };
