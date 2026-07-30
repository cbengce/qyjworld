import { NextResponse } from "next/server";
import { getAdminAuthorizationForUser } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  let destination = "/en/member";

  if (code) {
    const supabase = createClient();
    const { data } = await supabase.auth.exchangeCodeForSession(code);
    if (data.user) {
      const authorization = await getAdminAuthorizationForUser(data.user.id);
      destination = authorization ? "/en/admin/promotions" : "/en/member";
    }
  }

  return NextResponse.redirect(new URL(destination, requestUrl.origin));
}
