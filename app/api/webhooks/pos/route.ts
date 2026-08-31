import { NextRequest, NextResponse } from "next/server";
import { getPosAdapter, posPayloadHash } from "@/lib/pos/adapter";
import { checkRateLimit } from "@/lib/rate-limit";
import { createServiceClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const source = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!checkRateLimit(`pos-webhook:${source}`).ok) return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  const rawBody = await request.text();
  const adapter = getPosAdapter();
  if (!(await adapter.verifyWebhook(request.headers, rawBody))) {
    return NextResponse.json({ error: "Invalid webhook signature." }, { status: 401 });
  }

  try {
    const payload: unknown = JSON.parse(rawBody);
    const event = await adapter.parseWebhook(payload);
    const payloadHash = posPayloadHash(rawBody);
    const { data, error } = await createServiceClient().rpc("process_partner_pos_event", {
      p_event: { ...event, payloadHash }
    });
    if (error) {
      await createServiceClient().from("webhook_events").insert({
        provider: event.provider,
        external_event_id: event.eventId || null,
        event_type: event.eventType,
        payload_hash: payloadHash,
        payload_json: event.rawPayload,
        processing_status: "failed",
        processing_error: error.message.slice(0, 1000),
        processed_at: new Date().toISOString()
      });
      return NextResponse.json({ error: "Webhook processing failed." }, { status: 500 });
    }
    return NextResponse.json(data, { status: 200 });
  } catch {
    return NextResponse.json({ error: "Invalid webhook payload." }, { status: 400 });
  }
}
