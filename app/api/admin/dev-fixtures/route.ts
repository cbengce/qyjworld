import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { createServiceClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type FixtureRequest = {
  staffEmail?: string;
  staffPassword?: string;
  managerEmail?: string;
  managerPassword?: string;
};

function stringField(body: Partial<Record<keyof FixtureRequest, FormDataEntryValue | string>>, field: keyof FixtureRequest) {
  const value = body[field];
  return typeof value === "string" ? value : undefined;
}

async function requireLocalSuperAdmin() {
  if (!(process.env.NEXT_PUBLIC_SITE_URL ?? "").startsWith("http://localhost")) {
    return { error: "Development fixtures are available only on localhost." };
  }

  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return { error: "Authentication required." };

  const { data: staff } = await supabase
    .from("staff_users")
    .select("id, staff_role_assignments(roles(role_code))")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  const assignment = staff?.staff_role_assignments?.[0] as { roles?: { role_code?: string } } | undefined;
  if (assignment?.roles?.role_code !== "super_admin") {
    return { error: "Super Admin permission required." };
  }

  return { userId: user.id, supabase };
}

async function upsertAuthUser(email: string, password: string) {
  const service = createServiceClient();
  const created = await service.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { dev_fixture: true }
  });

  if (created.data.user) return created.data.user.id;
  if (!created.error?.message.toLowerCase().includes("already")) {
    throw new Error(created.error?.message ?? "Unable to create fixture Auth user.");
  }

  const { data, error } = await service.auth.admin.listUsers();
  if (error) throw new Error(error.message);
  const existing = data.users.find((user) => user.email?.toLowerCase() === email.toLowerCase());
  if (!existing) throw new Error(`Unable to resolve existing Auth user for ${email}.`);

  const { error: updateError } = await service.auth.admin.updateUserById(existing.id, {
    password,
    email_confirm: true,
    user_metadata: { dev_fixture: true }
  });
  if (updateError) throw new Error(updateError.message);

  return existing.id;
}

async function createFixtures(body: Partial<Record<keyof FixtureRequest, FormDataEntryValue | string>>) {
  const auth = await requireLocalSuperAdmin();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: 403 });

  const staffEmail = stringField(body, "staffEmail")?.trim().toLowerCase();
  const staffPassword = stringField(body, "staffPassword");
  const managerEmail = stringField(body, "managerEmail")?.trim().toLowerCase();
  const managerPassword = stringField(body, "managerPassword");
  if (!staffEmail || !staffPassword || !managerEmail || !managerPassword) {
    return NextResponse.json({ error: "Fixture emails and temporary passwords are required." }, { status: 400 });
  }

  const service = createServiceClient();
  const [{ data: brand, error: brandError }, { data: store, error: storeError }] = await Promise.all([
    service.from("brands").select("id").eq("brand_code", "QYJ").single(),
    service.from("stores").select("id").eq("store_code", "QYJ-MPM-001").single()
  ]);
  if (brandError || !brand) return NextResponse.json({ error: brandError?.message ?? "QYJ brand not found." }, { status: 500 });
  if (storeError || !store) return NextResponse.json({ error: storeError?.message ?? "QYJ store not found." }, { status: 500 });

  try {
    const [staffAuthId, managerAuthId] = await Promise.all([
      upsertAuthUser(staffEmail, staffPassword),
      upsertAuthUser(managerEmail, managerPassword)
    ]);

    const { data: staffUser, error: staffError } = await service
      .from("staff_users")
      .upsert(
        {
          auth_user_id: staffAuthId,
          staff_no: "QYJDEVSTAFF001",
          full_name: "QYJ Development Staff",
          email_raw: staffEmail,
          updated_by: auth.userId
        },
        { onConflict: "auth_user_id" }
      )
      .select("id")
      .single();
    if (staffError || !staffUser) throw new Error(staffError?.message ?? "Unable to upsert staff fixture.");

    const { data: managerUser, error: managerError } = await service
      .from("staff_users")
      .upsert(
        {
          auth_user_id: managerAuthId,
          staff_no: "QYJDEVMANAGER001",
          full_name: "QYJ Development Manager",
          email_raw: managerEmail,
          updated_by: auth.userId
        },
        { onConflict: "auth_user_id" }
      )
      .select("id")
      .single();
    if (managerError || !managerUser) throw new Error(managerError?.message ?? "Unable to upsert manager fixture.");

    const [staffAssignment, managerAssignment] = await Promise.all([
      auth.supabase.rpc("assign_staff_role", {
        target_staff_user_id: staffUser.id,
        target_role_code: "staff",
        scope_type_value: "store",
        company_id_value: null,
        brand_id_value: null,
        store_id_value: store.id,
        idempotency_key_value: `dev-staff-${randomUUID()}`
      }),
      auth.supabase.rpc("assign_staff_role", {
        target_staff_user_id: managerUser.id,
        target_role_code: "manager",
        scope_type_value: "brand",
        company_id_value: null,
        brand_id_value: brand.id,
        store_id_value: null,
        idempotency_key_value: `dev-manager-${randomUUID()}`
      })
    ]);

    if (staffAssignment.error) throw new Error(staffAssignment.error.message);
    if (managerAssignment.error) throw new Error(managerAssignment.error.message);

    return NextResponse.json({
      ok: true,
      staff: { email: staffEmail, staffUserId: staffUser.id, assignmentId: staffAssignment.data },
      manager: { email: managerEmail, staffUserId: managerUser.id, assignmentId: managerAssignment.data }
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to create fixtures." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";
  const body = contentType.includes("application/json")
    ? ((await request.json()) as FixtureRequest)
    : Object.fromEntries((await request.formData()).entries());

  return createFixtures(body);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  return createFixtures({
    staffEmail: url.searchParams.get("staffEmail") ?? undefined,
    staffPassword: url.searchParams.get("staffPassword") ?? undefined,
    managerEmail: url.searchParams.get("managerEmail") ?? undefined,
    managerPassword: url.searchParams.get("managerPassword") ?? undefined
  });
}
