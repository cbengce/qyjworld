import { BRAND, Locale } from "@/lib/constants";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { localizedPath } from "@/lib/i18n/routing";
import { AscendCommunityCard } from "@/components/community/ascend-community-card";
import { ButtonLink, Section } from "@/components/ui";

export default function MembershipPage({ params }: { params: { locale: Locale } }) {
  const t = getDictionary(params.locale);
  return (
    <main className="overflow-hidden">
      <Section>
        <div className="mx-auto grid min-w-0 max-w-7xl gap-10 md:grid-cols-[1fr_0.8fr]">
          <div className="min-w-0">
            <p className="text-sm font-bold text-gold">{BRAND.line}</p>
            <h1 className="mt-3 break-words font-serif text-6xl font-semibold">{t.membership.title}</h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-forest/70">{t.membership.activation}</p>
            <ButtonLink className="mt-8 bg-forest text-white" href={localizedPath(params.locale, "/register")}>
              {t.common.joinMembership}
            </ButtonLink>
          </div>
          <aside className="min-w-0 bg-white p-8 shadow-soft">
            <p className="text-sm font-bold text-gold">{t.membership.fee}</p>
            <p className="mt-2 font-serif text-5xl font-semibold">{BRAND.membershipFee}</p>
            <p className="mt-4 text-forest/70">{t.membership.duration}</p>
            <ul className="mt-8 grid gap-3">
              {t.membership.benefits.map((benefit) => (
                <li key={benefit} className="border-t border-forest/10 pt-3 font-semibold">
                  {benefit}
                </li>
              ))}
            </ul>
          </aside>
        </div>
      </Section>
      <AscendCommunityCard compact />
    </main>
  );
}
