import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function csvEscape(value: unknown) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

export async function GET() {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: staff } = await supabase
    .from("staff_users")
    .select("staff_role_assignments(roles(role_code))")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  const assignment = staff?.staff_role_assignments?.[0] as { roles?: { role_code?: string } } | undefined;
  if (!["super_admin", "manager"].includes(assignment?.roles?.role_code ?? "")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data } = await supabase
    .from("customers")
    .select("customer_no, primary_mobile_normalized, primary_email_normalized, created_at, customer_profiles(full_name)")
    .order("created_at", { ascending: false });

  const header = ["customer_no", "full_name", "mobile", "email", "created_at"];
  const rows = (data ?? []).map((row) => {
    const profile = Array.isArray(row.customer_profiles) ? row.customer_profiles[0] : row.customer_profiles;
    return [
      csvEscape(row.customer_no),
      csvEscape(profile?.full_name),
      csvEscape(row.primary_mobile_normalized),
      csvEscape(row.primary_email_normalized),
      csvEscape(row.created_at)
    ].join(",");
  });
  const csv = [header.join(","), ...rows].join("\n");

  return new NextResponse(csv, {
    headers: {
      "content-type": "text/csv",
      "content-disposition": "attachment; filename=qyj-members.csv"
    }
  });
}
