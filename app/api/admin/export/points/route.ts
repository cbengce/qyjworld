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
    .from("points_transactions")
    .select("id, points_account_id, transaction_type, points_delta, description, reference_no, staff_user_id, balance_after, created_at")
    .order("created_at", { ascending: false });

  const header = [
    "id",
    "points_account_id",
    "transaction_type",
    "points_delta",
    "description",
    "reference_no",
    "staff_user_id",
    "balance_after",
    "created_at"
  ];
  const rows = (data ?? []).map((row) => header.map((key) => csvEscape(row[key as keyof typeof row])).join(","));
  const csv = [header.join(","), ...rows].join("\n");

  return new NextResponse(csv, {
    headers: {
      "content-type": "text/csv",
      "content-disposition": "attachment; filename=qyj-points-transactions.csv"
    }
  });
}
