import { NextRequest, NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { createServiceClient } from "@/lib/supabase/admin";
import { trafficSchema, TRAFFIC_PROVIDER } from "@/lib/site-traffic";
import { checkRateLimit } from "@/lib/rate-limit";
export const dynamic = "force-dynamic";
const response = (status: number) => new NextResponse(null, { status, headers: { "Cache-Control": "no-store" } });
export async function POST(request: NextRequest) {
  if (!["https://qyjworld.com", "https://www.qyjworld.com"].includes(request.headers.get("origin") || "")) return response(403);
  if (!request.headers.get("content-type")?.startsWith("application/json")) return response(415);
  if (/bot|crawler|spider|headless|preview/i.test(request.headers.get("user-agent") || "")) return response(204);
  if (request.headers.get("dnt") === "1" || request.headers.get("sec-gpc") === "1") return response(204);
  // IP is used only transiently for the existing in-memory rate limiter, never saved in the event.
  if (!checkRateLimit(`site-traffic:${request.headers.get("x-forwarded-for")?.split(",")[0] || "unknown"}`).ok) return response(429);
  try {
    const body = await request.text(); if (Buffer.byteLength(body) > 1024) return response(413);
    const parsed = trafficSchema.safeParse(JSON.parse(body)); if (!parsed.success) return response(400);
    const event = parsed.data;
    const { error } = await createServiceClient().from("webhook_events").insert({ provider: TRAFFIC_PROVIDER, external_event_id: event.eventId, event_type: `traffic.${event.event}`, payload_hash: createHash("sha256").update(JSON.stringify(event)).digest("hex"), payload_json: event, processing_status: "processed", processed_at: new Date().toISOString() });
    return response(!error || error.code === "23505" ? 204 : 503);
  } catch (error) { return response(error instanceof SyntaxError ? 400 : 503); }
}
