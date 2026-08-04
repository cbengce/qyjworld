import { NextResponse } from "next/server";
import { REFERRAL_CODE_PATTERN } from "@/lib/ascend/referrals";
import { mapAscendPersonalRank } from "@/lib/ascend/leaderboard";
import { createServiceClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const referralCode = new URL(request.url).searchParams.get("code");
  if (!referralCode || !REFERRAL_CODE_PATTERN.test(referralCode)) {
    return NextResponse.json({ error: "Invalid referral code." }, { status: 400 });
  }

  const { data, error } = await createServiceClient().rpc("get_ascend_personal_rank", {
    p_referral_code: referralCode
  });
  if (error) return NextResponse.json({ error: "Unable to load ASCEND rank." }, { status: 500 });
  if (!data?.[0]) return NextResponse.json({ error: "ASCEND rank not found." }, { status: 404 });
  return NextResponse.json(mapAscendPersonalRank(data[0]), {
    headers: { "Cache-Control": "private, no-store" }
  });
}
