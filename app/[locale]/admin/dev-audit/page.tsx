import { Locale } from "@/lib/constants";
import { requireAdmin } from "@/lib/data";
import { createServiceClient } from "@/lib/supabase/admin";
import { Section } from "@/components/ui";

export default async function DevAuditPage({ params }: { params: { locale: Locale } }) {
  const { role } = await requireAdmin(params.locale);

  if (!(process.env.NEXT_PUBLIC_SITE_URL ?? "").startsWith("http://localhost") || role !== "super_admin") {
    return (
      <main>
        <Section>
          <p>Development audit verification is available only to a local Super Admin.</p>
        </Section>
      </main>
    );
  }

  const supabase = createServiceClient();
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

  return (
    <main>
      <Section>
        <div className="mx-auto max-w-5xl">
          <p className="text-sm font-bold text-gold">Local Verification</p>
          <h1 className="mt-3 font-serif text-5xl font-semibold">Audit Verification</h1>
          {auditError || roleError ? (
            <p className="mt-6 bg-white p-6 font-semibold text-red-700 shadow-soft">{auditError?.message ?? roleError?.message}</p>
          ) : (
            <div className="mt-8 grid gap-6">
              <section className="bg-white p-6 shadow-soft">
                <h2 className="font-serif text-3xl font-semibold">Recent Audit Logs</h2>
                <ul className="mt-4 grid gap-3">
                  {(auditLogs ?? []).map((log) => (
                    <li className="border border-forest/10 p-3" key={`${log.action}-${log.idempotency_key}-${log.created_at}`}>
                      {log.action} | {log.entity_type} | {log.idempotency_key ?? "-"} | {log.created_at}
                    </li>
                  ))}
                </ul>
              </section>
              <section className="bg-white p-6 shadow-soft">
                <h2 className="font-serif text-3xl font-semibold">Recent Role Assignments</h2>
                <ul className="mt-4 grid gap-3">
                  {(roleAssignments ?? []).map((assignment, index) => {
                    const roleRecord = Array.isArray(assignment.roles) ? assignment.roles[0] : assignment.roles;
                    const staffRecord = Array.isArray(assignment.staff_users) ? assignment.staff_users[0] : assignment.staff_users;
                    return (
                      <li className="border border-forest/10 p-3" key={`${staffRecord?.staff_no}-${roleRecord?.role_code}-${index}`}>
                        {staffRecord?.staff_no ?? "-"} | {staffRecord?.email_normalized ?? "-"} | {roleRecord?.role_code ?? "-"} | {assignment.scope_type}
                      </li>
                    );
                  })}
                </ul>
              </section>
            </div>
          )}
        </div>
      </Section>
    </main>
  );
}
