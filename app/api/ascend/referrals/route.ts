import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { createServiceClient } from "@/lib/supabase/admin";
import { ascendProfileOrder } from "@/lib/ascend/profiles";
import { REFERRAL_CODE_PATTERN } from "@/lib/ascend/referrals";

export const dynamic = "force-dynamic";

type RequestBody = { action?: string; profileId?: string; referralCode?: string };

export async function GET(request: Request) {
  const referralCode = new URL(request.url).searchParams.get("code");
  if (!referralCode || !REFERRAL_CODE_PATTERN.test(referralCode)) return NextResponse.json({ error: "Invalid referral code." }, { status: 400 });

  const supabase = createServiceClient();
  const { data: referral, error: referralError } = await supabase
    .from("ascend_referrals")
    .select("completed_tests")
    .eq("referral_code", referralCode)
    .maybeSingle();
  if (referralError) return NextResponse.json({ error: "Unable to load referral progress." }, { status: 500 });
  if (!referral) return NextResponse.json({ error: "Referral not found." }, { status: 404 });

  const completedTests = Number(referral.completed_tests);
  const { data: milestones, error: milestoneError } = await supabase
    .from("ascend_reward_rules")
    .select("reward_name,completed_referrals_required")
    .eq("status", "active")
    .gt("completed_referrals_required", completedTests)
    .order("completed_referrals_required", { ascending: true })
    .limit(1);
  if (milestoneError) return NextResponse.json({ error: "Unable to load referral progress." }, { status: 500 });

  const next = milestones?.[0];
  return NextResponse.json({
    completedTests,
    nextMilestone: next ? {
      remainingCount: Number(next.completed_referrals_required) - completedTests,
      rewardName: next.reward_name
    } : undefined
  });
}

export async function POST(request: Request) {
  let body: RequestBody;
  try { body = await request.json() as RequestBody; }
  catch { return NextResponse.json({ error: "Invalid request." }, { status: 400 }); }

  const supabase = createServiceClient();
  if (body.action === "create") {
    if (!ascendProfileOrder.includes(body.profileId as (typeof ascendProfileOrder)[number])) return NextResponse.json({ error: "Invalid profile." }, { status: 400 });
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const referralCode = randomBytes(8).toString("hex");
      const { error } = await supabase.from("ascend_referrals").insert({ profile_id: body.profileId, referral_code: referralCode });
      if (!error) return NextResponse.json({ referralCode });
      if (error.code !== "23505") return NextResponse.json({ error: "Unable to create referral." }, { status: 500 });
    }
    return NextResponse.json({ error: "Unable to create referral." }, { status: 500 });
  }

  if (!body.referralCode || !REFERRAL_CODE_PATTERN.test(body.referralCode)) return NextResponse.json({ error: "Invalid referral code." }, { status: 400 });
  if (!(["visit", "complete", "share"] as const).includes(body.action as "visit" | "complete" | "share")) return NextResponse.json({ error: "Invalid action." }, { status: 400 });

  const dedupeCookie = `qyj_ascend_${body.action}_${body.referralCode}`;
  if (body.action !== "share" && cookies().has(dedupeCookie)) return NextResponse.json({ recorded: false, deduplicated: true });

  const metric = body.action === "visit" ? "visits" : body.action === "complete" ? "completed_tests" : "shares";
  const { data, error } = await supabase.rpc("increment_ascend_referral", { p_referral_code: body.referralCode, p_metric: metric });
  if (error) return NextResponse.json({ error: "Unable to update referral." }, { status: 500 });
  const result = data?.[0];
  const response = NextResponse.json({ recorded: Boolean(result), completedTests: result?.completed_tests, unlockedReward: result?.unlocked_reward });
  if (result && body.action !== "share") response.cookies.set(dedupeCookie, "1", { httpOnly: true, maxAge: 60 * 60 * 24 * 365, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/" });
  return response;
}
