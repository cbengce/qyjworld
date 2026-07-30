import { BRAND, Locale } from "@/lib/constants";
import { getMemberDashboard, requireUser } from "@/lib/data";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { createReferralLink, formatStatus } from "@/lib/membership";
import { logoutMember } from "@/app/actions";
import { QrCode } from "@/components/member/qr-code";
import { Section } from "@/components/ui";

export default async function MemberPage({ params }: { params: { locale: Locale } }) {
  const t = getDictionary(params.locale);
  const user = await requireUser(params.locale);
  const dashboard = await getMemberDashboard(user.id);
  const profile = dashboard.profile;
  const referralCode = dashboard.referralCode?.code ?? "Pending";
  const referralLink = dashboard.referralCode?.referral_url ?? createReferralLink(process.env.NEXT_PUBLIC_SITE_URL ?? BRAND.domain, referralCode);
  const expired = dashboard.membership?.status === "expired";

  return (
    <main>
      <Section>
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <p className="text-sm font-bold text-gold">{dashboard.customer?.primary_mobile_normalized ?? "Member"}</p>
              <h1 className="mt-3 font-serif text-6xl font-semibold">{t.dashboard.title}</h1>
              <p className="mt-3 text-xl font-semibold">{profile?.full_name ?? user.email}</p>
            </div>
            <form action={logoutMember}>
              <button className="focus-ring min-h-12 rounded-full bg-forest px-6 text-sm font-bold text-white shadow-[0_16px_42px_rgba(18,60,47,0.16)] transition duration-300 hover:-translate-y-0.5 hover:bg-ink" type="submit">
                {t.common.logout}
              </button>
            </form>
          </div>
          {expired ? <p className="mt-6 bg-red-50 p-4 font-semibold text-red-800">{t.dashboard.expired}</p> : null}
          <div className="mt-8 grid gap-4 md:grid-cols-4">
            {[
              [t.dashboard.status, formatStatus(dashboard.membership?.status)],
              [t.dashboard.start, dashboard.membership?.starts_at ?? "-"],
              [t.dashboard.expiry, dashboard.membership?.expires_at ?? "-"],
              [t.dashboard.days, String(dashboard.daysRemaining)],
              [t.dashboard.points, String(dashboard.pointsBalance)],
              [t.dashboard.memberNo, dashboard.membership?.membership_no ?? dashboard.customer?.customer_no ?? "-"]
            ].map(([label, value]) => (
              <div key={label} className="bg-white p-5 shadow-soft transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_30px_80px_rgba(10,24,20,0.16)]">
                <p className="text-sm font-bold text-gold">{label}</p>
                <p className="mt-3 text-2xl font-semibold">{value}</p>
              </div>
            ))}
            <div className="bg-white p-5 shadow-soft transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_30px_80px_rgba(10,24,20,0.16)] md:col-span-2">
              <p className="text-sm font-bold text-gold">QR / Referral</p>
              <div className="mt-4 flex flex-col gap-4 sm:flex-row">
                <QrCode value={referralLink} />
                <div>
                  <p className="font-bold">{referralCode}</p>
                  <p className="mt-2 break-all text-sm text-forest/70">{referralLink}</p>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-8 grid gap-6 md:grid-cols-2">
            <section className="bg-white p-6 shadow-[0_20px_55px_rgba(10,24,20,0.07)]">
              <h2 className="font-serif text-3xl font-semibold">{t.dashboard.transactions}</h2>
              <div className="mt-4 grid gap-3">
                {dashboard.transactions.length ? dashboard.transactions.map((tx) => (
                  <div key={tx.id} className="border-t border-forest/10 pt-3 text-sm">
                    <p className="font-bold">{tx.transaction_type}: {tx.points_delta}</p>
                    <p className="text-forest/70">{tx.description}</p>
                  </div>
                )) : <p className="text-forest/70">No transactions yet.</p>}
              </div>
            </section>
            <section className="bg-white p-6 shadow-[0_20px_55px_rgba(10,24,20,0.07)]">
              <h2 className="font-serif text-3xl font-semibold">{t.dashboard.activity}</h2>
              <div className="mt-4 grid gap-3">
                {dashboard.activity.length ? dashboard.activity.map((item) => (
                  <div key={item.id} className="border-t border-forest/10 pt-3 text-sm">
                    <p className="font-bold">{item.event_type}</p>
                    <p className="text-forest/70">{item.created_at}</p>
                  </div>
                )) : <p className="text-forest/70">No membership activity yet.</p>}
              </div>
            </section>
          </div>
        </div>
      </Section>
    </main>
  );
}
