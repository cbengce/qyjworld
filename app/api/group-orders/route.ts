import { NextRequest, NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { getMenuItems } from "@/lib/menu";
import { getPrimaryStore } from "@/lib/stores";
import { createServiceClient } from "@/lib/supabase/admin";
import { GROUP_ORDER_PROVIDER, prepareGroupOrder } from "@/lib/group-orders";
import { checkRateLimit } from "@/lib/rate-limit";
export const dynamic = "force-dynamic";
export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (!origin || ![request.nextUrl.origin, "https://qyjworld.com", "https://www.qyjworld.com"].includes(origin)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  if (!checkRateLimit(`group-order:${request.headers.get("x-forwarded-for")?.split(",")[0] || "unknown"}`).ok) return NextResponse.json({ error: "Please wait a minute before trying again." }, { status: 429 });
  try {
    const body = await request.text();
    if (Buffer.byteLength(body) > 16000) return NextResponse.json({ error: "The request is too large." }, { status: 413 });
    const input = JSON.parse(body);
    const [menu, store] = await Promise.all([getMenuItems(), getPrimaryStore()]);
    if (!store) throw new Error("Ordering is temporarily unavailable. Please try again later.");
    let record;
    try { record = prepareGroupOrder(input, menu, store); } catch (error) {
      return NextResponse.json({ error: error instanceof Error && error.name !== "ZodError" ? error.message : "Please check your contact details, date and drink quantities." }, { status: 400 });
    }
    const hash = createHash("sha256").update(JSON.stringify(input)).digest("hex");
    const service = createServiceClient();
    const { error } = await service.from("webhook_events").insert({ provider: GROUP_ORDER_PROVIDER, external_event_id: record.requestId, event_type: "group_order.requested", payload_hash: hash, payload_json: record, processing_status: "processed", processed_at: new Date().toISOString() });
    if (error?.code === "23505") {
      const { data: existing, error: readError } = await service.from("webhook_events").select("payload_hash,payload_json").eq("provider", GROUP_ORDER_PROVIDER).eq("external_event_id", record.requestId).maybeSingle();
      if (readError || !existing || existing.payload_hash !== hash) return NextResponse.json({ error: "This request has changed. Refresh the page to submit a new request." }, { status: 409 });
      record = existing.payload_json;
    } else if (error) throw error;
    return NextResponse.json({ reference: record.reference, totalCups: record.totalCups, status: record.status }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof SyntaxError) return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    console.error("[GROUP_ORDER_SAVE_FAILED]", error instanceof Error ? error.message : "Database operation failed");
    return NextResponse.json({ error: "We could not save your request. Your order has not been submitted. Please try again." }, { status: 503 });
  }
}
