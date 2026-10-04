import { getSafeLoginDestination } from "@/lib/auth/login-destination";
import { getActivePartnerForUser } from "@/lib/partners/access";
import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { getAdminAuthorizationForUser } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const tokenHash = requestUrl.searchParams.get("token_hash");
  const otpType = requestUrl.searchParams.get("type") as EmailOtpType | null;
  const requestedDestination = requestUrl.searchParams.get("next");
  const recoveryDestination = requestedDestination && /^\/(en|zh)\/partner\/reset-password$/.test(requestedDestination)
    ? requestedDestination
    : null;
  let destination = "/en/member";

  if (code || (tokenHash && otpType)) {
    const supabase = createClient();
    const { data } = code
      ? await supabase.auth.exchangeCodeForSession(code)
      : await supabase.auth.verifyOtp({ token_hash: tokenHash!, type: otpType! });
    if (data.user) {
      if (recoveryDestination) {
        destination = recoveryDestination;
      } else {
        const authorization = await getAdminAuthorizationForUser(data.user.id);
        const locale = data.user.user_metadata?.locale === "zh" ? "zh" : "en";
        const partner = await getActivePartnerForUser(supabase, data.user.id);
        destination = getSafeLoginDestination({
          locale,
          isAdmin: Boolean(authorization),
          isPartner: Boolean(partner),
          isGuest: data.user.user_metadata?.account_type === "guest"
        });
      }
    } else if (recoveryDestination) {
      destination = `/${recoveryDestination.split("/")[1]}/partner/login?error=invalid-recovery-link`;
    }
  } else if (recoveryDestination) {
    destination = `/${recoveryDestination.split("/")[1]}/partner/login?error=invalid-recovery-link`;
  }

  return NextResponse.redirect(new URL(destination, requestUrl.origin));
}
