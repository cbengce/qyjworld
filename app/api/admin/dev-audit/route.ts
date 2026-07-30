import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  if (!(process.env.NEXT_PUBLIC_SITE_URL ?? "").startsWith("http://localhost")) {
    return NextResponse.json({ error: "Development audit verification is available only on localhost." }, { status: 403 });
  }

  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  const { data: staff } = await supabase
    .from("staff_users")
    .select("id, staff_role_assignments(roles(role_code))")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  const assignment = staff?.staff_role_assignments?.[0] as { roles?: { role_code?: string } } | undefined;
  if (!staff || assignment?.roles?.role_code !== "super_admin") {
    return NextResponse.json({ error: "Super Admin permission required." }, { status: 403 });
  }

  const [{ data: auditLogs, error: auditError }, { data: roleAssignments, error: roleError }] = await Promise.all([
    supabase
      .from("audit_logs")
      .select("action, entity_type, idempotency_key, created_at")
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("staff_role_assignments")
      .select("scope_type, roles(role_code), staff_users(staff_no, email_normalized)")
      .order("created_at", { ascending: false })
      .limit(20)
  ]);

  if (auditError) return NextResponse.json({ error: auditError.message }, { status: 500 });
  if (roleError) return NextResponse.json({ error: roleError.message }, { status: 500 });

  return NextResponse.json({ ok: true, auditLogs, roleAssignments });
}
