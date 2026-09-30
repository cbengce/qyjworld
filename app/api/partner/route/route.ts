import { createHash, randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { getPosAdapter } from "@/lib/pos/adapter";
import { checkRateLimit } from "@/lib/rate-limit";
import { createServiceClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

function referralReference(partnerCode: string) {
  const date = new Date().toISOString().slice(0, 10).replaceAll("-", "");
  return `QYJREF-${partnerCode}-${date}-${randomBytes(4).toString("hex").toUpperCase()}`;
}

function orderingUnavailable() {
  return new NextResponse("<!doctype html><html lang=\"en\"><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"><title>Partner ordering unavailable</title><body style=\"font-family:system-ui;padding:32px;max-width:600px;margin:auto;color:#193c30\"><h1>Partner online ordering is temporarily unavailable</h1><p>Your partner discount has not been applied. Please ask our store team to verify your partner eligibility before placing an order.</p><p>合作伙伴线上优惠订购暂未开通。请先向门店工作人员出示合作伙伴资格，确认优惠后再下单。</p></body></html>", {
    status: 503,
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" }
  });
}

export async function GET(request: NextRequest) {
  const partnerCode = request.nextUrl.searchParams.get("partner")?.trim().toUpperCase();
  if (!partnerCode) return orderingUnavailable();
  const rateKey = `${request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown"}:${partnerCode}`;
  if (!checkRateLimit(`partner-router:${rateKey}`).ok) return orderingUnavailable();

  const service = createServiceClient();
  const { data: partner } = await service.from("partners").select("id,partner_code,status,archived_at").eq("partner_code", partnerCode).eq("status", "active").is("archived_at", null).maybeSingle();
  if (!partner) return orderingUnavailable();

  const reference = referralReference(partner.partner_code);
  let destination: string;
  try {
    const adapter = getPosAdapter();
    if (process.env.NODE_ENV === "production" && adapter.provider === "mock") return orderingUnavailable();
    destination = await adapter.buildOrderingUrl({ partnerCode: partner.partner_code, referralReference: reference });
  } catch {
    return orderingUnavailable();
  }
  const userAgent = request.headers.get("user-agent")?.slice(0, 500) || null;
  const forwardedIp = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const hashSecret = process.env.PARTNER_IP_HASH_SECRET;
  const ipHash = forwardedIp && hashSecret ? createHash("sha256").update(`${hashSecret}:${forwardedIp}`).digest("hex") : null;
  const { error } = await service.from("partner_referral_sessions").insert({
    partner_id: partner.id,
    partner_code: partner.partner_code,
    referral_reference: reference,
    landing_url: request.nextUrl.toString(),
    user_agent: userAgent,
    ip_hash: ipHash
  });
  if (error) return orderingUnavailable();

  try {
    await service.from("partner_referral_sessions").update({ redirected_at: new Date().toISOString() }).eq("referral_reference", reference);
    return NextResponse.redirect(destination, 307);
  } catch {
    return orderingUnavailable();
  }
}
