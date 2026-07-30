import { BRAND } from "@/lib/constants";
import { Section } from "@/components/ui";

export default function TermsPage() {
  return (
    <main>
      <Section>
        <div className="mx-auto max-w-4xl">
          <p className="text-sm font-bold text-gold">For legal review</p>
          <h1 className="mt-3 font-serif text-6xl font-semibold">Membership Terms and Conditions</h1>
          <div className="mt-8 grid gap-5 text-lg leading-8 text-forest/75">
            <p>Membership fee: {BRAND.membershipFee}. Membership duration: {BRAND.membershipDays} days from activation.</p>
            <p>
              Registration does not automatically activate membership. During soft launch, payment confirmation and
              activation are performed by an authorised administrator.
            </p>
            <p>
              Points, referral rewards, renewals and adjustments are subject to verification by Qing Yun Jian staff.
              This draft must be reviewed before public launch.
            </p>
          </div>
        </div>
      </Section>
    </main>
  );
}
