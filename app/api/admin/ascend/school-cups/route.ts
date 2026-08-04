import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getAdminAuthorizationForUser } from "@/lib/data";
import { createServiceClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function isSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try { return new URL(origin).host === new URL(request.url).host; } catch { return false; }
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !(await getAdminAuthorizationForUser(user.id))) {
    return NextResponse.json({ error: "Admin authentication is required." }, { status: 401 });
  }

  let body: { schoolId?: unknown; cups?: unknown };
  try { body = await request.json() as { schoolId?: unknown; cups?: unknown }; } catch { return NextResponse.json({ error: "Invalid request." }, { status: 400 }); }
  const schoolId = typeof body.schoolId === "string" ? body.schoolId : "";
  const cups = Number(body.cups);
  if (!schoolId) return NextResponse.json({ error: "Select a school." }, { status: 400 });
  if (!Number.isSafeInteger(cups) || cups < 1 || cups > 10000) return NextResponse.json({ error: "Enter a positive cup quantity." }, { status: 400 });

  const result = await createServiceClient().rpc("record_ascend_school_cups", {
    p_actor_auth_user_id: user.id,
    p_school_id: schoolId,
    p_cups: cups
  });
  if (result.error?.code === "42501") return NextResponse.json({ error: "You are not authorized to record cups." }, { status: 403 });
  if (result.error) return NextResponse.json({ error: result.error.message }, { status: 400 });
  revalidatePath("/en/ascend/leaderboard");
  return NextResponse.json({ ok: true });
}
