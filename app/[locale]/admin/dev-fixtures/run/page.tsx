import { randomUUID } from "crypto";
import { Locale } from "@/lib/constants";
import { requireAdmin } from "@/lib/data";
import { createServiceClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { Section } from "@/components/ui";

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
  const existing = data.users.find((user) => user.email?.toLowerCase() === email);
  if (!existing) throw new Error(`Unable to resolve existing Auth user for ${email}.`);

  const { error: updateError } = await service.auth.admin.updateUserById(existing.id, {
    password,
    email_confirm: true,
    user_metadata: { dev_fixture: true }
  });
  if (updateError) throw new Error(updateError.message);

  return existing.id;
}

export default async function RunDevFixturesPage({
  params,
  searchParams
}: {
  params: { locale: Locale };
  searchParams: { staffEmail?: string; staffPassword?: string; managerEmail?: string; managerPassword?: string };
}) {
  const { user, role } = await requireAdmin(params.locale);

  if (!(process.env.NEXT_PUBLIC_SITE_URL ?? "").startsWith("http://localhost") || role !== "super_admin") {
    return (
      <main>
        <Section>
          <p>Development fixtures are available only to a local Super Admin.</p>
        </Section>
      </main>
    );
  }

  const staffEmail = searchParams.staffEmail?.trim().toLowerCase();
  const managerEmail = searchParams.managerEmail?.trim().toLowerCase();
  const staffPassword = searchParams.staffPassword;
  const managerPassword = searchParams.managerPassword;
  let result = "Missing fixture query parameters.";

  if (staffEmail && managerEmail && staffPassword && managerPassword) {
    try {
      const service = createServiceClient();
      const supabase = createClient();
      const [{ data: brand }, { data: store }] = await Promise.all([
        service.from("brands").select("id").eq("brand_code", "QYJ").single(),
        service.from("stores").select("id").eq("store_code", "QYJ-MPM-001").single()
      ]);

      if (!brand || !store) throw new Error("QYJ brand or MacPherson store not found.");

      const [staffAuthId, managerAuthId] = await Promise.all([
        upsertAuthUser(staffEmail, staffPassword),
        upsertAuthUser(managerEmail, managerPassword)
      ]);

      const [{ data: staffUser, error: staffError }, { data: managerUser, error: managerError }] = await Promise.all([
        service
          .from("staff_users")
          .upsert(
            {
              auth_user_id: staffAuthId,
              staff_no: "QYJDEVSTAFF001",
              full_name: "QYJ Development Staff",
              email_raw: staffEmail,
              updated_by: user.id
            },
            { onConflict: "auth_user_id" }
          )
          .select("id")
          .single(),
        service
          .from("staff_users")
          .upsert(
            {
              auth_user_id: managerAuthId,
              staff_no: "QYJDEVMANAGER001",
              full_name: "QYJ Development Manager",
              email_raw: managerEmail,
              updated_by: user.id
            },
            { onConflict: "auth_user_id" }
          )
          .select("id")
          .single()
      ]);

      if (staffError || !staffUser) throw new Error(staffError?.message ?? "Unable to create staff fixture.");
      if (managerError || !managerUser) throw new Error(managerError?.message ?? "Unable to create manager fixture.");

      const [staffAssignment, managerAssignment] = await Promise.all([
        supabase.rpc("assign_staff_role", {
          target_staff_user_id: staffUser.id,
          target_role_code: "staff",
          scope_type_value: "store",
          company_id_value: null,
          brand_id_value: null,
          store_id_value: store.id,
          idempotency_key_value: `dev-staff-${randomUUID()}`
        }),
        supabase.rpc("assign_staff_role", {
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

      result = "Development staff and manager fixtures are ready.";
    } catch (error) {
      result = error instanceof Error ? error.message : "Unable to create fixtures.";
    }
  }

  return (
    <main>
      <Section>
        <div className="mx-auto max-w-3xl">
          <p className="text-sm font-bold text-gold">Local Verification</p>
          <h1 className="mt-3 font-serif text-5xl font-semibold">Fixture Result</h1>
          <p className="mt-6 bg-white p-6 font-semibold shadow-soft">{result}</p>
        </div>
      </Section>
    </main>
  );
}
