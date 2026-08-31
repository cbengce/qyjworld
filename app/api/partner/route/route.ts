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

export async function GET(request: NextRequest) {
  const normalOrderingUrl = process.env.POS_ORDER_BASE_URL || "https://order.qyjworld.com";
  const partnerCode = request.nextUrl.searchParams.get("partner")?.trim().toUpperCase();
  if (!partnerCode) return NextResponse.redirect(normalOrderingUrl, 307);
  const rateKey = `${request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown"}:${partnerCode}`;
  if (!checkRateLimit(`partner-router:${rateKey}`).ok) return NextResponse.redirect(normalOrderingUrl, 307);

  const service = createServiceClient();
  const { data: partner } = await service.from("partners").select("id,partner_code,status,archived_at").eq("partner_code", partnerCode).eq("status", "active").is("archived_at", null).maybeSingle();
  if (!partner) return NextResponse.redirect(normalOrderingUrl, 307);

  const reference = referralReference(partner.partner_code);
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
  if (error) return NextResponse.redirect(normalOrderingUrl, 307);

  try {
    const destination = await getPosAdapter().buildOrderingUrl({ partnerCode: partner.partner_code, referralReference: reference });
    await service.from("partner_referral_sessions").update({ redirected_at: new Date().toISOString() }).eq("referral_reference", reference);
    return NextResponse.redirect(destination, 307);
  } catch {
    return NextResponse.redirect(normalOrderingUrl, 307);
  }
}
