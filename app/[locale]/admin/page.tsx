import Link from "next/link";
import { activateMembership } from "@/app/actions";
import { PointsForm } from "@/components/admin/points-form";
import { Locale } from "@/lib/constants";
import { requireAdmin } from "@/lib/data";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { createClient } from "@/lib/supabase/server";
import { Section } from "@/components/ui";

export default async function AdminPage({
  params,
  searchParams
}: {
  params: { locale: Locale };
  searchParams: { q?: string };
}) {
  const t = getDictionary(params.locale);
  const { role } = await requireAdmin(params.locale);
  const canManageMembership = role === "super_admin" || role === "manager";
  const canExport = canManageMembership;
  const supabase = createClient();
  const query = searchParams.q?.trim() ?? "";
  const { data: qyjBrand } = await supabase.from("brands").select("id").eq("brand_code", "QYJ").single();

  const { data: members } = query
    ? await supabase
        .from("customers")
        .select("id, customer_no, primary_mobile_normalized, primary_email_normalized, created_at, customer_profiles(full_name), customer_memberships(id, brand_id, status, starts_at, expires_at, membership_no), points_accounts(id, brand_id, account_no)")
        .or(`customer_no.ilike.%${query}%,primary_mobile_raw.ilike.%${query}%,primary_email_raw.ilike.%${query}%`)
        .limit(25)
    : await supabase
        .from("customers")
        .select("id, customer_no, primary_mobile_normalized, primary_email_normalized, created_at, customer_profiles(full_name), customer_memberships(id, brand_id, status, starts_at, expires_at, membership_no), points_accounts(id, brand_id, account_no)")
        .order("created_at", { ascending: false })
        .limit(10);

  const [{ count: memberCount }, { count: pendingCount }] = await Promise.all([
    supabase.from("customers").select("id", { count: "exact", head: true }),
    supabase.from("customer_memberships").select("id", { count: "exact", head: true }).eq("status", "pending")
  ]);

  return (
    <main>
      <Section>
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <p className="text-sm font-bold text-gold">Role: {role}</p>
              <h1 className="mt-3 font-serif text-6xl font-semibold">{t.admin.title}</h1>
            </div>
            {canExport ? (
              <div className="flex flex-wrap gap-2">
                <Link className="focus-ring rounded-full bg-forest px-5 py-3 text-sm font-bold text-white shadow-[0_16px_42px_rgba(18,60,47,0.14)] transition duration-300 hover:-translate-y-0.5 hover:bg-ink" href="/api/admin/export/members">
                  {t.admin.exportMembers}
                </Link>
                <Link className="focus-ring rounded-full bg-gold px-5 py-3 text-sm font-bold text-ink shadow-[0_16px_42px_rgba(200,148,66,0.16)] transition duration-300 hover:-translate-y-0.5 hover:bg-[#d6a85f]" href="/api/admin/export/points">
                  {t.admin.exportPoints}
                </Link>
              </div>
            ) : null}
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <div className="bg-white p-5 shadow-soft">
              <p className="text-sm font-bold text-gold">Members</p>
              <p className="mt-2 text-4xl font-bold">{memberCount ?? 0}</p>
            </div>
            <div className="bg-white p-5 shadow-soft">
              <p className="text-sm font-bold text-gold">Pending memberships</p>
              <p className="mt-2 text-4xl font-bold">{pendingCount ?? 0}</p>
            </div>
            <div className="bg-white p-5 shadow-soft">
              <p className="text-sm font-bold text-gold">Exports</p>
              <p className="mt-2 text-forest/70">CSV routes are protected by admin role checks.</p>
            </div>
            <div className="bg-white p-5 shadow-soft">
              <p className="text-sm font-bold text-gold">Campaigns</p>
              <div className="mt-3 grid gap-2 text-sm font-bold text-forest">
                <Link className="transition duration-300 hover:text-gold" href={`/${params.locale}/admin/promotions`}>
                  Manage Promotions
                </Link>
                <Link className="transition duration-300 hover:text-gold" href={`/${params.locale}/admin/leaderboard`}>
                  Manage Leaderboard
                </Link>
              </div>
            </div>
          </div>

          <form className="mt-8 flex flex-col gap-3 bg-white p-5 shadow-soft sm:flex-row">
            <input
              className="focus-ring min-h-12 flex-1 rounded-sm border border-forest/15 bg-white px-4 text-base text-forest transition duration-200 placeholder:text-forest/35 hover:border-forest/30"
              defaultValue={query}
              name="q"
              placeholder={t.admin.search}
            />
            <button className="focus-ring min-h-12 rounded-full bg-forest px-6 text-sm font-bold text-white shadow-[0_16px_42px_rgba(18,60,47,0.16)] transition duration-300 hover:-translate-y-0.5 hover:bg-ink" type="submit">
              Search
            </button>
          </form>

          <div className="mt-8 grid gap-5">
            {(members ?? []).map((member) => {
              const profile = Array.isArray(member.customer_profiles) ? member.customer_profiles[0] : member.customer_profiles;
              const membership = Array.isArray(member.customer_memberships) ? member.customer_memberships[0] : member.customer_memberships;
              const pointsAccount = Array.isArray(member.points_accounts) ? member.points_accounts[0] : member.points_accounts;
              return (
                <article key={member.id} className="bg-white p-6 shadow-soft">
                  <div className="grid gap-4 md:grid-cols-[1fr_auto]">
                    <div>
                      <h2 className="font-serif text-3xl font-semibold">{profile?.full_name ?? "Unnamed member"}</h2>
                      <p className="mt-2 text-sm text-forest/70">
                        {member.primary_mobile_normalized} · {member.primary_email_normalized} · {member.customer_no}
                      </p>
                      <p className="mt-2 text-sm font-bold text-gold">
                        Status: {membership?.status ?? "pending"} · Expiry: {membership?.expires_at ?? "-"}
                      </p>
                    </div>
                    {canManageMembership ? (
                      <form action={activateMembership}>
                        <input name="customerId" type="hidden" value={member.id} />
                        <input name="brandId" type="hidden" value={membership?.brand_id ?? qyjBrand?.id ?? ""} />
                        <input name="referenceNo" type="hidden" value="manual-soft-launch" />
                        <button className="focus-ring min-h-12 rounded-full bg-gold px-6 text-sm font-bold text-ink shadow-[0_16px_42px_rgba(200,148,66,0.18)] transition duration-300 hover:-translate-y-0.5 hover:bg-[#d6a85f]" type="submit">
                          {t.admin.activate}
                        </button>
                      </form>
                    ) : null}
                  </div>
                  {pointsAccount?.id ? <PointsForm pointsAccountId={pointsAccount.id} /> : null}
                </article>
              );
            })}
          </div>
        </div>
      </Section>
    </main>
  );
}
